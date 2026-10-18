const express = require('express');
const crypto = require('crypto');
const path = require('path');
const { pool: pgPool, q, q1, init } = require('./db');
const ai = require('./ai');
const ACCOUNTS = require('./accounts');

const app = express();
app.use((req, res, next) => express.json({ limit: req.path === '/api/import' ? '8mb' : '50kb' })(req, res, next));
app.use(express.static(path.join(__dirname, 'public')));

// ---------------- tuning knobs ----------------
const VERIFY_AT = 1_000_000;
const START_FOLLOWERS = 12;
const LIKE_FOLLOW_RATE = 0.2;       // followers gained per like on your posts
const VIRAL_CHANCE = 0.08;
const tauFor = kind => ({ celeb: 1800, commentary: 1200, news: 900, user: 400, npc: 700 }[kind] || 900);
const rnd = (a, b) => a + Math.random() * (b - a);
const randn = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
const pick = a => a[Math.floor(Math.random() * a.length)];
const LIKES_NOW = `(p.likes_target * (1 - exp(-extract(epoch from (now() - p.created_at)) / p.tau)))`;

// ---------------- helpers ----------------
const A_COLS = `a.id, a.handle, a.name, a.bio, a.followers, a.following, a.verified, a.kind, a.pfp, a.created_at`;
const pubAcct = a => ({ id: a.id, handle: a.handle, name: a.name, bio: a.bio, followers: Number(a.followers), following: a.following, verified: a.verified, kind: a.kind, pfp: a.pfp, joined: a.created_at });

async function auth(req, res, next) {
  const t = req.get('x-token');
  const u = t && await q1('SELECT * FROM accounts WHERE token=$1', [t]);
  if (!u) return res.status(401).json({ error: 'auth' });
  req.user = u; next();
}
const wrap = f => (req, res) => f(req, res).catch(e => { console.error(e); res.status(500).json({ error: 'server' }); });

async function userFollowers(u) {
  const r = await q1(`SELECT COALESCE(floor(sum(${LIKES_NOW})),0) AS l FROM posts p WHERE p.author_id=$1 AND NOT p.imported`, [u.id]);
  const f = START_FOLLOWERS + Number(u.bonus_followers) + Math.floor(Number(r.l) * LIKE_FOLLOW_RATE);
  const verified = f >= VERIFY_AT ? 'blue' : 'none';
  if (f !== Number(u.followers) || verified !== u.verified) await q('UPDATE accounts SET followers=$2, verified=$3 WHERE id=$1', [u.id, f, verified]);
  if (verified !== u.verified && verified === 'blue') await q(`INSERT INTO notifs(user_id,type,text) VALUES($1,'verified','Congratulations! You reached 1,000,000 followers and are now verified.')`, [u.id]);
  u.followers = f; u.verified = verified;
  return f;
}

const POST_SELECT = (uid) => `
  SELECT p.id, p.text, p.created_at, p.likes_target, p.reposts_target, p.replies_target, p.views_target, p.tau, p.parent_id, p.quote_of, p.viral,
    (SELECT count(*) FROM posts c WHERE c.parent_id=p.id AND c.created_at<=now()) AS real_replies,
    ${uid ? `EXISTS(SELECT 1 FROM likes l WHERE l.post_id=p.id AND l.user_id=${Number(uid)}) AS liked,
    EXISTS(SELECT 1 FROM reposts r WHERE r.post_id=p.id AND r.user_id=${Number(uid)}) AS reposted,` : 'false AS liked, false AS reposted,'}
    ${A_COLS}
  FROM posts p JOIN accounts a ON a.id=p.author_id`;
// the SELECT returns both p.id and a.id as "id"; alias safely instead:
const POSTS_SQL = (uid) => POST_SELECT(uid).replace('SELECT p.id,', 'SELECT p.id AS pid, p.author_id,').replace(A_COLS, A_COLS.replace('a.id,', ''));
function shape(r, uid) {
  return {
    id: r.pid, text: r.text, created: new Date(r.created_at).getTime(), tau: r.tau, parent_id: r.parent_id, quote_of: r.quote_of, viral: r.viral,
    likes_t: Number(r.likes_target), reposts_t: Number(r.reposts_target), replies_t: Number(r.replies_target), views_t: Number(r.views_target),
    real_replies: Number(r.real_replies), liked: r.liked, reposted: r.reposted, mine: r.author_id === uid,
    author: { id: r.author_id, handle: r.handle, name: r.name, bio: r.bio, followers: Number(r.followers), verified: r.verified, kind: r.kind, pfp: r.pfp },
  };
}
async function loadPosts(where, params, uid, tail = '') {
  const rows = await q(`${POSTS_SQL(uid)} WHERE ${where} ${tail}`, params);
  const posts = rows.map(r => shape(r, uid));
  const qids = [...new Set(posts.map(p => p.quote_of).filter(Boolean))];
  if (qids.length) {
    const qr = await q(`${POSTS_SQL(uid)} WHERE p.id = ANY($1)`, [qids]);
    const m = Object.fromEntries(qr.map(r => [r.pid, shape(r, uid)]));
    posts.forEach(p => { if (p.quote_of) p.quoted = m[p.quote_of] || null; });
  }
  return posts;
}

// engagement targets for AI posts
function targetsFor(acct, f = Number(acct.followers)) {
  const mult = { celeb: 1, commentary: 0.5, news: 0.25, npc: 0.1 }[acct.kind] || 0.3;
  const likes = Math.max(5, Math.round(f * rnd(0.004, 0.035) * mult * Math.exp(randn() * 0.5)));
  return { likes, reposts: Math.round(likes * rnd(0.08, 0.2)), replies: Math.round(likes * rnd(0.03, 0.08)), views: Math.round(likes * rnd(12, 30)) };
}

async function ensureAccount(h) {
  let handle = String(h.handle).replace(/[^A-Za-z0-9_]/g, '').slice(0, 15) || 'user' + Math.floor(Math.random() * 99999);
  for (let i = 0; i < 6; i++) {
    const row = await q1(`INSERT INTO accounts(handle,name,bio,followers,following,kind,verified)
      VALUES($1,$2,$3,$4,$5,'npc','none') ON CONFLICT (handle) DO NOTHING RETURNING id`,
      [handle, String(h.name || handle).slice(0, 30), String(h.bio || '').slice(0, 120), Math.floor(Math.exp(rnd(3, 9))), Math.floor(rnd(30, 2000))]);
    if (row) return row.id;
    const ex = await q1('SELECT id, kind FROM accounts WHERE lower(handle)=lower($1)', [handle]);
    if (ex && ex.kind === 'npc' && i === 0 && Math.random() < 0.3) return ex.id; // sometimes a returning commenter
    handle = (handle.slice(0, 12) + Math.floor(Math.random() * 999));
  }
  return null;
}

