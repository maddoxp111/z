// Z — client. Vanilla JS SPA, X-style UI. Everyone except you is AI.
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const I = {
  home: 'M12 1.696L.622 8.807l1.06 1.696L3 9.679V19.5C3 20.881 4.119 22 5.5 22h13c1.381 0 2.5-1.119 2.5-2.5V9.679l1.318.824 1.06-1.696L12 1.696zM12 16.5c-1.933 0-3.5-1.567-3.5-3.5s1.567-3.5 3.5-3.5 3.5 1.567 3.5 3.5-1.567 3.5-3.5 3.5z',
  search: 'M10.25 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.419-.726 4.596-1.904 1.178-1.177 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.815-1.824 5.262l4.781 4.781-1.414 1.414-4.781-4.781c-1.447 1.142-3.276 1.824-5.262 1.824-4.694 0-8.5-3.806-8.5-8.5z',
  bell: 'M19.993 9.042C19.48 5.017 16.054 2 11.996 2s-7.49 3.021-7.999 7.051L2.866 18H7.1c.463 2.282 2.481 4 4.9 4s4.437-1.718 4.9-4h4.236l-1.143-8.958zM12 20c-1.306 0-2.417-.835-2.829-2h5.658c-.412 1.165-1.523 2-2.829 2zm-6.866-4l.847-6.698C6.364 6.272 8.941 4 11.996 4s5.627 2.268 6.013 5.295L18.864 16H5.134z',
  mail: 'M1.998 5.5c0-1.381 1.119-2.5 2.5-2.5h15c1.381 0 2.5 1.119 2.5 2.5v13c0 1.381-1.119 2.5-2.5 2.5h-15c-1.381 0-2.5-1.119-2.5-2.5v-13zm2.5-.5c-.276 0-.5.224-.5.5v2.764l8 3.6 8-3.6V5.5c0-.276-.224-.5-.5-.5h-15zm15.5 5.463l-8 3.6-8-3.6V18.5c0 .276.224.5.5.5h15c.276 0 .5-.224.5-.5v-8.037z',
  user: 'M5.651 19h12.698c-.337-1.8-1.023-3.21-1.945-4.19C15.318 13.65 13.838 13 12 13s-3.317.65-4.404 1.81c-.922.98-1.608 2.39-1.945 4.19zm.486-5.56C7.627 11.85 9.648 11 12 11s4.373.85 5.863 2.44c1.477 1.58 2.366 3.8 2.632 6.46l.11 1.1H3.395l.11-1.1c.266-2.66 1.155-4.88 2.632-6.46zM12 4c-1.105 0-2 .9-2 2s.895 2 2 2 2-.9 2-2-.895-2-2-2zM8 6c0-2.21 1.791-4 4-4s4 1.79 4 4-1.791 4-4 4-4-1.79-4-4z',
  reply: 'M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z',
  rt: 'M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z',
  heart: 'M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z',
  hearts: 'M20.884 13.19c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z',
  views: 'M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z',
  share: 'M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z',
  back: 'M7.414 13l5.043 5.04-1.414 1.42L3.586 12l7.457-7.46 1.414 1.42L7.414 11H21v2H7.414z',
  badge: 'M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z',
  clock: 'M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm1-13h-2v6l4.5 2.7 1-1.64-3.5-2.06V7z',
  logo: 'M5 4h14v2.5L9.2 17.5H19V20H5v-2.5L14.8 6.5H5z',
};
const svg = (k, cls = '') => `<svg viewBox="0 0 24 24" class="${cls}"><path d="${I[k]}"/></svg>`;
const verified = v => v === 'blue' || v === 'gold' ? `<svg viewBox="0 0 24 24" class="vf ${v}" aria-label="Verified account"><path d="${I.badge}"/></svg>` : '';

// ---------- state / api ----------
let token = localStorage.getItem('z_token');
let me = null, badges = { notifs: 0, dms: 0 };
const posts = new Map(); // id -> post (for live counters)
async function api(path, method = 'GET', body) {
  const r = await fetch('/api' + path, { method, headers: { 'content-type': 'application/json', 'x-token': token || '' }, body: body ? JSON.stringify(body) : undefined });
  if (r.status === 401) { localStorage.removeItem('z_token'); token = null; location.reload(); throw new Error('auth'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || 'error'), { status: r.status });
  return j;
}
function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.append(d); setTimeout(() => d.remove(), 4500); }

// ---------- formatting ----------
function compact(n) {
  n = Math.floor(n);
  if (n < 1000) return String(n);
  if (n < 1e4) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  if (n < 1e6) return Math.floor(n / 1e3) + 'K';
  if (n < 1e7) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n < 1e9) return Math.floor(n / 1e6) + 'M';
  return (n / 1e9).toFixed(1) + 'B';
}
function ago(ts) {
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 60) return Math.floor(s) + 's';
  if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
