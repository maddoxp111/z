// Z — main: shell (nav / right rail), router, global actions, polling, boot
const NAV = [['home', 'Home', 'home', 'homeF', '#/home'], ['explore', 'Explore', 'search', 'search', '#/explore'], ['notifications', 'Notifications', 'bell', 'bellF', '#/notifications'], ['messages', 'Messages', 'mail', 'mailF', '#/messages'], ['bookmarks', 'Bookmarks', 'bookmark', 'bookmarkF', '#/bookmarks']];
function shell() {
  $('#app').innerHTML = `<div class="layout">
  <header class="left"><div class="lcol">
    <a class="logo" href="#/home" aria-label="Z">${svg('logo')}</a>
    <nav class="nav">${NAV.map(([k, l, i, f, h]) => `<a href="${h}" data-nav="${k}" data-i="${i}" data-f="${f}">${svg(i)}<span>${l}</span>${k === 'notifications' ? '<i class="badge" id="nb" hidden></i>' : k === 'messages' ? '<i class="badge" id="mb" hidden></i>' : ''}</a>`).join('')}
      <a id="profnav" href="#/u/${me.handle}" data-nav="profile" data-i="user" data-f="userF">${svg('user')}<span>Profile</span></a>
      <button id="morebtn" class="navbtn">${svg('more')}<span>More</span></button></nav>
    <button class="postbtn" id="postbtn"><span>Post</span>${svg('compose')}</button></div>
    <button class="me" id="meBox" aria-label="Account menu"></button></header>
  <main class="main" id="main"></main>
  <aside class="right" id="right"></aside></div>
  <nav class="mobnav">${NAV.slice(0, 4).map(([k, l, i, f, h]) => `<a href="${h}" data-nav="${k}" data-i="${i}" data-f="${f}">${svg(i)}</a>`).join('')}</nav>
  <button class="fab" id="fab" aria-label="Post">${svg('compose')}</button>`;
  renderMe();
  $('#postbtn').onclick = () => openComposeModal(); $('#fab').onclick = () => openComposeModal();
  $('#morebtn').onclick = e => openMenu(e.currentTarget, [
    { icon: 'clock', label: 'Sim (fast-forward the world)', onClick: () => location.hash = '#/sim' },
    { icon: 'person', label: 'Import your X account', onClick: () => location.hash = '#/import' },
    { icon: 'bookmark', label: 'Bookmarks', onClick: () => location.hash = '#/bookmarks' },
  ], { align: 'left' });
  $('#meBox').onclick = e => openMenu(e.currentTarget, [
    { icon: 'out', label: `Log out @${esc(me.handle)}`, onClick: () => { localStorage.removeItem('z_token'); sessionStorage.clear(); location.hash = ''; location.reload(); } },
  ], { align: 'left' });
}
function renderMe() {
  $('#meBox').innerHTML = `${av(me, 's40')}<div class="who"><b>${esc(me.name)}${verified(me.verified)}</b><span class="mute">@${esc(me.handle)}</span></div>${svg('dots', 'dots')}`;
}
function setBadges() {
  const s = (id, n) => { const e = $(id); if (e) { e.hidden = !n; e.textContent = n > 99 ? '99+' : n; } };
  s('#nb', badges.notifs); s('#mb', badges.dms);
}
async function refreshRight() {
  const ex = await api('/explore');
  const goal = me.verify_at, pct = Math.min(100, (me.followers / goal) * 100);
  const el = $('#right'); if (!el) return;
  const keep = $('#sq')?.value || '';
  el.innerHTML = `
    <div class="sbox stick"><div class="sfield">${svg('search')}<input id="sq" placeholder="Search" autocomplete="off" value="${esc(keep)}"><div class="sdrop" id="sdrop" hidden></div></div></div>
    <section class="card"><h2>Your fame</h2><div class="cpad"><div><b class="big" id="fameN">${me.followers.toLocaleString()}</b> <span class="mute">followers</span></div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <div class="mute small">${me.verified === 'blue' ? 'You’re verified ✔ — you made it.' : `${compact(goal - me.followers)} to go until you’re verified (${compact(goal)})`}</div>
      <a class="tag small" href="#/import">Import your X account →</a></div></section>
    <section class="card"><h2>What’s happening</h2>${ex.trends.slice(0, 5).map(t => `<div class="trend" data-go="#/search?q=${encodeURIComponent(t.topic)}"><div class="tc mute">${esc(t.cat)}</div><div class="tn">${esc(t.topic)}</div><div class="mute tp">${esc(t.posts)} posts</div></div>`).join('')}<a class="showmore" href="#/explore">Show more</a></section>
    <section class="card"><h2>Who to follow</h2>${ex.suggest.map(a => userRowHTML(a, { following: false })).join('')}<a class="showmore" href="#/explore">Show more</a></section>
    <footer class="foot">Z is a parody. Every account except yours is AI-generated fiction — nothing here is real, said, or endorsed by anyone named. Names, handles and photos mirror public X profiles for the fun of it. <span class="mute">© 2026 Z</span></footer>`;
  const sq = $('#sq'), dd = $('#sdrop'); let t;
  sq.onkeydown = e => { if (e.key === 'Enter' && sq.value.trim()) { dd.hidden = true; location.hash = '#/search?q=' + encodeURIComponent(sq.value.trim()); } };
  sq.oninput = () => { clearTimeout(t); const q = sq.value.trim(); if (!q) { dd.hidden = true; return; } t = setTimeout(async () => {
    const r = await api('/search?q=' + encodeURIComponent(q)).catch(() => null); if (!r) return;
    dd.innerHTML = `<div class="sitem" data-go="#/search?q=${encodeURIComponent(q)}">${svg('search')}<span>Search for “${esc(q)}”</span></div>` + r.people.slice(0, 5).map(a => `<div class="sitem p" data-go="#/u/${esc(a.handle)}">${av(a, 's')}<div class="info"><div class="nl"><b>${esc(a.name)}</b>${verified(a.verified)}</div><div class="mute">@${esc(a.handle)}</div></div></div>`).join('');
    dd.hidden = false; }, 200); };
  sq.onfocus = () => { if (dd.innerHTML) dd.hidden = false; };
  document.addEventListener('mousedown', e => { if (!e.target.closest('.sfield')) dd.hidden = true; });
}