// insert generated replies under a post; each gets an engagement target scaled from the parent's.
async function insertReplies(parent, items, { delaySpread = 0, startAgeSec = 0 } = {}) {
  const ids = [];
  let rank = 0;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const aid = await ensureAccount(it);
    if (!aid) { ids.push(null); continue; }
    const base = Number(parent.likes_target);
    const decay = Math.exp(-rank * 0.18);
    const likes = Math.max(0, Math.round(base * rnd(0.004, 0.03) * decay * Math.exp(randn() * 0.8)));
    rank++;
    const ageOffset = delaySpread ? -rnd(0, delaySpread) : rnd(0, Math.max(1, startAgeSec));
    const created = new Date(Date.now() - ageOffset * 1000);
    const parentId = it.parent != null && ids[it.parent] ? ids[it.parent] : parent.id;
    const row = await q1(`INSERT INTO posts(author_id,text,created_at,likes_target,reposts_target,replies_target,views_target,tau,parent_id)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [aid, String(it.text).slice(0, 280), created, likes, Math.round(likes * 0.03), parentId === parent.id ? Math.round(likes * 0.05) : 0, likes * 15, rnd(300, 900) | 0, parentId]);
    ids.push(row.id);
  }
  return ids;
}
// future-dated version: replies "arrive" over the next seconds/minutes
async function insertFutureReplies(parent, items, maxDelaySec) {
  const aids = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const aid = await ensureAccount(it);
    aids.push(aid);
    if (!aid) continue;
    const t = new Date(Date.now() + rnd(4, maxDelaySec) * 1000);
    const likes = Math.round(Number(parent.likes_target) * rnd(0.003, 0.02) * Math.exp(randn() * 0.7));
    const row = await q1(`INSERT INTO posts(author_id,text,created_at,likes_target,views_target,tau,parent_id) VALUES($1,$2,$3,$4,$5,600,$6) RETURNING id`,
      [aid, String(it.text).slice(0, 280), t, likes, likes * 12, parent.id]);
    await q(`INSERT INTO notifs(user_id,type,actor_id,post_id,text,created_at) VALUES($1,'reply',$2,$3,$4,$5)`, [parent.author_id, aid, row.id, it.text, t]);
  }
}

// ---------------- auth/user ----------------
app.post('/api/signup', wrap(async (req, res) => {
  let { name, handle, pfp, bio, followers } = req.body;
  name = String(name || '').trim().slice(0, 30);
  handle = String(handle || '').replace(/^@/, '').replace(/[^A-Za-z0-9_]/g, '').slice(0, 15);
  if (!name || handle.length < 1) return res.status(400).json({ error: 'Name and a handle are required' });
  pfp = typeof pfp === 'string' && /^https:\/\/[\w.-]+\//.test(pfp) ? pfp.slice(0, 300) : null;
  bio = String(bio || '').slice(0, 160);
  const fol = Math.max(0, Math.min(1e9, Math.floor(Number(followers) || 0)));
  const token = crypto.randomBytes(24).toString('hex');
  const row = await q1(`INSERT INTO accounts(handle,name,bio,kind,followers,following,token,voice,pfp,bonus_followers) VALUES($1,$2,$3,'user',$4,0,$5,'',$6,$7) ON CONFLICT (handle) DO NOTHING RETURNING *`,
    [handle, name, bio, START_FOLLOWERS + Math.max(0, fol - START_FOLLOWERS), token, pfp, Math.max(0, fol - START_FOLLOWERS)]);
  if (!row) return res.status(409).json({ error: `@${handle} is already taken on Z (built-in accounts and other players can't be reused)` });
  res.json({ token, user: pubAcct(row) });
}));

app.get('/api/me', auth, wrap(async (req, res) => {
  await userFollowers(req.user);
  const fc = await q1('SELECT count(*) c FROM follows WHERE user_id=$1', [req.user.id]);
  res.json({ ...pubAcct(req.user), following: Number(fc.c), verify_at: VERIFY_AT });
}));

// ---------------- feed ----------------
app.get('/api/feed', auth, wrap(async (req, res) => {
  const before = req.query.before ? new Date(Number(req.query.before)) : new Date();
  const tab = req.query.tab === 'following' ? 'following' : 'foryou';
  const where = tab === 'following'
    ? `p.parent_id IS NULL AND p.created_at < $1 AND p.created_at <= now() AND (p.author_id=$2 OR p.author_id IN (SELECT account_id FROM follows WHERE user_id=$2))`
    : `p.parent_id IS NULL AND p.created_at < $1 AND p.created_at <= now()`;
  const posts = await loadPosts(where, tab === 'following' ? [before, req.user.id] : [before], req.user.id, 'ORDER BY p.created_at DESC LIMIT 25');
  res.json(posts);
}));

app.get('/api/post/:id', auth, wrap(async (req, res) => {
  const id = Number(req.params.id);
  const [post] = await loadPosts('p.id=$1 AND p.created_at<=now()', [id], req.user.id);
  if (!post) return res.status(404).json({ error: 'nf' });
  const ancestors = [];
  let cur = post;
  while (cur.parent_id && ancestors.length < 5) {
    const [pp] = await loadPosts('p.id=$1', [cur.parent_id], req.user.id);
    if (!pp) break; ancestors.unshift(pp); cur = pp;
  }
  res.json({ post, ancestors });
}));

const genLocks = new Set();
// Replies are generated lazily the first time someone opens a post (and again for "show more").
app.get('/api/post/:id/replies', auth, wrap(async (req, res) => {
  const id = Number(req.params.id);
  const more = req.query.more === '1';
  const p = await q1(`SELECT p.*, a.handle, a.name, a.profile, a.kind AS akind FROM posts p JOIN accounts a ON a.id=p.author_id WHERE p.id=$1`, [id]);
  if (!p) return res.status(404).json({ error: 'nf' });
  const isUserPost = p.author_id === req.user.id;
  const need = (p.replies_gen === 0 && (!isUserPost || p.imported)) || (more && p.replies_gen < 4);
  if (need && !genLocks.has(id)) {
    genLocks.add(id);
    try {
      const existing = await q(`SELECT text FROM posts WHERE parent_id=$1 ORDER BY created_at DESC LIMIT 6`, [id]);
      const n = p.replies_gen === 0 ? 10 : 8;
      const items = await ai.genReplies({ authorHandle: p.handle, authorName: p.name, text: p.text, n, existing: existing.map(e => e.text), about: p.akind === 'user' ? p.profile : null });
      await insertReplies(p, items, { startAgeSec: Math.min(900, (Date.now() - new Date(p.created_at)) / 1000) });
      await q('UPDATE posts SET replies_gen=replies_gen+1 WHERE id=$1', [id]);
    } finally { genLocks.delete(id); }
  } else if (genLocks.has(id)) {
    await new Promise(r => setTimeout(r, 1500));
  }
  const top = await loadPosts(`p.parent_id=$1 AND p.created_at<=now()`, [id], req.user.id, 'ORDER BY p.likes_target DESC, p.created_at DESC LIMIT 60');
  // attach one level of nested replies under each
  const ids = top.map(t => t.id);
  const kids = ids.length ? await loadPosts(`p.parent_id = ANY($1) AND p.created_at<=now()`, [ids], req.user.id, 'ORDER BY p.created_at ASC') : [];
  top.forEach(t => { t.children = kids.filter(k => k.parent_id === t.id); });
  res.json({ replies: top, can_more: p.replies_gen < 4 });
}));