const growth = (t, created, tau) => t * (1 - Math.exp(-Math.max(0, Date.now() - created) / 1000 / tau));
function count(p, k) {
  if (k === 'likes') return Math.floor(growth(p.likes_t, p.created, p.tau)) + (p.liked && p.likes_t_has_me !== true ? 1 : 0);
  if (k === 'reposts') return Math.floor(growth(p.reposts_t, p.created, p.tau)) + (p.reposted ? 1 : 0);
  if (k === 'replies') return Math.max(p.real_replies, Math.floor(growth(p.replies_t, p.created, p.tau)));
  return Math.floor(growth(p.views_t, p.created, p.tau * 1.5));
}
function linkify(t) {
  return esc(t).replace(/(^|\s)(#\w+)/g, '$1<a class="tag" href="#/search?q=$2">$2</a>').replace(/(^|\s)@(\w{1,15})/g, '$1<a class="tag" href="#/u/$2">@$2</a>');
}
const hue = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
function av(a, cls = '') {
  const init = esc((a.name || a.handle || '?').trim()[0] || '?').toUpperCase();
  const fb = `<div class="av ${cls}" style="background:hsl(${hue(a.handle)},45%,35%)">${init}</div>`;
  if (!a.pfp) return fb;
  return `<img class="av ${cls}" src="${esc(a.pfp)}" loading="lazy" alt="" referrerpolicy="no-referrer" onerror="this.outerHTML=this.dataset.fb" data-fb="${esc(fb)}">`;
}
const nameLine = a => `<b>${esc(a.name)}</b>${verified(a.verified)}`;

// ---------- post rendering ----------
function postHTML(p, o = {}) {
  posts.set(p.id, p);
  const a = p.author;
  const q = p.quoted ? `<div class="quote" data-go="#/post/${p.quoted.id}"><div class="head">${nameLine(p.quoted.author)} <span class="mute">@${esc(p.quoted.author.handle)}</span></div><div class="txt">${linkify(p.quoted.text)}</div></div>` : '';
  const act = (cls, ic, k, lbl) => `<button class="${cls}" data-act="${cls}" data-id="${p.id}" title="${lbl}">${svg(ic)}<span data-live="${k}" data-id="${p.id}">${compact(count(p, k)) === '0' ? '' : compact(count(p, k))}</span></button>`;
  const lk = `<button class="lk ${p.liked ? 'on' : ''}" data-act="lk" data-id="${p.id}" title="Like"><svg viewBox="0 0 24 24"><path d="${p.liked ? I.hearts : I.heart}"/></svg><span data-live="likes" data-id="${p.id}">${compact(count(p, 'likes'))}</span></button>`;
  return `<article class="post" data-go="#/post/${p.id}" data-pid="${p.id}">
    <div class="avcol"><a href="#/u/${esc(a.handle)}">${av(a)}</a>${o.line ? '<div class="thread-line"></div>' : ''}</div>
    <div class="body">
      <div class="head"><a href="#/u/${esc(a.handle)}" style="display:flex;gap:4px;align-items:center;min-width:0">${nameLine(a)}</a><span class="mute">@${esc(a.handle)} · <span data-ago="${p.created}">${ago(p.created)}</span></span></div>
      ${p.parent_id && o.showReplyTo ? `<div class="mute" style="font-size:13px">Replying to a post</div>` : ''}
      <div class="txt">${linkify(p.text)}</div>${q}
      <div class="acts">
        ${act('rp', 'reply', 'replies', 'Reply')}${act('rt' + (p.reposted ? ' on' : ''), 'rt', 'reposts', 'Repost')}${lk}
        <button title="Views">${svg('views')}<span data-live="views" data-id="${p.id}">${compact(count(p, 'views'))}</span></button>
        <button data-act="share" data-id="${p.id}" title="Share">${svg('share')}</button>
      </div></div></article>`;
}
function tickLive() {
  document.querySelectorAll('[data-live]').forEach(el => {
    const p = posts.get(+el.dataset.id); if (!p) return;
    const v = count(p, el.dataset.live);
    const t = compact(v);
    el.textContent = (t === '0' && el.dataset.live !== 'likes') ? '' : t;
  });
  document.querySelectorAll('[data-detail]').forEach(el => {
    const p = posts.get(+el.dataset.id); if (p) el.textContent = Number(count(p, el.dataset.detail)).toLocaleString();
  });
  document.querySelectorAll('[data-ago]').forEach(el => el.textContent = ago(+el.dataset.ago));
}
setInterval(tickLive, 1200);

// ---------- shell ----------
function shell() {
  $('#app').innerHTML = `<div class="layout">
  <header class="left"><div class="nav">
    <a class="logo" href="#/home" title="Z">${svg('logo')}</a>
    <a href="#/home" data-nav="home">${svg('home')}<span>Home</span></a>
    <a href="#/explore" data-nav="explore">${svg('search')}<span>Explore</span></a>
    <a href="#/notifications" data-nav="notifications">${svg('bell')}<span>Notifications</span><i class="badge" id="nb" hidden></i></a>
    <a href="#/messages" data-nav="messages">${svg('mail')}<span>Messages</span><i class="badge" id="mb" hidden></i></a>
    <a href="#/sim" data-nav="sim">${svg('clock')}<span>Sim</span></a>
    <a id="profnav" href="#/u/${me.handle}" data-nav="profile">${svg('user')}<span>Profile</span></a>
    <button class="postbtn" id="postbtn"><span>Post</span></button></div>
    <div class="me" id="meBox" data-go="#/u/${me.handle}"></div></header>
  <main class="main" id="main"></main>
  <aside class="right" id="right"></aside></div>`;
  renderMe();
  $('#postbtn').onclick = openComposeModal;
}
function renderMe() {
  $('#meBox').innerHTML = `${av(me, 's')}<div class="who"><b>${esc(me.name)}${verified(me.verified)}</b><span class="mute">@${esc(me.handle)}</span></div><span class="dots">···</span>`;
}
function setBadges() {
  const s = (id, n) => { const e = $(id); if (e) { e.hidden = !n; e.textContent = n > 99 ? '99+' : n; } };
  s('#nb', badges.notifs); s('#mb', badges.dms);
  document.title = (badges.notifs + badges.dms ? `(${badges.notifs + badges.dms}) ` : '') + 'Z';
}
async function refreshRight() {
  const [ex] = await Promise.all([api('/explore')]);
  const goal = me.verify_at;
  const pct = Math.min(100, (me.followers / goal) * 100);
  $('#right').innerHTML = `
    <div class="sbox"><div style="position:relative">${svg('search')}<input id="sq" placeholder="Search" autocomplete="off"></div></div>
    <div class="card"><h2>Your fame</h2><div style="padding:0 16px 16px"><b style="font-size:24px" id="fameN">${me.followers.toLocaleString()}</b> <span class="mute">followers</span>
      <div class="bar fame" style="margin:8px 0 0;padding:0;border:0"><div class="bar"><i style="width:${pct}%"></i></div></div>
      <small class="mute"><a href="#/import" style="color:var(--blue)">Import your X account →</a><br>${me.verified === 'blue' ? 'Verified ✔ — you made it.' : `${compact(goal - me.followers)} to go until you're verified (${compact(goal)})`}</small></div></div>
    <div class="card"><h2>What's happening</h2>${ex.trends.slice(0, 6).map(t => `<div class="it" data-go="#/search?q=${encodeURIComponent(t.topic)}"><small>${esc(t.cat)}</small><b>${esc(t.topic)}</b><small>${esc(t.posts)} posts</small></div>`).join('')}</div>
    <div class="card"><h2>Who to follow</h2>${ex.suggest.map(a => `<div class="who2">${av(a)}<div class="info"><a href="#/u/${esc(a.handle)}"><b>${esc(a.name)}${verified(a.verified)}</b><span class="mute">@${esc(a.handle)}</span></a></div><button class="btn w" data-follow="${esc(a.handle)}">Follow</button></div>`).join('')}</div>
    <div class="foot">Z is a parody. Every account except yours is AI-generated fiction — nothing here is real, said, or endorsed by anyone named. Profile names, handles and photos mirror public X profiles for the fun of it.</div>`;
  const sq = $('#sq'); sq.onkeydown = e => { if (e.key === 'Enter' && sq.value.trim()) location.hash = '#/search?q=' + encodeURIComponent(sq.value.trim()); };
}

// ---------- compose ----------
function composeHTML({ placeholder = "What is happening?!", btn = 'Post', id = 'c' + Math.random().toString(36).slice(2, 7) } = {}) {
  return `<div class="compose" id="${id}">${av(me)}<div style="flex:1"><textarea maxlength="280" placeholder="${placeholder}" rows="1"></textarea><div class="row"><span class="mute cc">280</span><button class="btn" disabled>${btn}</button></div></div></div>`;
}
function wireCompose(root, { parent_id, quote_of, onDone }) {
  const ta = $('textarea', root), b = $('.btn', root), cc = $('.cc', root);
  ta.oninput = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; b.disabled = !ta.value.trim(); cc.textContent = 280 - ta.value.length; };
  b.onclick = async () => {
    b.disabled = true;
    try {
      const r = await api('/post', 'POST', { text: ta.value, parent_id, quote_of });
      ta.value = ''; ta.oninput();
      if (r.events.includes('noticed')) toast('👀 Someone famous may have noticed your comment…');
      else if (r.events.includes('viral')) toast('🔥 Your post is taking off!');
      onDone && onDone(r.post);
      pollNow();
    } catch (e) { toast('Could not post'); b.disabled = false; }
  };
}
function openComposeModal(quote) {
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="box"><div class="x"><button>✕</button></div>${composeHTML({ id: 'mc' })}</div>`;
  document.body.append(m);
  m.onclick = e => { if (e.target === m || e.target.closest('.x button')) m.remove(); };
  wireCompose($('#mc', m), { onDone: () => { m.remove(); if ((location.hash || '#/home').startsWith('#/home')) route(); } });
  $('textarea', m).focus();
}

// ---------- views ----------
const main = () => $('#main');
let newestSeen = 0, feedTimer = null;
async function viewHome() {
  const tab = sessionStorage.getItem('z_tab') || 'foryou';
  main().innerHTML = `<div class="hdr"><div class="title" style="padding-bottom:0">Home</div><div class="tabs"><a data-tab="foryou" class="${tab === 'foryou' ? 'on' : ''}">For you</a><a data-tab="following" class="${tab === 'following' ? 'on' : ''}">Following</a></div></div>
    ${composeHTML({ id: 'homec' })}<div id="newpill"></div><div id="feed"><div class="empty">Loading…</div></div>`;
  main().querySelectorAll('[data-tab]').forEach(a => a.onclick = () => { sessionStorage.setItem('z_tab', a.dataset.tab); viewHome(); });
  wireCompose($('#homec'), { onDone: p => { $('#feed').insertAdjacentHTML('afterbegin', postHTML(p)); } });
  let list = await api('/feed?tab=' + tab);
  const feed = $('#feed');
  const draw = (arr, append) => { const h = arr.map(p => postHTML(p)).join(''); append ? feed.insertAdjacentHTML('beforeend', h) : feed.innerHTML = h || `<div class="empty">${tab === 'following' ? 'Follow some accounts to fill your timeline.' : 'Nothing yet — the AIs are warming up…'}</div>`; };
  draw(list);
  newestSeen = list[0]?.created || 0;
  const more = async () => {
    if (!list.length) return;
    const last = list[list.length - 1].created;
    const nxt = await api(`/feed?tab=${tab}&before=${last}`);
    list = nxt; $('.more', feed)?.remove(); draw(nxt, true); if (nxt.length) feed.insertAdjacentHTML('beforeend', '<a class="more">Show more</a>'); $('.more', feed) && ($('.more', feed).onclick = more);
  };
  if (list.length >= 25) { feed.insertAdjacentHTML('beforeend', '<a class="more">Show more</a>'); $('.more', feed).onclick = more; }
  clearInterval(feedTimer);
  feedTimer = setInterval(async () => {
    if (!location.hash.startsWith('#/home') && location.hash !== '' && location.hash !== '#/') return clearInterval(feedTimer);
    const fresh = await api('/feed?tab=' + tab).catch(() => []);
    const n = fresh.filter(p => p.created > newestSeen).length;
    if (n) $('#newpill').innerHTML = `<a class="more" style="border-bottom:1px solid var(--line)">Show ${n} new post${n > 1 ? 's' : ''}</a>`, $('#newpill .more').onclick = () => viewHome();
  }, 20000);
}

async function viewPost(id) {
  main().innerHTML = `<div class="hdr"><div class="title"><span class="back" data-back>${svg('back')}</span>Post</div></div><div class="empty">Loading…</div>`;
  const { post, ancestors } = await api('/post/' + id);
  posts.set(post.id, post);
  const a = post.author;
  const detail = `<div class="detail" style="padding:12px 16px"><div style="display:flex;gap:12px;align-items:center"><a href="#/u/${esc(a.handle)}">${av(a)}</a><div style="line-height:1.25"><a href="#/u/${esc(a.handle)}"><b>${esc(a.name)}${verified(a.verified)}</b></a><div class="mute">@${esc(a.handle)}</div></div></div>
    <div class="big">${linkify(post.text)}</div>${post.quoted ? `<div class="quote" data-go="#/post/${post.quoted.id}"><div class="head">${nameLine(post.quoted.author)} <span class="mute">@${esc(post.quoted.author.handle)}</span></div><div class="txt">${linkify(post.quoted.text)}</div></div>` : ''}
    <div class="meta">${new Date(post.created).toLocaleString([], { hour: 'numeric', minute: '2-digit' })} · ${new Date(post.created).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} · <b style="color:var(--text)" data-detail="views" data-id="${post.id}">${count(post, 'views').toLocaleString()}</b> Views</div>
    <div class="counts"><span><b data-detail="reposts" data-id="${post.id}">${count(post, 'reposts').toLocaleString()}</b> Reposts</span><span><b data-detail="likes" data-id="${post.id}">${count(post, 'likes').toLocaleString()}</b> Likes</span></div>
    <div class="acts"><button data-act="rp" data-id="${post.id}">${svg('reply')}</button><button class="rt ${post.reposted ? 'on' : ''}" data-act="rt" data-id="${post.id}">${svg('rt')}</button><button class="lk ${post.liked ? 'on' : ''}" data-act="lk" data-id="${post.id}"><svg viewBox="0 0 24 24"><path d="${post.liked ? I.hearts : I.heart}"/></svg></button><button data-act="share" data-id="${post.id}">${svg('share')}</button></div></div>`;
  main().innerHTML = `<div class="hdr"><div class="title"><span class="back" data-back>${svg('back')}</span>Post</div></div>
    ${ancestors.map(p => postHTML(p, { line: true })).join('')}${detail}
    ${composeHTML({ placeholder: 'Post your reply', btn: 'Reply', id: 'rc' })}<div id="replies"><div class="empty">Loading replies…</div></div>`;
  const R = $('#replies');
  const draw = r => {
    R.innerHTML = r.replies.map(c => `<div style="border-bottom:1px solid var(--line)">${postHTML(c, { line: c.children.length > 0 }).replace('border-bottom:1px solid var(--line)', '')}${c.children.map(k => postHTML(k)).join('')}</div>`).join('') + (r.can_more ? '<a class="more" id="moreR">Show more replies</a>' : '') || '<div class="empty">No replies yet.</div>';
    const mb = $('#moreR'); if (mb) mb.onclick = async () => { mb.textContent = 'Loading…'; draw(await api(`/post/${id}/replies?more=1`)); };
  };
  wireCompose($('#rc'), { parent_id: post.id, onDone: p => { posts.set(p.id, p); R.insertAdjacentHTML('afterbegin', `<div>${postHTML(p)}</div>`); } });
  api(`/post/${id}/replies`).then(draw);
  clearTimeout(window._rt);
  const refresh = async () => { if (!location.hash.startsWith('#/post/' + id)) return; try { const r = await api(`/post/${id}/replies`); if (!$('#rc textarea')?.value) draw(r); } catch { } window._rt = setTimeout(refresh, 15000); };
  window._rt = setTimeout(refresh, 15000);
}

async function viewProfile(handle, tab = 'posts') {
  main().innerHTML = '<div class="empty">Loading…</div>';
  let r;
  try { r = await api(`/profile/${handle}?tab=${tab}`); } catch { main().innerHTML = `<div class="hdr"><div class="title"><span class="back" data-back>${svg('back')}</span>Profile</div></div><div class="empty"><b style="font-size:30px;color:var(--text)">This account doesn’t exist</b><p>Try searching for another.</p></div>`; return; }
  const a = r.account;
  if (r.me) { Object.assign(me, { followers: a.followers, verified: a.verified }); renderMe(); }
  const h = hue(a.handle);
  main().innerHTML = `<div class="hdr"><div class="title"><span class="back" data-back>${svg('back')}</span><div style="line-height:1.2">${esc(a.name)}${verified(a.verified)}<div class="mute" style="font-size:13px;font-weight:400">${r.posts.length} posts</div></div></div></div>
    <div class="banner" style="background:linear-gradient(135deg,hsl(${h},40%,22%),hsl(${(h + 60) % 360},45%,12%))"></div>
    <div class="prof"><div class="top">${av(a, 'l')}<div style="display:flex;gap:8px;margin-top:12px">${r.me ? `<a class="btn o" href="#/import">Import from X</a>` : `<button class="btn o" data-dm="${esc(a.handle)}" title="Message">${svg('mail')}</button><button class="btn ${r.following ? 'o' : 'w'}" data-follow="${esc(a.handle)}" id="fbtn">${r.following ? 'Following' : 'Follow'}</button>`}</div></div>
    <h1>${esc(a.name)}${verified(a.verified)}</h1><div class="mute">@${esc(a.handle)}</div>
    ${a.bio ? `<p style="margin:12px 0 0">${linkify(a.bio)}</p>` : ''}
    <div class="stats"><span><b>${compact(a.following)}</b> Following</span><span><b id="pf">${a.followers.toLocaleString()}</b> Followers</span></div></div>
    ${r.me && a.verified !== 'blue' ? `<div class="fame"><b>Road to verified</b><div class="mute">Post, comment on big accounts, and go viral. At ${me.verify_at.toLocaleString()} followers you earn the check.</div><div class="bar"><i style="width:${Math.min(100, a.followers / me.verify_at * 100)}%"></i></div></div>` : ''}
    <div class="tabs" style="border-bottom:1px solid var(--line)">${['posts', 'replies', 'likes'].map(t => `<a href="#/u/${esc(a.handle)}${t === 'posts' ? '' : '/' + t}" class="${t === tab ? 'on' : ''}">${t[0].toUpperCase() + t.slice(1)}</a>`).join('')}</div>
    ${r.posts.map(p => postHTML(p, { showReplyTo: true })).join('') || '<div class="empty">Nothing here yet.</div>'}`;
}

async function viewExplore() {
  main().innerHTML = `<div class="hdr"><div class="title">Explore</div></div><div class="sbox" style="padding:8px 16px"><div style="position:relative">${svg('search')}<input id="eq" placeholder="Search"></div></div><div id="ex"><div class="empty">Loading…</div></div>`;
  $('#eq').onkeydown = e => { if (e.key === 'Enter' && e.target.value.trim()) location.hash = '#/search?q=' + encodeURIComponent(e.target.value.trim()); };
  const ex = await api('/explore');
  const hot = await api('/feed');
  hot.sort((a, b) => b.likes_t - a.likes_t);
  $('#ex').innerHTML = `<h2 style="padding:12px 16px;margin:0">Trends for you</h2>${ex.trends.map((t, i) => `<div class="it" style="padding:12px 16px;cursor:pointer" data-go="#/search?q=${encodeURIComponent(t.topic)}"><small class="mute">${i + 1} · ${esc(t.cat)}</small><div><b>${esc(t.topic)}</b></div><small class="mute">${esc(t.posts)} posts</small></div>`).join('')}
    <h2 style="padding:12px 16px;margin:0;border-top:1px solid var(--line)">Hot right now</h2>${hot.slice(0, 8).map(p => postHTML(p)).join('')}`;
}
async function viewSearch(qs) {
  const q = new URLSearchParams(qs).get('q') || '';
  main().innerHTML = `<div class="hdr"><div class="title"><span class="back" data-back>${svg('back')}</span><div style="position:relative;flex:1;font-weight:400">${svg('search')}<input id="eq" value="${esc(q)}" style="width:100%;background:var(--bg2);border:0;border-radius:999px;color:var(--text);font:inherit;padding:10px 16px 10px 44px;outline:0"></div></div></div><div id="ex"><div class="empty">Searching…</div></div>`;
  const s = $('#eq'); s.style.paddingLeft = '44px'; s.previousElementSibling.style.cssText = 'position:absolute;left:14px;top:11px;width:18px;height:18px;color:var(--mute)';
  s.onkeydown = e => { if (e.key === 'Enter') location.hash = '#/search?q=' + encodeURIComponent(s.value.trim()); };
  const r = await api('/search?q=' + encodeURIComponent(q));
  $('#ex').innerHTML = (r.people.length ? `<h2 style="padding:12px 16px;margin:0">People</h2>` + r.people.map(a => `<div class="who2" data-go="#/u/${esc(a.handle)}">${av(a)}<div class="info"><b>${esc(a.name)}${verified(a.verified)}</b><span class="mute">@${esc(a.handle)} · ${compact(a.followers)} followers</span></div></div>`).join('') : '') + (r.posts.map(p => postHTML(p)).join('') || (r.people.length ? '' : '<div class="empty">No results.</div>'));
}

async function viewNotifs() {
  main().innerHTML = `<div class="hdr"><div class="title">Notifications</div></div><div id="nl"><div class="empty">Loading…</div></div>`;
  const rows = await api('/notifs'); badges.notifs = 0; setBadges();
  const who = n => n.name ? `<b>${esc(n.name)}</b>${verified(n.verified)}` : 'Z';
  $('#nl').innerHTML = rows.map(n => {
    const icon = n.type === 'sim' ? `<span style="color:var(--blue)">${svg('clock')}</span>` : n.type === 'verified' ? `<span style="color:var(--blue)">${svg('badge')}</span>` : n.type === 'celeb_dm' ? `<span style="color:var(--blue)">${svg('mail')}</span>` : `<span style="color:var(--pink)">${svg('hearts')}</span>`;
    const label = n.type === 'celeb_reply' ? `${who(n)} replied to you` : n.type === 'quote' ? `${who(n)} posted about you` : n.type === 'reply' ? `${who(n)} replied to your post` : n.type === 'celeb_dm' ? `${who(n)} sent you a message` : '';
    const go = n.type === 'celeb_dm' ? `#/messages/${n.handle}` : n.post_id ? `#/post/${n.post_id}` : '#/home';
    return `<div class="notif" data-go="${go}">${icon}<div>${n.name ? av({ name: n.name, handle: n.handle, pfp: n.pfp }, 's') : ''}<div style="margin-top:6px">${label || esc(n.text)}</div>${label && n.type !== 'celeb_dm' ? `<div class="mute" style="margin-top:4px">${esc(n.text)}</div>` : ''}<div class="mute" style="font-size:13px;margin-top:4px">${ago(n.created)} ago</div></div></div>`;
  }).join('') || '<div class="empty"><b style="font-size:30px;color:var(--text)">Nothing to see here — yet</b><p>Post, comment on big accounts and the world will notice.</p></div>';
}

async function viewMessages(handle) {
  if (handle) return viewChat(handle);
  main().innerHTML = `<div class="hdr"><div class="title">Messages</div></div><div id="dl"><div class="empty">Loading…</div></div>`;
  const rows = await api('/dms');
  $('#dl').innerHTML = rows.map(d => `<div class="dm" data-go="#/messages/${esc(d.handle)}">${av(d)}<div class="info"><div class="head" style="display:flex;gap:4px">${nameLine(d)} <span class="mute">@${esc(d.handle)} · ${ago(d.created)}</span></div><p class="${d.from_user ? 'mute' : ''}" style="${d.unread ? 'font-weight:700' : ''}">${d.from_user ? 'You: ' : ''}${esc(d.text)}</p></div>${d.unread ? '<span class="unread"></span>' : ''}</div>`).join('')
    || '<div class="empty"><b style="font-size:30px;color:var(--text)">Welcome to your inbox!</b><p>Slide into a celeb’s DMs from their profile. The famous ones may leave you on read until you’re somebody.</p></div>';
}
let chatTimer;
async function viewChat(handle) {
  main().innerHTML = '<div class="empty">Loading…</div>';
  const draw = async (first) => {
    if (!location.hash.startsWith('#/messages/')) return;
    const r = await api('/dms/' + handle);
    const a = r.account;
    const last = r.messages[r.messages.length - 1];
    if (first) main().innerHTML = `<div class="hdr"><div class="title"><span class="back" data-back>${svg('back')}</span>${av(a, 's')}<div style="line-height:1.2">${nameLine(a)}<div class="mute" style="font-size:13px;font-weight:400">@${esc(a.handle)}</div></div></div></div><div class="chat"><div class="msgs" id="msgs"></div><div class="chatin"><input id="mi" placeholder="Start a new message" autocomplete="off"><button class="btn" id="ms">Send</button></div></div>`;
    const box = $('#msgs'); if (!box) return;
    const atBottom = first || box.scrollHeight - box.scrollTop - box.clientHeight < 80;
    const sig = r.messages.map(m => m.id).join();
    if (box.dataset.sig !== sig) {
      box.dataset.sig = sig;
      box.innerHTML = (r.messages.map(m => `<div class="m ${m.from_user ? 'me2' : 'th'}">${esc(m.text)}</div>`).join('') || `<div class="empty">No messages yet. Say something to @${esc(a.handle)}.</div>`) + (last && last.from_user ? `<div class="mute" style="align-self:flex-end;font-size:13px">${Date.now() - last.created > 25000 ? 'Delivered' : 'Sent'}</div>` : '');
      if (atBottom) box.scrollTop = box.scrollHeight;
    }
    if (first) {
      const send = async () => { const i = $('#mi'); const t = i.value.trim(); if (!t) return; i.value = ''; await api('/dms/' + handle, 'POST', { text: t }); draw(); };
      $('#ms').onclick = send; $('#mi').onkeydown = e => { if (e.key === 'Enter') send(); }; $('#mi').focus();
    }
  };
  await draw(true);
  clearInterval(chatTimer); chatTimer = setInterval(() => draw(false).catch(() => { }), 3000);
  pollNow();
}

// ---------- import from X ----------
async function readArchive(files) {
  const out = { tweets: [], likes: [], followers: null, name: null, bio: null, username: null, pfp: null, files: [] };
  for (const f of files) {
    const n = f.name.toLowerCase();
    const txt = await f.text();
    const i = txt.indexOf('['); if (i < 0) continue;
    let arr; try { arr = JSON.parse(txt.slice(i)); } catch { continue; }
    if (/^tweets?(-part\d+)?\.js$/.test(n)) { arr.forEach(x => { const t = x.tweet || x; out.tweets.push({ text: t.full_text || t.text, at: t.created_at, likes: +t.favorite_count || 0, rts: +t.retweet_count || 0 }); }); out.files.push(f.name); }
    else if (/^likes?\.js$/.test(n)) { arr.forEach(x => { const l = x.like || x; if (l.fullText) out.likes.push(l.fullText); }); out.files.push(f.name); }
    else if (/^followers?\.js$/.test(n)) { out.followers = arr.length; out.files.push(f.name); }
    else if (n === 'account.js') { const a = arr[0]?.account; if (a) { out.username = a.username; out.name = a.accountDisplayName; out.files.push(f.name); } }
    else if (n === 'profile.js') { const p = arr[0]?.profile; if (p) { out.bio = p.description?.bio; out.pfp = p.avatarMediaUrl; out.files.push(f.name); } }
  }
  return out;
}
async function viewImport() {
  const st = await api('/import/status');
  const profCard = (pr, meta) => `<div class="card" style="margin:12px 16px"><h2>What Z knows about you</h2><div style="padding:0 16px 16px;line-height:1.45">
      <p style="margin-top:0">${esc(pr.summary)}</p>
      ${pr.voice ? `<p><b>How you write:</b> ${esc(pr.voice)}</p>` : ''}${pr.humor ? `<p><b>Humor:</b> ${esc(pr.humor)}</p>` : ''}
      ${(pr.topics || []).length ? `<p><b>Topics:</b> ${pr.topics.map(esc).join(' · ')}</p>` : ''}${(pr.quirks || []).length ? `<p><b>Quirks:</b> ${pr.quirks.map(esc).join(' · ')}</p>` : ''}
      ${meta ? `<p class="mute" style="font-size:13px;margin-bottom:0">Imported ${meta.posts} posts, ${meta.likes} likes, ${Number(meta.followers).toLocaleString()} followers from @${esc(meta.username)} (${meta.source === 'x-api' ? 'X API' : 'X data archive'}). Every AI account now reacts to this.</p>` : ''}</div></div>`;
  const inp = (id, label, val = '', extra = '') => `<label style="display:block;margin:10px 0;color:var(--mute);font-size:13px">${label}<input id="${id}" value="${esc(val)}" ${extra} style="display:block;width:100%;margin-top:4px;background:var(--bg2);border:1px solid var(--line);border-radius:6px;color:var(--text);padding:10px;font:inherit"></label>`;
  main().innerHTML = `<div class="hdr"><div class="title"><span class="back" data-back>${svg('back')}</span>Import from X</div></div>
    ${st.profile ? profCard(st.profile, st.meta) : ''}
    <div class="card" style="margin:12px 16px"><h2>${st.profile ? 'Re-import' : 'Bring your X account to Z'}</h2><div style="padding:0 16px 16px">
      <p class="mute" style="margin-top:0">Your name, username, profile picture, bio, follower count and posts come over, and the AI builds a profile of you so the fake people (and celebs) respond like they know you. Nothing is posted to X.</p>
      <b>1 · Username</b>
      <div style="display:flex;gap:8px;margin:8px 0"><input id="iu" placeholder="@yourusername" value="${esc(st.meta?.username || '')}" style="flex:1;background:var(--bg2);border:1px solid var(--line);border-radius:6px;color:var(--text);padding:10px;font:inherit"><button class="btn" id="ilook">Look up</button></div>
      <div id="iprev" class="mute" style="font-size:13px">${st.xApi ? 'X API connected — public profile and recent posts can be fetched by username.' : 'Without an X API token Z can only fetch your profile picture by username. Add the archive below for everything else.'}</div>
      <hr style="border:0;border-top:1px solid var(--line);margin:16px 0">
      <b>2 · Your X archive <span class="mute" style="font-weight:400">(recommended — gets posts, likes &amp; followers)</span></b>
      <ol class="mute" style="font-size:13px;line-height:1.6;padding-left:18px"><li>On X: <i>Settings → Your account → Download an archive of your data</i>. X emails you a zip within ~24h.</li><li>Unzip it and open the <code>data</code> folder.</li><li>Select these files here (any that exist): <code>tweets.js</code>, <code>like.js</code>, <code>follower.js</code>, <code>account.js</code>, <code>profile.js</code>.</li></ol>
      <input type="file" id="ifiles" multiple accept=".js">
      <div id="iarch" class="mute" style="font-size:13px;margin-top:8px"></div>
      <hr style="border:0;border-top:1px solid var(--line);margin:16px 0">
      <b>3 · Check &amp; import</b>
      ${inp('in', 'Display name', me.name, 'maxlength="30"')}${inp('ib', 'Bio', me.bio || '', 'maxlength="160"')}${inp('if', 'Followers', '', 'type="number" min="0" placeholder="e.g. 4210"')}
      ${st.xApi ? '<label style="display:block;margin:8px 0"><input type="checkbox" id="iapi" checked> Also pull my recent public posts from X by username</label>' : ''}
      <label style="display:block;margin:8px 0"><input type="checkbox" id="iok"> This is my own X account. I’m importing my own data.</label>
      <div style="display:flex;gap:8px;align-items:center"><button class="btn" id="igo">Import</button>${st.profile ? '<button class="btn o" id="iforget">Forget imported data</button>' : ''}<span id="imsg" class="mute"></span></div>
    </div></div>`;
  let arch = null, look = null, pfp = null;
  $('#ilook').onclick = async () => {
    const u = $('#iu').value.trim(); if (!u) return;
    $('#iprev').textContent = 'Looking up…';
    try {
      look = await api('/import/lookup', 'POST', { username: u }); pfp = look.pfp;
      $('#iprev').innerHTML = `<div style="display:flex;gap:12px;align-items:center;color:var(--text)">${av({ name: look.name || u, handle: u, pfp: look.pfp })}<div><b>${esc(look.name || '@' + look.username)}</b><div class="mute">@${esc(look.username)}${look.followers != null ? ' · ' + look.followers.toLocaleString() + ' followers' : ''}${look.posts.length ? ' · ' + look.posts.length + ' recent posts found' : ''}</div></div></div>${look.postsError ? '<div class="mute">' + esc(look.postsError) + '</div>' : ''}`;
      if (look.name) $('#in').value = look.name; if (look.bio) $('#ib').value = look.bio; if (look.followers != null) $('#if').value = look.followers;
    } catch (e) { $('#iprev').textContent = e.message; }
  };
  $('#ifiles').onchange = async e => {
    arch = await readArchive([...e.target.files]);
    $('#iarch').textContent = arch.files.length ? `Read ${arch.files.join(', ')} → ${arch.tweets.length} posts, ${arch.likes.length} likes${arch.followers != null ? ', ' + arch.followers.toLocaleString() + ' followers' : ''}.` : 'No recognised archive files found.';
    if (arch.username && !$('#iu').value) $('#iu').value = arch.username;
    if (arch.name) $('#in').value = arch.name; if (arch.bio) $('#ib').value = arch.bio; if (arch.followers != null) $('#if').value = arch.followers;
    if (arch.pfp) pfp = arch.pfp;
  };
  $('#igo').onclick = async () => {
    const btn = $('#igo'); btn.disabled = true; $('#imsg').textContent = 'Importing and reading your posts… (about 10 seconds)';
    try {
      const r = await api('/import', 'POST', {
        username: $('#iu').value, name: $('#in').value, bio: $('#ib').value, followers: +$('#if').value || 0, pfp, confirm: $('#iok').checked,
        tweets: arch ? arch.tweets : (look?.posts || []), likes: arch ? arch.likes : [], source: arch ? 'archive' : 'x-api', useApi: $('#iapi')?.checked,
      });
      me = await api('/me'); renderMe(); $('#profnav').href = '#/u/' + me.handle; refreshRight().catch(() => { });
      toast('✅ Imported — the AI knows you now'); viewImport();
    } catch (e) { $('#imsg').textContent = e.message; btn.disabled = false; }
  };
  const fg = $('#iforget'); if (fg) fg.onclick = async () => { if (confirm('Remove imported posts and your AI profile?')) { await api('/import/forget', 'POST'); me = await api('/me'); refreshRight().catch(() => { }); viewImport(); } };
}

// ---------- sim ----------
let simTimer;
async function viewSim() {
  main().innerHTML = `<div class="hdr"><div class="title">Sim</div></div><div id="simbody"><div class="empty">Loading…</div></div>`;
  let cast = await api('/sim/cast');
  let wasRunning = false, built = false;
  const field = (id, label, val, step = 1, w = 90) => `<label style="display:flex;flex-direction:column;gap:4px;font-size:13px;color:var(--mute)">${label}<input id="${id}" type="number" step="${step}" min="0" value="${val}" style="width:${w}px;background:var(--bg2);border:1px solid var(--line);border-radius:6px;color:var(--text);padding:8px;font:inherit"></label>`;
  const draw = async () => {
    if (!location.hash.startsWith('#/sim')) return clearInterval(simTimer);
    const st = await api('/sim');
    const box = $('#simbody'); if (!box) return;
    const S = st.settings;
    const pct = st.total ? Math.round(st.done / st.total * 100) : 0;
    // live panel (rebuilt each poll except the inputs section, which is built once)
    if (!built) {
      built = true;
      box.innerHTML = `<div id="simlive"></div>
        <div class="card" style="margin:12px 16px"><h2>Live speed</h2><div style="padding:0 16px 16px">
          <p class="mute" style="margin-top:0">Each account has its own posts/day and replies/day (below). These multipliers speed up the whole world: <b>1×</b> = real time, <b>60×</b> ≈ one sim-hour per real minute. Higher = more API usage.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">${[['Real time', 1], ['Chill', 6], ['Busy', 30], ['Hectic', 120], ['Turbo', 400]].map(([l, v]) => `<button class="btn o" data-preset="${v}">${l} ×${v}</button>`).join('')}</div>
          <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:end">${field('s_post', 'Post speed ×', S.postMult)}${field('s_reply', 'Reply speed ×', S.replyMult)}${field('s_mpt', 'Max posts / tick', S.maxPerTick)}${field('s_mrt', 'Max replies / tick', S.maxRepliesPerTick)}</div>
          <div style="display:flex;gap:20px;margin-top:14px;flex-wrap:wrap"><label><input type="checkbox" id="s_pause" ${S.paused ? 'checked' : ''}> Pause AI accounts</label><label><input type="checkbox" id="s_idle" ${S.idlePause ? 'checked' : ''}> Auto-pause when nobody’s online (saves API credits)</label></div>
          <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:end;margin-top:14px">${field('s_sb', 'Fast-forward: posts per run', S.simBudget, 10, 130)}${field('s_srb', 'Fast-forward: replies per run', S.simReplyBudget, 10, 130)}<button class="btn" id="s_save">Save</button></div></div></div>
        <div class="card" style="margin:12px 16px"><h2>Cast <span class="mute" style="font-size:14px;font-weight:400">· per-account frequency</span></h2><div style="padding:0 16px 8px;display:flex;gap:8px"><input id="cfilter" placeholder="Filter accounts…" style="flex:1;background:var(--bg2);border:1px solid var(--line);border-radius:999px;color:var(--text);padding:8px 14px;font:inherit"><button class="btn o" id="creset">Reset all</button></div><div id="castlist"></div></div>`;
      $('#s_save').onclick = async () => { await api('/sim/settings', 'POST', { postMult: +$('#s_post').value, replyMult: +$('#s_reply').value, maxPerTick: +$('#s_mpt').value, maxRepliesPerTick: +$('#s_mrt').value, paused: $('#s_pause').checked, idlePause: $('#s_idle').checked, simBudget: +$('#s_sb').value, simReplyBudget: +$('#s_srb').value }); toast('Sim settings saved'); };
      box.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => { $('#s_post').value = $('#s_reply').value = b.dataset.preset; $('#s_save').click(); });
      $('#creset').onclick = async () => { await api('/sim/cast-reset', 'POST'); cast = await api('/sim/cast'); drawCast(); toast('Frequencies reset to defaults'); };
      $('#cfilter').oninput = drawCast;
      drawCast();
    }
    $('#simlive').innerHTML = `<div class="card" style="margin:12px 16px"><div style="padding:16px">
        <div style="display:flex;justify-content:space-between;align-items:baseline"><div><span class="mute">World clock</span><div style="font-size:32px;font-weight:800">Day ${st.day + 1}</div></div>
        <div class="mute" style="text-align:right;font-size:13px">${st.stats.cast} accounts · ${st.stats.npcs} commenters · ${st.stats.posts.toLocaleString()} posts<br>${st.ai ? 'AI: ' + esc(st.model) : '<span style="color:var(--pink)">AI offline (no API key) — canned text</span>'}</div></div>
        ${st.running ? `<div style="margin-top:12px"><b>${esc(st.phase || 'Working')}…</b> <span class="mute">${st.total ? st.done + '/' + st.total : ''}</span><div class="bar" style="height:8px;background:var(--bg);border-radius:4px;overflow:hidden;margin-top:6px"><i style="display:block;height:100%;width:${Math.max(4, pct)}%;background:linear-gradient(90deg,var(--blue),var(--pink))"></i></div></div>` : ''}
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">${[[0.25, '+6 hours'], [1, '+1 day'], [7, '+1 week'], [14, '+2 weeks'], [30, '+1 month']].map(([d, l]) => `<button class="btn" data-adv="${d}" ${st.running ? 'disabled' : ''}>${l}</button>`).join('')}</div>
        <div style="display:flex;gap:10px;align-items:center;margin-top:12px;flex-wrap:wrap"><button class="btn ${st.auto.on ? 'w' : 'o'}" id="autob">${st.auto.on ? '■ Stop simulating' : '▶ Keep simulating'}</button>
          <label class="mute">step <select id="autod" style="background:var(--bg2);color:var(--text);border:1px solid var(--line);border-radius:6px;padding:6px">${[[0.25, '6 hours'], [1, '1 day'], [7, '1 week']].map(([d, l]) => `<option value="${d}" ${st.auto.days === d ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          ${st.running ? '<button class="btn o" id="stopb">Cancel</button>' : ''}</div>
        <p class="mute" style="font-size:13px;margin:12px 0 0">Fast-forwarding moves everyone’s clock forward: existing posts age (their likes finish climbing), and the AI accounts write what they posted during the skipped time and reply to each other. It affects the whole world — and you: new followers can roll in while time passes. ${st.last ? `<br>Last run: <b>${st.last.days}d</b> → +${st.last.posts} posts, +${st.last.replies} replies in ${st.last.seconds}s.` : ''}</p></div></div>
      ${st.log.length ? `<div class="mute" style="margin:0 16px 12px;font-size:13px;line-height:1.6">${st.log.slice(0, 6).map(esc).join('<br>')}</div>` : ''}`;
    $('#simlive').querySelectorAll('[data-adv]').forEach(b => b.onclick = async () => { await api('/sim/advance', 'POST', { days: +b.dataset.adv }); draw(); });
    $('#autob').onclick = async () => { await api('/sim/auto', 'POST', { on: !st.auto.on, days: +$('#autod').value }); draw(); };
    const sb = $('#stopb'); if (sb) sb.onclick = async () => { await api('/sim/stop', 'POST'); draw(); };
    if (wasRunning && !st.running) { toast('⏩ Simulation step finished — check your feed'); api('/explore').catch(() => { }); refreshRight().catch(() => { }); }
    wasRunning = st.running;
  };
  function drawCast() {
    const f = ($('#cfilter')?.value || '').toLowerCase();
    $('#castlist').innerHTML = cast.filter(c => !f || c.handle.toLowerCase().includes(f) || c.name.toLowerCase().includes(f)).map(c => `<div class="who2" style="border-top:1px solid var(--line)">${av(c, 's')}<div class="info"><b>${esc(c.name)}${verified(c.verified)}${c.tuned ? ' <span class="mute" style="font-weight:400;font-size:12px">· edited</span>' : ''}</b><span class="mute">@${esc(c.handle)} · ${compact(c.followers)} · ${c.posts} posts</span></div>
      <label class="mute" style="font-size:12px;text-align:center">posts/day<input data-ppd="${esc(c.handle)}" type="number" step="0.5" min="0" value="${c.ppd}" style="display:block;width:70px;background:var(--bg2);border:1px solid var(--line);border-radius:6px;color:var(--text);padding:6px"></label>
      <label class="mute" style="font-size:12px;text-align:center">replies/day<input data-rpd="${esc(c.handle)}" type="number" step="0.5" min="0" value="${c.rpd}" style="display:block;width:70px;background:var(--bg2);border:1px solid var(--line);border-radius:6px;color:var(--text);padding:6px"></label></div>`).join('') || '<div class="empty">No matches.</div>';
    $('#castlist').querySelectorAll('input').forEach(i => i.onchange = async () => {
      const h = i.dataset.ppd || i.dataset.rpd;
      const row = $('#castlist').querySelector(`[data-ppd="${h}"]`), row2 = $('#castlist').querySelector(`[data-rpd="${h}"]`);
      await api('/sim/cast/' + h, 'POST', { ppd: +row.value, rpd: +row2.value });
      const c = cast.find(x => x.handle === h); c.ppd = +row.value; c.rpd = +row2.value; c.tuned = true; toast(`@${h}: ${row.value} posts/day, ${row2.value} replies/day`);
    });
  }
  await draw();
  clearInterval(simTimer); simTimer = setInterval(() => draw().catch(() => { }), 2500);
}

// ---------- routing ----------
async function route() {
  clearInterval(chatTimer); clearTimeout(window._rt);
  const h = location.hash || '#/home';
  const [path, qs] = h.slice(1).split('?');
  const seg = path.split('/').filter(Boolean);
  document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === (seg[0] === 'u' ? (seg[1]?.toLowerCase() === me.handle.toLowerCase() ? 'profile' : '') : seg[0] === 'search' ? 'explore' : seg[0] || 'home')));
  window.scrollTo(0, 0);
  try {
    if (!seg.length || seg[0] === 'home') await viewHome();
    else if (seg[0] === 'explore') await viewExplore();
    else if (seg[0] === 'search') await viewSearch(qs);
    else if (seg[0] === 'notifications') await viewNotifs();
    else if (seg[0] === 'messages') await viewMessages(seg[1]);
    else if (seg[0] === 'post') await viewPost(seg[1]);
    else if (seg[0] === 'sim') await viewSim();
    else if (seg[0] === 'import') await viewImport();
    else if (seg[0] === 'u') await viewProfile(seg[1], seg[2]);
    else await viewHome();
  } catch (e) { console.error(e); if (e.message !== 'auth') main().innerHTML = '<div class="empty">Something went wrong. Try again.</div>'; }
}

// ---------- global actions ----------
document.addEventListener('click', async e => {
  const t = e.target;
  const act = t.closest('[data-act]');
  if (act) {
    e.stopPropagation(); e.preventDefault();
    const id = +act.dataset.id, p = posts.get(id);
    const k = act.dataset.act;
    if (k === 'lk' && p) { p.liked = !p.liked; refreshBtns(id); api('/like/' + id, 'POST'); }
    else if (k === 'rt' && p) { p.reposted = !p.reposted; refreshBtns(id); api('/repost/' + id, 'POST'); }
    else if (k === 'rp') location.hash = '#/post/' + id;
    else if (k === 'share') { navigator.clipboard?.writeText(location.origin + '/#/post/' + id); toast('Copied link to post'); }
    return;
  }
  const f = t.closest('[data-follow]');
  if (f) { e.stopPropagation(); e.preventDefault(); const r = await api('/follow/' + f.dataset.follow, 'POST'); f.textContent = r.following ? 'Following' : 'Follow'; f.className = 'btn ' + (r.following ? 'o' : 'w'); return; }
  const dm = t.closest('[data-dm]');
  if (dm) { location.hash = '#/messages/' + dm.dataset.dm; return; }
  if (t.closest('[data-back]')) { history.length > 1 ? history.back() : (location.hash = '#/home'); return; }
  if (t.closest('a')) return;
  const go = t.closest('[data-go]');
  if (go && !window.getSelection().toString()) location.hash = go.dataset.go;
});
function refreshBtns(id) {
  const p = posts.get(id);
  document.querySelectorAll(`[data-act="lk"][data-id="${id}"]`).forEach(b => { b.classList.toggle('on', p.liked); b.querySelector('path').setAttribute('d', p.liked ? I.hearts : I.heart); });
  document.querySelectorAll(`[data-act="rt"][data-id="${id}"]`).forEach(b => b.classList.toggle('on', p.reposted));
  tickLive();
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') $('.modal')?.remove(); });
window.addEventListener('hashchange', route);

// ---------- polling ----------
let pollBusy = false;
async function pollNow() {
  if (!token || !me || pollBusy) return; pollBusy = true;
  try {
    const r = await api('/poll');
    if (r.notifs > badges.notifs || r.dms > badges.dms) { if (r.dms > badges.dms) toast('✉️ New message'); }
    badges = { notifs: r.notifs, dms: r.dms }; setBadges();
    if (r.followers !== me.followers) {
      const gained = r.followers - me.followers;
      me.followers = r.followers;
      const n = $('#fameN'); if (n) n.textContent = r.followers.toLocaleString();
      const pf = $('#pf'); if (pf && location.hash.startsWith('#/u/' + me.handle)) pf.textContent = r.followers.toLocaleString();
      if (r.verified === 'blue' && me.verified !== 'blue') { me.verified = 'blue'; renderMe(); toast('✔ You are verified! You reached 1,000,000 followers.'); }
      if (gained > 0 && Math.random() < 0.3) refreshRight().catch(() => { });
    }
  } catch { } pollBusy = false;
}

// ---------- boot ----------
function signup() {
  $('#app').innerHTML = `<div class="signup"><div style="color:#fff">${svg('logo').replace('<svg', '<svg style="width:56px;height:56px"')}</div><h1>See what’s happening</h1>
    <p class="mute">Join Z — everyone here is AI except you. Get famous. Get verified.</p>
    <input id="sn" placeholder="Name" maxlength="30"><input id="sh" placeholder="@handle" maxlength="15">
    <div class="err" id="se"></div><button class="btn w" style="width:100%;padding:14px;font-size:16px" id="sb">Create account</button>
    <p class="mute" style="font-size:13px;margin-top:20px">Parody. All other accounts and posts are AI-generated fiction.</p></div>`;
  const go = async () => {
    try { const r = await api('/signup', 'POST', { name: $('#sn').value, handle: $('#sh').value.replace(/^@/, '') }); token = r.token; localStorage.setItem('z_token', token); boot(); }
    catch (e) { $('#se').textContent = e.message === 'error' ? 'Try another handle' : e.message; }
  };
  $('#sb').onclick = go; $('#sh').onkeydown = e => e.key === 'Enter' && go();
}
async function boot() {
  if (!token) return signup();
  try { me = await api('/me'); } catch { return signup(); }
  shell();
  refreshRight().catch(() => { });
  await route();
  pollNow(); setInterval(pollNow, 12000);
  setInterval(() => refreshRight().catch(() => { }), 120000);
}
boot();