// ---------- routing ----------
async function route() {
  if (!me || !$('#main')) return; // shell not built yet (e.g. hashchange fired mid-signup)
  clearTimeout(chatTimer); clearInterval(simTimer); clearTimeout(window._rt); closeMenu();
  const h = location.hash || '#/home';
  const [path, qs] = h.slice(1).split('?');
  const seg = path.split('/').filter(Boolean);
  const cur = !seg.length ? 'home' : seg[0] === 'u' ? (seg[1]?.toLowerCase() === me.handle.toLowerCase() ? 'profile' : '') : seg[0] === 'search' ? 'explore' : seg[0] === 'sim' || seg[0] === 'import' ? '' : seg[0];
  $$('[data-nav]').forEach(a => { const on = a.dataset.nav === cur; a.classList.toggle('on', on); const p = a.querySelector('svg path'); if (p) p.setAttribute('d', I[on ? a.dataset.f : a.dataset.i]); });
  document.body.classList.toggle('dm', seg[0] === 'messages');
  if (seg[0] !== 'messages') { document.body.classList.remove('dm'); }
  window.scrollTo(0, 0);
  try {
    if (!seg.length || seg[0] === 'home') await viewHome();
    else if (seg[0] === 'explore') await viewExplore();
    else if (seg[0] === 'search') await viewSearch(qs);
    else if (seg[0] === 'notifications') await viewNotifs();
    else if (seg[0] === 'messages') await viewMessages(seg[1]);
    else if (seg[0] === 'bookmarks') await viewBookmarks();
    else if (seg[0] === 'post') await viewPost(seg[1]);
    else if (seg[0] === 'sim') await viewSim();
    else if (seg[0] === 'import') await viewImport();
    else if (seg[0] === 'u') await viewProfile(seg[1], seg[2]);
    else await viewHome();
  } catch (e) { console.error(e); if (e.message !== 'auth') main().innerHTML = emptyState('Something went wrong', 'Try reloading.'); }
}
window.addEventListener('hashchange', route);

