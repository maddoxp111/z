const express = require('express');
const crypto = require('crypto');
const path = require('path');
const { q, q1, init } = require('./db');
const ai = require('./ai');
const ACCOUNTS = require('./accounts');

const app = express();
app.use(express.json({ limit: '50kb' }));
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
  const r = await q1(`SELECT COALESCE(floor(sum(${LIKES_NOW})),0) AS l FROM posts p WHERE p.author_id=$1`, [u.id]);
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
  let { name, handle } = req.body;
  name = String(name || '').trim().slice(0, 30);
  handle = String(handle || '').replace(/[^A-Za-z0-9_]/g, '').slice(0, 15);
  if (!name || handle.length < 3) return res.status(400).json({ error: 'Name and a handle (3+ letters/numbers) required' });
  const token = crypto.randomBytes(24).toString('hex');
  const row = await q1(`INSERT INTO accounts(handle,name,kind,followers,following,token,voice) VALUES($1,$2,'user',$3,0,$4,'') ON CONFLICT (handle) DO NOTHING RETURNING *`, [handle, name, START_FOLLOWERS, token]);
  if (!row) return res.status(409).json({ error: 'That handle is taken' });
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
  const p = await q1(`SELECT p.*, a.handle, a.name FROM posts p JOIN accounts a ON a.id=p.author_id WHERE p.id=$1`, [id]);
  if (!p) return res.status(404).json({ error: 'nf' });
  const isUserPost = p.author_id === req.user.id;
  const need = (p.replies_gen === 0 && !isUserPost) || (more && p.replies_gen < 4);
  if (need && !genLocks.has(id)) {
    genLocks.add(id);
    try {
      const existing = await q(`SELECT text FROM posts WHERE parent_id=$1 ORDER BY created_at DESC LIMIT 6`, [id]);
      const n = p.replies_gen === 0 ? 10 : 8;
      const items = await ai.genReplies({ authorHandle: p.handle, authorName: p.name, text: p.text, n, existing: existing.map(e => e.text) });
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
  const parent = parent_id ? await q1(`SELECT p.*, a.handle, a.name, a.followers, a.kind, a.voice FROM posts p JOIN accounts a ON a.id=p.author_id WHERE p.id=$1`, [parent_id]) : null;

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
  ai.genUserReplies({ userName: u.name, userHandle: u.handle, text, ctx: parent ? `in reply to @${parent.handle}` : '', n: nReact })
    .then(items => insertFutureReplies(row, items, 150)).catch(e => console.error(e));

  // a famous account might notice a comment on its post
  if (parent && parent.kind !== 'npc' && parent.kind !== 'user') {
    const ratio = fame / Math.max(1, Number(parent.followers));
    const p = Math.min(0.5, 0.02 + 0.6 * Math.sqrt(ratio));
    if (Math.random() < p) {
      const acct = ACCOUNTS.find(a => a.handle.toLowerCase() === parent.handle.toLowerCase()) || { name: parent.name, handle: parent.handle, voice: parent.voice, kind: parent.kind };
      ai.genCelebReply(acct, { postText: parent.text, userText: text, userName: u.name, fame }).then(async reply => {
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
  res.json({ account: pubAcct(a), messages: msgs.map(m => ({ ...m, created: new Date(m.created_at).getTime() })) });
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
  if (Math.random() >= ghost) {
    const history = await q('SELECT from_user, text FROM dms WHERE user_id=$1 AND account_id=$2 ORDER BY created_at DESC LIMIT 10', [req.user.id, a.id]);
    history.reverse();
    const acct = ACCOUNTS.find(x => x.handle.toLowerCase() === a.handle.toLowerCase()) || a;
    ai.genDMReply({ ...acct, followers: a.followers }, { history, userName: req.user.name, fame, ratio }).then(reply =>
      q('INSERT INTO dms(user_id,account_id,from_user,text,created_at) VALUES($1,$2,false,$3,$4)', [req.user.id, a.id, reply, new Date(Date.now() + rnd(3, 20) * 1000)])
    ).catch(e => console.error(e));
  }
  res.json({ ok: true });
}));

// incoming DMs + unread counts; client polls this
app.get('/api/poll', auth, wrap(async (req, res) => {
  const u = req.user;
  const fame = await userFollowers(u);
  const last = u.last_dm_at ? Date.now() - new Date(u.last_dm_at) : Infinity;
  const gap = fame > 100000 ? 70000 : 150000;
  if (last > gap && Math.random() < 0.3) {
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
      const text = await ai.genIncomingDM({ userName: u.name, fame, sender });
      await q('INSERT INTO dms(user_id,account_id,from_user,text) VALUES($1,$2,false,$3)', [u.id, sender.id, text]);
      if (sender.kind === 'celeb') await q(`INSERT INTO notifs(user_id,type,actor_id,text) VALUES($1,'celeb_dm',$2,'sent you a message')`, [u.id, sender.id]);
    }
  }
  const n = await q1(`SELECT count(*) c FROM notifs WHERE user_id=$1 AND NOT read AND created_at<=now()`, [u.id]);
  const d = await q1(`SELECT count(*) c FROM (
      SELECT DISTINCT ON (account_id) account_id, from_user FROM dms WHERE user_id=$1 AND created_at<=now() ORDER BY account_id, created_at DESC) x WHERE NOT x.from_user`, [u.id]);
  res.json({ notifs: Number(n.c), dms: Number(d.c), followers: Number(u.followers), verified: u.verified });
}));

// ---------------- the simulation: AI accounts keep posting ----------------
let seeding = false;
async function seedAccounts() {
  for (const a of ACCOUNTS) {
    await q(`INSERT INTO accounts(handle,name,bio,followers,following,verified,kind,pfp,voice,activity)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (handle) DO UPDATE SET name=$2, bio=$3, verified=$6, kind=$7, pfp=$8, voice=$9, activity=$10`,
      [a.handle, a.name, a.bio, a.followers, Math.floor(rnd(0, 1500)), a.v, a.kind, `https://unavatar.io/x/${a.handle}`, a.voice, a.activity]);
  }
}
async function publishFor(accts, ageSec = 0) {
  const items = await ai.genPosts(accts);
  for (const it of items) {
    const a = accts.find(x => x.handle.toLowerCase() === it.handle.toLowerCase());
    if (!a) continue;
    const t = targetsFor(a);
    await q(`INSERT INTO posts(author_id,text,created_at,likes_target,reposts_target,replies_target,views_target,tau) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
      [a.id, String(it.text).slice(0, 280), new Date(Date.now() - ageSec * 1000 * Math.random()), t.likes, t.reposts, t.replies, t.views, tauFor(a.kind) * rnd(0.6, 1.6) | 0]);
  }
}
function weighted(arr, n) {
  const out = []; const pool = [...arr];
  while (out.length < n && pool.length) {
    const tot = pool.reduce((s, a) => s + a.activity, 0); let r = Math.random() * tot, i = 0;
    for (; i < pool.length; i++) { r -= pool[i].activity; if (r <= 0) break; }
    out.push(pool.splice(Math.min(i, pool.length - 1), 1)[0]);
  }
  return out;
}
async function tick() {
  if (seeding) return;
  const accts = await q(`SELECT * FROM accounts WHERE kind IN ('celeb','commentary','news')`);
  if (!accts.length) return;
  await publishFor(weighted(accts, 3));
}
async function bootstrap() {
  seeding = true;
  try {
    await seedAccounts();
    const accts = await q(`SELECT * FROM accounts WHERE kind IN ('celeb','commentary','news')`);
    const n = await q1('SELECT count(*) c FROM posts');
    if (Number(n.c) < 20) {
      console.log('[z] seeding initial timeline…');
      for (let i = 0; i < accts.length; i += 6) await publishFor(accts.slice(i, i + 6), 3600);
      for (let i = 0; i < accts.length; i += 6) await publishFor(accts.slice(i, i + 6), 3600);
    }
    const tr = await q1(`SELECT updated_at FROM kv WHERE k='trends'`);
    if (!tr) await q(`INSERT INTO kv VALUES('trends',$1,now()) ON CONFLICT (k) DO UPDATE SET v=$1, updated_at=now()`, [JSON.stringify(await ai.genTrends())]);
  } finally { seeding = false; }
}

const PORT = process.env.PORT || 3000;
init().then(async () => {
  app.listen(PORT, () => console.log(`[z] listening on ${PORT} · ai=${ai.hasKey ? ai.MODEL : 'OFFLINE FALLBACK (set ANTHROPIC_API_KEY)'}`));
  bootstrap().catch(e => console.error('bootstrap', e));
  setInterval(() => tick().catch(e => console.error('tick', e)), Number(process.env.TICK_MS) || 30000);
  setInterval(async () => { try { await q(`INSERT INTO kv VALUES('trends',$1,now()) ON CONFLICT (k) DO UPDATE SET v=$1, updated_at=now()`, [JSON.stringify(await ai.genTrends())]); } catch (e) { console.error(e); } }, 15 * 60000);
}).catch(e => { console.error('DB init failed', e.message); process.exit(1); });