// ---------------- posting ----------------
app.post('/api/post', auth, wrap(async (req, res) => {
  const u = req.user;
  const text = String(req.body.text || '').trim().slice(0, 280);
  const parent_id = req.body.parent_id ? Number(req.body.parent_id) : null;
  const quote_of = req.body.quote_of ? Number(req.body.quote_of) : null;
  if (!text) return res.status(400).json({ error: 'empty' });
  const fame = await userFollowers(u);
  const recent = await q1(`SELECT count(*) c FROM posts WHERE author_id=$1 AND created_at > now() - interval '10 minutes'`, [u.id]);
  const spam = Number(recent.c) > 5 ? 0.25 : 1;
  const parent = parent_id ? await q1(`SELECT p.*, a.handle, a.name, a.followers, a.kind, a.voice, a.rpd, a.topics FROM posts p JOIN accounts a ON a.id=p.author_id WHERE p.id=$1`, [parent_id]) : null;

  const viral = Math.random() < VIRAL_CHANCE * spam;
  const scale = parent ? 0.025 : 0.05;
  let likes = Math.max(2, fame * scale) * Math.exp(randn() * 0.6) * spam;
  if (viral) likes *= rnd(20, 250);
  likes = Math.round(likes);
  const row = await q1(`INSERT INTO posts(author_id,text,likes_target,reposts_target,replies_target,views_target,tau,parent_id,quote_of,viral)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [u.id, text, likes, Math.round(likes * rnd(0.05, 0.2)), Math.round(likes * 0.05), Math.round(likes * rnd(12, 30)), 400, parent_id, quote_of, viral]);
  const events = [];

  // NPC reactions arrive over the next couple of minutes
  const nReact = Math.min(6, 1 + Math.round(Math.log10(fame + 10)));
  ai.genUserReplies({ userName: u.name, userHandle: u.handle, text, ctx: parent ? `in reply to @${parent.handle}` : '', n: nReact, profile: u.profile })
    .then(items => insertFutureReplies(row, items, 150)).catch(e => console.error(e));

  // a famous account might notice a comment on its post
  if (parent && parent.kind !== 'npc' && parent.kind !== 'user') {
    const ratio = fame / Math.max(1, Number(parent.followers));
    const p = Math.min(0.6, (0.02 + 0.6 * Math.sqrt(ratio)) * (0.4 + Number(parent.rpd ?? 1) / 8));
    if (Math.random() < p) {
      const acct = withPersona({ name: parent.name, handle: parent.handle, voice: parent.voice, kind: parent.kind });
      ai.genCelebReply(acct, { postText: parent.text, userText: text, userName: u.name, fame, profile: u.profile }).then(async reply => {
        const delay = rnd(8, 40);
        const t = new Date(Date.now() + delay * 1000);
        const gain = Math.round(Math.min(Number(parent.followers) * 0.002, 400000) * rnd(0.3, 1.5)) + 50;
        const boost = Math.round(Number(parent.followers) * rnd(0.0005, 0.004));
        await q('UPDATE posts SET likes_target=likes_target+$2, viral=true WHERE id=$1', [row.id, boost]);
        await q('UPDATE accounts SET bonus_followers=bonus_followers+$2 WHERE id=$1', [u.id, gain]);
        const r2 = await q1(`INSERT INTO posts(author_id,text,created_at,likes_target,views_target,tau,parent_id) VALUES($1,$2,$3,$4,$5,900,$6) RETURNING id`,
          [parent.author_id, reply, t, Math.round(boost * 0.6), boost * 8, row.id]);
        await q(`INSERT INTO notifs(user_id,type,actor_id,post_id,text,created_at) VALUES($1,'celeb_reply',$2,$3,$4,$5)`, [u.id, parent.author_id, r2.id, reply, t]);
      }).catch(e => console.error(e));
      events.push('noticed');
    }
  } else if (!parent && viral && fame > 30) {
    // a viral post can get picked up by a commentary account
    const c = await q1(`SELECT * FROM accounts WHERE kind IN ('commentary','news') ORDER BY random() LIMIT 1`);
    if (c) {
      const t = new Date(Date.now() + rnd(20, 90) * 1000);
      const gain = Math.round(Number(c.followers) * rnd(0.0003, 0.002));
      await q('UPDATE accounts SET bonus_followers=bonus_followers+$2 WHERE id=$1', [u.id, gain]);
      const txt = `${u.name} (@${u.handle}) is going viral right now: "${text.slice(0, 120)}" 👀`;
      const r2 = await q1(`INSERT INTO posts(author_id,text,created_at,likes_target,reposts_target,replies_target,views_target,tau,quote_of) VALUES($1,$2,$3,$4,$5,$6,$7,1200,$8) RETURNING id`,
        [c.id, txt, t, Math.round(c.followers * 0.01), 500, 200, Math.round(c.followers * 0.2), row.id]);
      await q(`INSERT INTO notifs(user_id,type,actor_id,post_id,text,created_at) VALUES($1,'quote',$2,$3,$4,$5)`, [u.id, c.id, r2.id, txt, t]);
      events.push('viral');
    }
  }
  if (viral) events.push('viral');
  const [post] = await loadPosts('p.id=$1', [row.id], u.id);
  res.json({ post, events });
}));

app.post('/api/like/:id', auth, wrap(async (req, res) => {
  const id = Number(req.params.id);
  const had = await q1('DELETE FROM likes WHERE user_id=$1 AND post_id=$2 RETURNING 1', [req.user.id, id]);
  if (!had) await q('INSERT INTO likes VALUES($1,$2) ON CONFLICT DO NOTHING', [req.user.id, id]);
  res.json({ liked: !had });
}));
app.post('/api/repost/:id', auth, wrap(async (req, res) => {
  const id = Number(req.params.id);
  const had = await q1('DELETE FROM reposts WHERE user_id=$1 AND post_id=$2 RETURNING 1', [req.user.id, id]);
  if (!had) await q('INSERT INTO reposts VALUES($1,$2) ON CONFLICT DO NOTHING', [req.user.id, id]);
  res.json({ reposted: !had });
}));

// ---------------- profiles/follow ----------------
app.get('/api/profile/:handle', auth, wrap(async (req, res) => {
  const a = await q1('SELECT * FROM accounts WHERE lower(handle)=lower($1)', [req.params.handle]);
  if (!a) return res.status(404).json({ error: 'nf' });
  if (a.id === req.user.id) await userFollowers(a);
  const tab = req.query.tab || 'posts';
  const where = tab === 'replies' ? `p.author_id=$1 AND p.parent_id IS NOT NULL AND p.created_at<=now()`
    : tab === 'likes' ? `p.id IN (SELECT post_id FROM likes WHERE user_id=$1)` : `p.author_id=$1 AND p.parent_id IS NULL AND p.created_at<=now()`;
  const posts = await loadPosts(where, [a.id], req.user.id, 'ORDER BY p.created_at DESC LIMIT 40');
  const f = await q1('SELECT EXISTS(SELECT 1 FROM follows WHERE user_id=$1 AND account_id=$2) AS f', [req.user.id, a.id]);
  const fc = await q1('SELECT count(*) c FROM follows WHERE user_id=$1', [a.id]);
  res.json({ account: { ...pubAcct(a), following: a.kind === 'user' ? Number(fc.c) : a.following }, following: f.f, me: a.id === req.user.id, posts });
}));
app.post('/api/follow/:handle', auth, wrap(async (req, res) => {
  const a = await q1('SELECT id FROM accounts WHERE lower(handle)=lower($1)', [req.params.handle]);
  if (!a || a.id === req.user.id) return res.status(400).json({ error: 'bad' });
  const had = await q1('DELETE FROM follows WHERE user_id=$1 AND account_id=$2 RETURNING 1', [req.user.id, a.id]);
  if (!had) await q('INSERT INTO follows VALUES($1,$2)', [req.user.id, a.id]);
  res.json({ following: !had });
}));

// ---------------- explore / search ----------------
app.get('/api/explore', auth, wrap(async (req, res) => {
  const trends = (await q1(`SELECT v FROM kv WHERE k='trends'`))?.v || [];
  const suggest = await q(`SELECT ${A_COLS} FROM accounts a WHERE a.kind IN ('celeb','commentary','news') AND a.id NOT IN (SELECT account_id FROM follows WHERE user_id=$1) ORDER BY random() LIMIT 3`, [req.user.id]);
  res.json({ trends, suggest: suggest.map(pubAcct) });
}));
app.get('/api/search', auth, wrap(async (req, res) => {
  const s = String(req.query.q || '').trim();
  if (!s) return res.json({ people: [], posts: [] });
  const like = '%' + s.replace(/[%_]/g, '') + '%';
  const people = await q(`SELECT ${A_COLS} FROM accounts a WHERE (a.handle ILIKE $1 OR a.name ILIKE $1) AND a.kind<>'npc' ORDER BY a.followers DESC LIMIT 8`, [like]);
  const posts = await loadPosts(`p.text ILIKE $1 AND p.created_at<=now() AND p.parent_id IS NULL`, [like], req.user.id, 'ORDER BY p.created_at DESC LIMIT 20');
  res.json({ people: people.map(pubAcct), posts });
}));

// ---------------- notifications ----------------
app.get('/api/notifs', auth, wrap(async (req, res) => {
  const rows = await q(`SELECT n.id, n.type, n.text, n.post_id, n.created_at, n.read, a.handle, a.name, a.pfp, a.verified, a.kind
    FROM notifs n LEFT JOIN accounts a ON a.id=n.actor_id WHERE n.user_id=$1 AND n.created_at<=now() ORDER BY n.created_at DESC LIMIT 50`, [req.user.id]);
  await q('UPDATE notifs SET read=true WHERE user_id=$1 AND created_at<=now()', [req.user.id]);
  res.json(rows.map(r => ({ ...r, created: new Date(r.created_at).getTime() })));
}));

// ---------------- DMs ----------------
app.get('/api/dms', auth, wrap(async (req, res) => {
  const rows = await q(`SELECT DISTINCT ON (d.account_id) d.account_id, d.text, d.from_user, d.created_at, a.handle, a.name, a.pfp, a.verified, a.kind, a.followers,
      (SELECT count(*) FROM dms x WHERE x.user_id=d.user_id AND x.account_id=d.account_id AND NOT x.from_user AND x.created_at>COALESCE((SELECT max(created_at) FROM dms y WHERE y.user_id=d.user_id AND y.account_id=d.account_id AND y.from_user),'epoch') AND x.created_at<=now()) AS unread
    FROM dms d JOIN accounts a ON a.id=d.account_id WHERE d.user_id=$1 AND d.created_at<=now() ORDER BY d.account_id, d.created_at DESC`, [req.user.id]);
  rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(rows.map(r => ({ ...r, created: new Date(r.created_at).getTime(), unread: Number(r.unread) })));
}));
app.get('/api/dms/:handle', auth, wrap(async (req, res) => {
  const a = await q1('SELECT * FROM accounts WHERE lower(handle)=lower($1)', [req.params.handle]);
  if (!a) return res.status(404).json({ error: 'nf' });
  const msgs = await q(`SELECT id, from_user, text, created_at FROM dms WHERE user_id=$1 AND account_id=$2 AND created_at<=now() ORDER BY created_at`, [req.user.id, a.id]);
  const pend = await q1(`SELECT count(*) c FROM dms WHERE user_id=$1 AND account_id=$2 AND NOT from_user AND created_at>now()`, [req.user.id, a.id]);
  res.json({ account: pubAcct(a), messages: msgs.map(m => ({ ...m, created: new Date(m.created_at).getTime() })), typing: Number(pend.c) > 0 });
}));
app.post('/api/dms/:handle', auth, wrap(async (req, res) => {
  const text = String(req.body.text || '').trim().slice(0, 1000);
  const a = await q1('SELECT * FROM accounts WHERE lower(handle)=lower($1)', [req.params.handle]);
  if (!a || !text || a.id === req.user.id) return res.status(400).json({ error: 'bad' });
  await q('INSERT INTO dms(user_id,account_id,from_user,text) VALUES($1,$2,true,$3)', [req.user.id, a.id, text]);
  const fame = await userFollowers(req.user);
  const ratio = fame / Math.max(1, Number(a.followers));
  // very famous accounts often just leave you on "delivered" until you're someone
  const ghost = ratio < 0.0005 ? 0.55 : ratio < 0.01 ? 0.25 : 0.05;
  const replying = Math.random() >= ghost;
  if (replying) {
    const history = await q('SELECT from_user, text FROM dms WHERE user_id=$1 AND account_id=$2 ORDER BY created_at DESC LIMIT 10', [req.user.id, a.id]);
    history.reverse();
    const acct = withPersona({ ...a });
    // the reply lands after a "typing" delay proportional to its length; the client shows the typing bubble meanwhile
    ai.genDMReply({ ...acct, followers: a.followers }, { history, userName: req.user.name, fame, ratio, profile: req.user.profile }).then(reply =>
      q('INSERT INTO dms(user_id,account_id,from_user,text,created_at) VALUES($1,$2,false,$3,$4)', [req.user.id, a.id, reply, new Date(Date.now() + Math.min(6000, Math.max(600, reply.length * 35)))])
    ).catch(e => console.error(e));
  }
  res.json({ ok: true, reply: replying });
}));

// incoming DMs + unread counts; client polls this
app.get('/api/poll', auth, wrap(async (req, res) => {
  const u = req.user;
  const fame = await userFollowers(u);
  const last = u.last_dm_at ? Date.now() - new Date(u.last_dm_at) : Infinity;
  const gap = fame > 100000 ? 70000 : 150000;
  const myPosts = last > gap ? (await q(`SELECT text FROM posts WHERE author_id=$1 AND created_at<=now() ORDER BY created_at DESC LIMIT 3`, [u.id])).map(r => r.text) : [];
  if (last > gap && myPosts.length && Math.random() < 0.3) { // nobody DMs you about posts you haven't made
    await q('UPDATE accounts SET last_dm_at=now() WHERE id=$1', [u.id]);
    const celebOk = fame > 20000 && Math.random() < Math.min(0.5, Math.log10(fame / 20000 + 1) * 0.5);
    let sender;
    if (celebOk) sender = await q1(`SELECT * FROM accounts WHERE kind='celeb' AND followers < $1 * 4000 ORDER BY random() LIMIT 1`, [fame]);
    if (sender) { const v = ACCOUNTS.find(x => x.handle.toLowerCase() === sender.handle.toLowerCase()); if (v) sender.voice = v.voice; }
    if (!sender) {
      const id = await ensureAccount({ name: pick(['Jay', 'Mia', 'Tre', 'Luna', 'Kai', 'Zoe', 'Dre', 'Nina']) + ' ' + pick(['Stan', 'Reyes', 'Cole', 'Vibes', 'Banks']), handle: pick(['jay', 'mia', 'tre', 'luna', 'kai', 'zoe']) + pick(['_', 'x', 'real', '']) + Math.floor(Math.random() * 9999) });
      sender = await q1('SELECT * FROM accounts WHERE id=$1', [id]);
    }
    if (sender) {
      const text = await ai.genIncomingDM({ userName: u.name, fame, sender, profile: u.profile, posts: myPosts });
      await q('INSERT INTO dms(user_id,account_id,from_user,text) VALUES($1,$2,false,$3)', [u.id, sender.id, text]);
      if (sender.kind === 'celeb') await q(`INSERT INTO notifs(user_id,type,actor_id,text) VALUES($1,'celeb_dm',$2,'sent you a message')`, [u.id, sender.id]);
    }
  }
  const n = await q1(`SELECT count(*) c FROM notifs WHERE user_id=$1 AND NOT read AND created_at<=now()`, [u.id]);
  const d = await q1(`SELECT count(*) c FROM (
      SELECT DISTINCT ON (account_id) account_id, from_user FROM dms WHERE user_id=$1 AND created_at<=now() ORDER BY account_id, created_at DESC) x WHERE NOT x.from_user`, [u.id]);
  res.json({ notifs: Number(n.c), dms: Number(d.c), followers: Number(u.followers), verified: u.verified });
}));

// ---------------- import your X (Twitter) account ----------------
// Two sources: (1) username lookup via the X API when X_BEARER_TOKEN is set (public profile + recent public posts),
// (2) the official X data archive the user uploads in the browser (posts, likes, follower count) — proves ownership too.
const X_TOKEN = process.env.X_BEARER_TOKEN;
async function xFetch(path) {
  const r = await fetch('https://api.x.com/2' + path, { headers: { authorization: 'Bearer ' + X_TOKEN } });
  if (!r.ok) throw Object.assign(new Error(r.status === 402 || r.status === 403 ? 'Your X API plan does not allow this lookup' : r.status === 404 ? 'X user not found' : `X API error ${r.status}`), { status: 502 });
  return r.json();
}
async function lookupX(username) {
  const out = { username, name: null, bio: null, followers: null, pfp: `https://unavatar.io/x/${username}`, posts: [], source: 'unavatar' };
  if (!X_TOKEN) return out;
  const u = (await xFetch(`/users/by/username/${encodeURIComponent(username)}?user.fields=description,profile_image_url,public_metrics,verified`)).data;
  if (!u) throw Object.assign(new Error('X user not found'), { status: 404 });
  Object.assign(out, { name: u.name, bio: u.description, followers: u.public_metrics?.followers_count, source: 'x-api' });
  if (u.profile_image_url) out.pfp = u.profile_image_url.replace('_normal', '_400x400');
  try {
    const t = await xFetch(`/users/${u.id}/tweets?max_results=100&exclude=retweets&tweet.fields=created_at,public_metrics,referenced_tweets`);
    out.posts = (t.data || []).map(x => ({ text: x.text, at: x.created_at, likes: x.public_metrics?.like_count || 0, rts: x.public_metrics?.retweet_count || 0 }));
  } catch (e) { out.postsError = e.message; }
  return out;
}
// public (pre-signup) lookup of an X username, lightly rate-limited because it can spend X API quota
const lookHits = new Map();
app.post('/api/lookup', wrap(async (req, res) => {
  const now = Date.now(), ip = req.ip, hits = (lookHits.get(ip) || []).filter(t => now - t < 3600e3);
  if (hits.length >= 30) return res.status(429).json({ error: 'Too many lookups, try again later' });
  lookHits.set(ip, [...hits, now]);
  const username = String(req.body.username || '').replace(/^@/, '').replace(/[^A-Za-z0-9_]/g, '').slice(0, 15);
  if (!username) return res.status(400).json({ error: 'Enter an X username' });
  try { const r = await lookupX(username); delete r.posts; res.json(r); } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
}));
app.get('/api/import/status', auth, wrap(async (req, res) => {
  res.json({ profile: req.user.profile || null, meta: req.user.import_meta || null, xApi: !!X_TOKEN, handle: req.user.handle });
}));
app.post('/api/import/lookup', auth, wrap(async (req, res) => {
  const username = String(req.body.username || '').replace(/^@/, '').replace(/[^A-Za-z0-9_]/g, '').slice(0, 15);
  if (!username) return res.status(400).json({ error: 'Enter an X username' });
  try { res.json(await lookupX(username)); } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
}));
app.post('/api/import', auth, wrap(async (req, res) => {
  const u = req.user, b = req.body;
  if (!b.confirm) return res.status(400).json({ error: 'Please confirm this is your own account' });
  const username = String(b.username || '').replace(/^@/, '').replace(/[^A-Za-z0-9_]/g, '').slice(0, 15);
  if (username.length < 1) return res.status(400).json({ error: 'Username required' });
  const clean = t => String(t || '').replace(/https?:\/\/t\.co\/\S+/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim().slice(0, 280);
  let tweets = Array.isArray(b.tweets) ? b.tweets : [];
  let source = b.source || 'archive';
  if (!tweets.length && X_TOKEN && b.useApi) { try { tweets = (await lookupX(username)).posts; source = 'x-api'; } catch (e) { return res.status(e.status || 500).json({ error: e.message }); } }
  tweets = tweets.map(t => ({ text: clean(t.text), at: new Date(t.at), likes: Math.max(0, Number(t.likes) || 0), rts: Math.max(0, Number(t.rts) || 0) }))
    .filter(t => t.text && !isNaN(t.at) && !/^RT @/.test(t.text)).sort((x, y) => y.at - x.at).slice(0, 500);
  const likes = (Array.isArray(b.likes) ? b.likes : []).map(clean).filter(Boolean).slice(0, 300);
  const name = String(b.name || u.name).trim().slice(0, 30) || u.name;
  const bio = String(b.bio || '').slice(0, 160);
  const followers = Math.max(0, Math.min(1e9, Math.floor(Number(b.followers) || 0)));
  let pfp = typeof b.pfp === 'string' && /^https:\/\/[\w.-]+\//.test(b.pfp) ? b.pfp.slice(0, 300) : `https://unavatar.io/x/${username}`;
  // rename to the X username when it's free (never take a built-in account's handle)
  if (username.toLowerCase() !== u.handle.toLowerCase()) {
    const taken = await q1('SELECT 1 FROM accounts WHERE lower(handle)=lower($1) AND id<>$2', [username, u.id]);
    if (taken) return res.status(409).json({ error: `@${username} is already taken on Z (built-in accounts and other players can't be overwritten)` });
  }
  const profile = await ai.genProfile({ name, handle: username, bio, followers, posts: tweets.map(t => t.text), likes });
  await q('DELETE FROM posts WHERE author_id=$1 AND imported', [u.id]);
  for (const t of tweets) {
    await q(`INSERT INTO posts(author_id,text,created_at,likes_target,reposts_target,replies_target,views_target,tau,imported) VALUES($1,$2,$3,$4,$5,0,$6,1,true)`,
      [u.id, t.text, t.at, t.likes, t.rts, Math.max(t.likes * 20, 50)]);
  }
  const meta = { username, source, posts: tweets.length, likes: likes.length, followers, at: new Date().toISOString() };
  await q(`UPDATE accounts SET handle=$2, name=$3, bio=$4, pfp=$5, profile=$6, import_meta=$7, bonus_followers=$8 WHERE id=$1`,
    [u.id, username, name, bio, pfp, JSON.stringify(profile), JSON.stringify(meta), Math.max(0, followers - START_FOLLOWERS)]);
  const fresh = await q1('SELECT * FROM accounts WHERE id=$1', [u.id]);
  await userFollowers(fresh);
  res.json({ profile, meta, user: pubAcct(fresh) });
}));
app.post('/api/import/forget', auth, wrap(async (req, res) => {
  await q('DELETE FROM posts WHERE author_id=$1 AND imported', [req.user.id]);
  await q(`UPDATE accounts SET profile=NULL, import_meta=NULL, bonus_followers=0 WHERE id=$1`, [req.user.id]);
  res.json({ ok: true });
}));

// ---------------- the simulation: AI accounts post & reply on their own schedules ----------------
const PERSONA = Object.fromEntries(ACCOUNTS.map(a => [a.handle.toLowerCase(), a]));
const withPersona = r => { const p = PERSONA[String(r.handle).toLowerCase()] || {}; return { ...r, voice: p.voice || r.voice, topics: p.topics, ex: p.ex }; };
const TICK_MS = Number(process.env.TICK_MS) || 20000;
// Global knobs (editable live in the Sim tab, persisted in kv 'settings').
//  postMult/replyMult: sim-speed multipliers on every account's ppd/rpd. 1 = real-time schedule, 60 = a sim-hour per real minute.
//  idlePause: don't spend API credits while nobody has the site open.
let settings = { postMult: Number(process.env.POST_MULT) || 6, replyMult: Number(process.env.REPLY_MULT) || 6, paused: false, idlePause: process.env.IDLE_PAUSE !== 'false', maxPerTick: 8, maxRepliesPerTick: 6, simBudget: 350, simReplyBudget: 120, dailyCap: Number(process.env.DAILY_CAP_USD ?? 3) /* $/day, 0 = no cap */ };
let lastActive = Date.now();
let simState = { day: 0 };
const saveKV = (k, v) => q(`INSERT INTO kv VALUES($1,$2,now()) ON CONFLICT (k) DO UPDATE SET v=$2, updated_at=now()`, [k, JSON.stringify(v)]);
async function loadKV() {
  const a = await q1(`SELECT v FROM kv WHERE k='settings'`); if (a) settings = { ...settings, ...a.v };
  const b = await q1(`SELECT v FROM kv WHERE k='sim'`); if (b) simState = { ...simState, ...b.v };
}
app.use((req, res, next) => { if (req.path.startsWith('/api/') && req.get('x-token')) lastActive = Date.now(); next(); });

async function seedAccounts() {
  // @ye was Ye's old handle in earlier builds; his X handle is @kanyewest
  await q(`UPDATE accounts SET handle='kanyewest' WHERE handle='ye' AND kind='celeb' AND NOT EXISTS (SELECT 1 FROM accounts WHERE handle='kanyewest')`);
  for (const a of ACCOUNTS) {
    await q(`INSERT INTO accounts(handle,name,bio,followers,following,verified,kind,pfp,voice,activity,topics,ppd,rpd)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT (handle) DO UPDATE SET name=$2, bio=$3, verified=$6, kind=$7, pfp=$8, voice=$9, topics=$11,
        ppd=CASE WHEN accounts.tuned THEN accounts.ppd ELSE $12 END, rpd=CASE WHEN accounts.tuned THEN accounts.rpd ELSE $13 END`,
      [a.handle, a.name, a.bio, a.followers, Math.floor(rnd(0, 1500)), a.v, a.kind, a.pfp, a.voice, a.ppd, a.topics, a.ppd, a.rpd]);
  }
}
const stoch = x => Math.floor(x) + (Math.random() < x - Math.floor(x) ? 1 : 0);
const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
async function pool(items, conc, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(conc, items.length) }, async () => { while (i < items.length) { const it = items[i++]; try { await fn(it); } catch (e) { console.error('[pool]', e.message); } } }));
}
async function insertAcctPost(a, text, at) {
  const t = targetsFor(a);
  const r = await q1(`INSERT INTO posts(author_id,text,created_at,likes_target,reposts_target,replies_target,views_target,tau) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, author_id, text, created_at, likes_target`,
    [a.id, String(text).slice(0, 280), at, t.likes, t.reposts, t.replies, t.views, tauFor(a.kind) * rnd(0.6, 1.6) | 0]);
  return r;
}
async function recentPosts(accts) {
  const rows = await q(`SELECT author_id, text FROM (SELECT author_id, text, row_number() OVER (PARTITION BY author_id ORDER BY created_at DESC) rn FROM posts WHERE author_id = ANY($1) AND parent_id IS NULL) x WHERE rn<=4`, [accts.map(a => a.id)]);
  const m = {}; rows.forEach(r => (m[r.author_id] ||= []).push(r.text)); return m;
}
// Pick which post each replier answers (weighted by popularity, affinity, and a bump for the player's posts).
function pickTargets(repliers, cands) {
  const out = [];
  for (const r of repliers) {
    const ws = cands.map(c => {
      if (c.author_id === r.id) return 0;
      let w = Math.sqrt(Number(c.likes_target) + 1);
      if (c.kind === r.kind) w *= 2;
      if (r.kind === 'commentary' && c.kind === 'celeb') w *= 2.5;
      if (r.kind === 'news' && c.kind !== 'news') w *= 0.2;
      if (c.akind === 'user') w *= 40;
      return w;
    });
    const tot = ws.reduce((x, y) => x + y, 0); if (!tot) continue;
    let x = Math.random() * tot, i = 0; for (; i < ws.length; i++) { x -= ws[i]; if (x <= 0) break; }
    out.push({ r, c: cands[Math.min(i, cands.length - 1)] });
  }
  return out;
}
async function runReplies(pairs, { place }) {
  if (!pairs.length) return 0;
  let n = 0;
  await pool(chunk(pairs, 8), 3, async rawBatch => {
    const batch = rawBatch.map((b, i) => ({ ...b, id: i + 1 })); // ids are local to each LLM call
    const out = await ai.genAccountReplies(batch.map(b => ({ id: b.id, a: withPersona(b.r), target: { handle: b.c.handle, name: b.c.name, text: b.c.text, isUser: b.c.akind === 'user', profile: b.c.profile } })));
    for (const b of batch) {
      const at = place(b);
      const t = targetsFor(b.r);
      const likes = Math.round(t.likes * 0.15);
      const row = await q1(`INSERT INTO posts(author_id,text,created_at,likes_target,reposts_target,views_target,tau,parent_id) VALUES($1,$2,$3,$4,$5,$6,600,$7) RETURNING id`,
        [b.r.id, String(out[b.id]).slice(0, 280), at, likes, Math.round(likes * 0.05), likes * 12, b.c.pid]);
      if (b.c.akind === 'user') { // an AI account replied to the player
        const gain = Math.round(Math.min(Number(b.r.followers) * 0.001, 200000) * rnd(0.3, 1.2)) + 20;
        await q('UPDATE accounts SET bonus_followers=bonus_followers+$2 WHERE id=$1', [b.c.author_id, gain]);
        await q(`INSERT INTO notifs(user_id,type,actor_id,post_id,text,created_at) VALUES($1,$2,$3,$4,$5,$6)`, [b.c.author_id, b.r.kind === 'celeb' ? 'celeb_reply' : 'reply', b.r.id, row.id, String(out[b.id]).slice(0, 280), at]);
      }
      n++; if (simJob.running) simJob.done++;
    }
  });
  return n;
}
const CAND_SQL = `SELECT p.id AS pid, p.author_id, p.text, p.likes_target, a.handle, a.name, a.kind, a.kind AS akind, a.profile FROM posts p JOIN accounts a ON a.id=p.author_id
  WHERE p.parent_id IS NULL AND p.created_at <= now() AND p.created_at > now() - interval '8 hours' ORDER BY p.created_at DESC LIMIT 120`;

async function tick() {
  if (simJob.running || seeding || settings.paused || overCap()) return;
  if (settings.idlePause && Date.now() - lastActive > 10 * 60000) return;
  const accts = await q(`SELECT * FROM accounts WHERE kind IN ('celeb','commentary','news')`);
  const dt = TICK_MS / 1000;
  const p1 = (rate) => Math.random() < 1 - Math.exp(-rate * dt * 1 / 86400);
  const posters = accts.filter(a => p1(a.ppd * settings.postMult)).sort(() => Math.random() - .5).slice(0, settings.maxPerTick);
  if (posters.length) {
    const recent = await recentPosts(posters);
    for (const grp of chunk(posters, 6)) {
      const out = await ai.genPostsBatch(grp.map(a => ({ a: withPersona(a), n: 1, recent: recent[a.id] || [] })));
      for (const a of grp) await insertAcctPost(a, out[a.handle.toLowerCase()][0], new Date());
    }
  }
  const repliers = accts.filter(a => p1(a.rpd * settings.replyMult)).sort(() => Math.random() - .5).slice(0, settings.maxRepliesPerTick);
  if (repliers.length) {
    const cands = await q(CAND_SQL);
    if (cands.length) await runReplies(pickTargets(repliers, cands), { place: () => new Date(Date.now() + rnd(2, 25) * 1000) });
  }
}

// ---- fast-forward ("sim"): shift history back, then synthesize the elapsed period ----
const simJob = { running: false, stop: false, phase: '', done: 0, total: 0, log: [], auto: { on: false, days: 1 }, startedAt: 0, last: null };
const slog = m => { simJob.log.unshift(`${new Date().toLocaleTimeString()} ${m}`); simJob.log.length = Math.min(simJob.log.length, 40); };

async function generateHistory({ days, shift, budget, replyBudget }) {
  const secs = days * 86400;
  const accts = await q(`SELECT * FROM accounts WHERE kind IN ('celeb','commentary','news')`);
  if (shift) {
    const c = await pgPool.connect();
    try {
      await c.query('BEGIN');
      for (const t of ['posts', 'notifs', 'dms']) await c.query(`UPDATE ${t} SET created_at = created_at - make_interval(secs => $1)`, [secs]);
      await c.query('COMMIT');
    } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
  }
  // how many posts each account gets: expected volume, compressed so quiet accounts still show up
  const w = accts.map(a => Math.pow(Math.max(0.05, a.ppd), 0.7) * days);
  const scale = Math.min(1, budget / w.reduce((x, y) => x + y, 0)) * 1;
  const want = accts.map((a, i) => ({ a, n: Math.min(40, stoch(Math.max(w[i] * (budget / w.reduce((x, y) => x + y, 0)), days >= 1 && a.ppd >= 0.3 ? 0.6 : 0))) })).filter(x => x.n > 0);
  // split into LLM calls (<=6 accounts, <=14 posts)
  const calls = []; let cur = [], cnt = 0;
  for (const x of want) { let left = x.n; while (left > 0) { const k = Math.min(left, 6); if (cur.length >= 6 || cnt + k > 16) { calls.push(cur); cur = []; cnt = 0; } cur.push({ a: x.a, n: k }); cnt += k; left -= k; } }
  if (cur.length) calls.push(cur);
  simJob.phase = 'Writing posts'; simJob.total = calls.length; simJob.done = 0;
  const times = new Map(); // handle -> sorted timestamps
  want.forEach(x => times.set(x.a.handle, Array.from({ length: x.n }, () => Date.now() - rnd(180, secs) * 1000).sort((a, b) => a - b)));
  const made = [];
  const when = days < 1 ? `the last ${Math.max(1, Math.round(days * 24))} hours` : `the last ${days} day${days > 1 ? 's' : ''}`;
  await pool(calls, 4, async grp => {
    if (simJob.stop) return;
    const out = await ai.genPostsBatch(grp.map(g => ({ a: withPersona(g.a), n: g.n, span: when })), { when });
    for (const g of grp) {
      const arr = times.get(g.a.handle); const texts = out[g.a.handle.toLowerCase()];
      for (let i = 0; i < texts.length; i++) { const at = new Date(arr.shift() || Date.now() - 60000); const r = await insertAcctPost(g.a, texts[i], at); made.push({ pid: r.id, author_id: g.a.id, text: texts[i], likes_target: r.likes_target, handle: g.a.handle, name: g.a.name, kind: g.a.kind, akind: g.a.kind, at: at.getTime() }); }
    }
    simJob.done++;
  });
  // replies between accounts
  simJob.phase = 'Accounts replying to each other';
  const rw = accts.map(a => Math.pow(Math.max(0.01, a.rpd), 0.8));
  const nReply = Math.min(replyBudget, Math.round(accts.reduce((s, a) => s + a.rpd, 0) * days * 0.5));
  const reps = [];
  for (let i = 0; i < nReply; i++) { let x = Math.random() * rw.reduce((a, b) => a + b, 0), j = 0; for (; j < rw.length; j++) { x -= rw[j]; if (x <= 0) break; } reps.push(accts[Math.min(j, accts.length - 1)]); }
  const withTarget = pickTargets(reps, made.length ? made : []);
  // pickTargets expects cands to have pid; restrict to posts at least a few minutes before "now"
  simJob.total = withTarget.length; simJob.done = 0;
  await runReplies(withTarget, { place: b => new Date(Math.min(Date.now() - 30000, b.c.at + rnd(120, 6 * 3600) * 1000)) });
  return { posts: made.length, replies: withTarget.length };
}

async function postSim(days) {
  // follower drift for the cast + organic growth for players, then fresh trends
  await q(`UPDATE accounts SET followers = followers + floor(followers * 0.0004 * $1 * (0.5 + random())) WHERE kind IN ('celeb','commentary','news')`, [days]);
  const users = await q(`SELECT id, followers, name FROM accounts WHERE kind='user'`);
  for (const u of users) {
    const recent = await q1(`SELECT count(*) c FROM posts WHERE author_id=$1`, [u.id]);
    if (Number(recent.c) < 1) continue;
    const gain = Math.min(200000, Math.round(Number(u.followers) * 0.004 * days * rnd(0.5, 1.5)));
    if (gain < 1) continue;
    await q('UPDATE accounts SET bonus_followers=bonus_followers+$2 WHERE id=$1', [u.id, gain]);
    await q(`INSERT INTO notifs(user_id,type,text) VALUES($1,'sim',$2)`, [u.id, `While ${days} day${days > 1 ? 's' : ''} passed on Z, your profile picked up ${gain.toLocaleString()} new followers.`]);
  }
  await saveKV('trends', await ai.genTrends());
}

async function simulate(days) {
  if (simJob.running) return false;
  if (overCap()) { slog(`Daily API cap ($${settings.dailyCap}) reached — raise it in Live speed to keep simulating`); simJob.auto.on = false; return false; }
  Object.assign(simJob, { running: true, stop: false, startedAt: Date.now(), phase: 'Starting', done: 0, total: 0 });
  slog(`Fast-forwarding ${days} day${days > 1 ? 's' : ''}…`);
  try {
    const r = await generateHistory({ days, shift: true, budget: settings.simBudget * Math.min(2, Math.sqrt(days)), replyBudget: settings.simReplyBudget });
    simState.day += days; await saveKV('sim', simState);
    simJob.phase = 'Wrapping up'; await postSim(days);
    simJob.last = { days, ...r, seconds: Math.round((Date.now() - simJob.startedAt) / 1000) };
    slog(`Day ${simState.day}: +${r.posts} posts, +${r.replies} replies (${simJob.last.seconds}s)`);
  } catch (e) { console.error('[sim]', e); slog('Error: ' + e.message); }
  simJob.running = false; simJob.phase = '';
  if (simJob.auto.on && !simJob.stop) setTimeout(() => simulate(simJob.auto.days), 500);
  return true;
}

const simState_ = () => ({ day: simState.day, running: simJob.running, phase: simJob.phase, done: simJob.done, total: simJob.total, log: simJob.log, auto: simJob.auto, last: simJob.last, settings, ai: ai.hasKey, model: ai.MODEL });
app.get('/api/sim', auth, wrap(async (req, res) => {
  const stats = await q1(`SELECT (SELECT count(*) FROM posts) AS posts, (SELECT count(*) FROM accounts WHERE kind IN ('celeb','commentary','news')) AS cast, (SELECT count(*) FROM accounts WHERE kind='npc') AS npcs`);
  res.json({ ...simState_(), stats: { posts: Number(stats.posts), cast: Number(stats.cast), npcs: Number(stats.npcs) } });
}));
app.post('/api/sim/advance', auth, wrap(async (req, res) => {
  const days = Math.max(0.25, Math.min(30, Number(req.body.days) || 1));
  if (simJob.running) return res.status(409).json({ error: 'Already simulating' });
  simulate(days);
  res.json(simState_());
}));
app.post('/api/sim/auto', auth, wrap(async (req, res) => {
  simJob.auto = { on: !!req.body.on, days: Math.max(0.25, Math.min(7, Number(req.body.days) || 1)) };
  if (simJob.auto.on && !simJob.running) simulate(simJob.auto.days);
  if (!simJob.auto.on) simJob.stop = true;
  res.json(simState_());
}));
app.post('/api/sim/stop', auth, wrap(async (req, res) => { simJob.stop = true; simJob.auto.on = false; res.json(simState_()); }));
app.post('/api/sim/settings', auth, wrap(async (req, res) => {
  const b = req.body, num = (v, lo, hi, d) => Math.min(hi, Math.max(lo, Number.isFinite(Number(v)) ? Number(v) : d));
  settings = { ...settings,
    postMult: num(b.postMult, 0, 5000, settings.postMult), replyMult: num(b.replyMult, 0, 5000, settings.replyMult),
    maxPerTick: num(b.maxPerTick, 1, 30, settings.maxPerTick), maxRepliesPerTick: num(b.maxRepliesPerTick, 0, 30, settings.maxRepliesPerTick),
    simBudget: num(b.simBudget, 20, 2000, settings.simBudget), simReplyBudget: num(b.simReplyBudget, 0, 600, settings.simReplyBudget),
    dailyCap: num(b.dailyCap, 0, 1000, settings.dailyCap),
    paused: b.paused === undefined ? settings.paused : !!b.paused, idlePause: b.idlePause === undefined ? settings.idlePause : !!b.idlePause };
  await saveKV('settings', settings);
  res.json(simState_());
}));
app.get('/api/sim/cast', auth, wrap(async (req, res) => {
  const rows = await q(`SELECT handle, name, kind, followers, ppd, rpd, tuned, pfp, verified, (SELECT count(*) FROM posts p WHERE p.author_id=a.id AND p.parent_id IS NULL) AS posts
    FROM accounts a WHERE kind IN ('celeb','commentary','news') ORDER BY followers DESC`);
  res.json(rows.map(r => ({ ...r, followers: Number(r.followers), posts: Number(r.posts) })));
}));
app.post('/api/sim/cast/:handle', auth, wrap(async (req, res) => {
  const ppd = Math.min(200, Math.max(0, Number(req.body.ppd))), rpd = Math.min(200, Math.max(0, Number(req.body.rpd)));
  if (!Number.isFinite(ppd) || !Number.isFinite(rpd)) return res.status(400).json({ error: 'bad' });
  await q(`UPDATE accounts SET ppd=$2, rpd=$3, tuned=true WHERE lower(handle)=lower($1) AND kind IN ('celeb','commentary','news')`, [req.params.handle, ppd, rpd]);
  res.json({ ok: true });
}));
app.post('/api/sim/cast-reset', auth, wrap(async (req, res) => { await q(`UPDATE accounts SET tuned=false WHERE kind IN ('celeb','commentary','news')`); await seedAccounts(); res.json({ ok: true }); }));

// ---- API usage accounting (tokens per day, persisted) ----
const PRICE_IN = 0.10, PRICE_OUT = 0.50; // claude-haiku-5-5, $ per 1M tokens (prompts <= 100K)
let usageDays = {};
const today = () => new Date().toISOString().slice(0, 10);
async function flushUsage() {
  const d = ai.drainUsage(); if (!d.calls) return;
  const day = (usageDays[today()] ||= { calls: 0, in: 0, out: 0, byKind: {} });
  day.calls += d.calls; day.in += d.in; day.out += d.out;
  for (const [k, v] of Object.entries(d.byKind)) { const b = (day.byKind[k] ||= { calls: 0, in: 0, out: 0 }); b.calls += v.calls; b.in += v.in; b.out += v.out; }
  const keep = Object.keys(usageDays).sort().slice(-14); usageDays = Object.fromEntries(keep.map(k => [k, usageDays[k]]));
  await saveKV('usage', usageDays);
}
const overCap = () => settings.dailyCap > 0 && cost(usageDays[today()] || { in: 0, out: 0 }) >= settings.dailyCap;
async function refreshCap() { await flushUsage(); ai.setBlocked(overCap()); }
setInterval(() => refreshCap().catch(e => console.error('usage', e)), 20000);
const cost = u => (u.in * PRICE_IN + u.out * PRICE_OUT) / 1e6;
app.get('/api/sim/usage', auth, wrap(async (req, res) => {
  await flushUsage();
  const days = Object.entries(usageDays).sort().slice(-7).map(([date, u]) => ({ date, ...u, cost: cost(u) }));
  res.json({ days, cap: settings.dailyCap, capped: overCap(), price: { in: PRICE_IN, out: PRICE_OUT, model: ai.MODEL } });
}));

let seeding = false;
async function bootstrap() {
  seeding = true;
  try {
    await seedAccounts();
    const n = await q1('SELECT count(*) c FROM posts');
    if (Number(n.c) < 30) {
      console.log('[z] seeding initial timeline…');
      simJob.running = true; simJob.phase = 'Seeding timeline';
      const r = await generateHistory({ days: 0.25, shift: false, budget: 230, replyBudget: 40 });
      console.log(`[z] seeded ${r.posts} posts, ${r.replies} replies`);
      simJob.running = false; simJob.phase = '';
    }
    if (!(await q1(`SELECT 1 FROM kv WHERE k='trends'`))) await saveKV('trends', await ai.genTrends());
  } finally { seeding = false; simJob.running = false; }
}

const PORT = process.env.PORT || 3000;
init().then(async () => {
  await loadKV();
  { const u = await q1(`SELECT v FROM kv WHERE k='usage'`); if (u) usageDays = u.v; }
  ai.setBlocked(overCap());
  app.listen(PORT, () => console.log(`[z] listening on ${PORT} · ai=${ai.hasKey ? ai.MODEL : 'OFFLINE FALLBACK (set ANTHROPIC_API_KEY)'} · ${ACCOUNTS.length} accounts`));
  bootstrap().catch(e => console.error('bootstrap', e));
  setInterval(() => tick().catch(e => console.error('tick', e)), TICK_MS);
  setInterval(async () => { try { if (!settings.paused && Date.now() - lastActive < 10 * 60000) await saveKV('trends', await ai.genTrends()); } catch (e) { console.error(e); } }, 15 * 60000);
}).catch(e => { console.error('DB init failed', e.message); process.exit(1); });