// ---------- global actions ----------
const copyLink = id => { navigator.clipboard?.writeText(`${location.origin}/#/post/${id}`); toast('Copied to clipboard'); };
document.addEventListener('click', async e => {
  const t = e.target;
  const act = t.closest('[data-act]');
  if (act) {
    e.stopPropagation(); e.preventDefault();
    const id = +act.dataset.id, p = posts.get(id), k = act.dataset.act;
    if (!p && k !== 'vw') return;
    if (k === 'lk') { p.liked = !p.liked; refreshBtns(id); api('/like/' + id, 'POST').catch(() => { }); }
    else if (k === 'bm') { p.bookmarked = !p.bookmarked; refreshBtns(id); api('/bookmark/' + id, 'POST').then(() => p.bookmarked && toast('Added to your Bookmarks')).catch(() => { }); }
    else if (k === 'rt') openMenu(act, [
      { icon: 'rt', label: p.reposted ? 'Undo repost' : 'Repost', onClick: () => { p.reposted = !p.reposted; refreshBtns(id); api('/repost/' + id, 'POST').catch(() => { }); } },
      { icon: 'compose', label: 'Quote', onClick: () => openComposeModal({ quote: p }) }], { align: 'left' });
    else if (k === 'rp') openComposeModal({ parent: p });
    else if (k === 'sh') openMenu(act, [
      { icon: 'link', label: 'Copy link', onClick: () => copyLink(id) },
      { icon: 'bookmark', label: p.bookmarked ? 'Remove from Bookmarks' : 'Bookmark', onClick: () => { p.bookmarked = !p.bookmarked; refreshBtns(id); api('/bookmark/' + id, 'POST'); } }]);
    else if (k === 'menu') openMenu(act, [
      !p.mine && { icon: 'person', label: `Follow @${esc(p.author.handle)}`, onClick: async () => { const r = await api('/follow/' + p.author.handle, 'POST'); if (!r.following) await api('/follow/' + p.author.handle, 'POST'); toast(`You followed @${p.author.handle}`); } },
      { icon: 'link', label: 'Copy link to post', onClick: () => copyLink(id) },
      p.mine && { icon: 'trash', label: 'Delete', danger: true, onClick: async () => { if (!confirm('Delete this post?')) return; await api('/post/' + id, 'DELETE'); $$(`[data-pid="${id}"]`).forEach(x => x.remove()); if (location.hash.startsWith('#/post/' + id)) history.back(); toast('Your post was deleted'); } }]);
    return;
  }
  const f = t.closest('[data-follow]');
  if (f) {
    e.stopPropagation(); e.preventDefault();
    const r = await api('/follow/' + f.dataset.follow, 'POST'); f.classList.toggle('on', r.following);
    $$(`[data-follow="${CSS.escape(f.dataset.follow)}"]`).forEach(b => b.classList.toggle('on', r.following));
    if (r.following) toast(`You followed @${f.dataset.follow}`); return;
  }
  const dm = t.closest('[data-dm]'); if (dm) { location.hash = '#/messages/' + dm.dataset.dm; return; }
  if (t.closest('[data-back]')) { history.length > 1 ? history.back() : (location.hash = '#/home'); return; }
  if (t.closest('a, button, input, textarea, label, .compose')) return;
  const go = t.closest('[data-go]');
  if (go && !window.getSelection().toString()) location.hash = go.dataset.go;
});

// ---------- polling ----------
let pollBusy = false;
async function pollNow() {
  if (!token || !me || pollBusy) return; pollBusy = true;
  try {
    const r = await api('/poll');
    if (r.dms > badges.dms) toast('✉️ New message');
    badges = { notifs: r.notifs, dms: r.dms }; setBadges();
    if (r.followers !== me.followers) {
      const gained = r.followers - me.followers; me.followers = r.followers;
      const n = $('#fameN'); if (n) n.textContent = r.followers.toLocaleString();
      const pf = $('#pf'); if (pf && location.hash.startsWith('#/u/' + me.handle)) pf.textContent = r.followers < 1e4 ? r.followers.toLocaleString() : compact(r.followers);
      if (r.verified === 'blue' && me.verified !== 'blue') { me.verified = 'blue'; renderMe(); toast('✔ You are verified! You reached 1,000,000 followers.'); }
      if (gained > 0) refreshRight().catch(() => { });
    }
  } catch { } pollBusy = false;
}

// ---------- boot ----------
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
