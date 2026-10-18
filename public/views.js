// Z — views: Home, Post, Profile, Explore, Search, Notifications, Messages, Bookmarks
const main = () => $('#main');
const setTitle = t => { document.title = (badges.notifs + badges.dms ? `(${badges.notifs + badges.dms}) ` : '') + t + ' / Z'; };
const hdrBack = (title, sub = '', right = '') => `<div class="hdr"><div class="title"><button class="iconbtn" data-back aria-label="Back">${svg('back')}</button><div class="tt"><div class="t1">${title}</div>${sub ? `<div class="t2 mute">${sub}</div>` : ''}</div>${right}</div></div>`;
const emptyState = (h, p) => `<div class="empty"><div class="eh">${h}</div><p>${p}</p></div>`;

// ---------- Home ----------
let homeCache = null, feedTimer = null, io = null;
window.onPosted = (p, parent) => {
  posts.set(p.id, p);
  const h = location.hash || '#/home';
  if (parent && h.startsWith('#/post/' + parent.id)) { $('#replies')?.insertAdjacentHTML('afterbegin', `<div class="thread">${postHTML(p)}</div>`); return; }
  if (!parent && (h === '#/home' || h === '#/' || h === '')) { $('#feed')?.insertAdjacentHTML('afterbegin', postHTML(p)); return; }
  toast(parent ? 'Your reply was sent' : 'Your post was sent');
};
async function viewHome() {
  const tab = sessionStorage.getItem('z_tab') || 'foryou';
  setTitle('Home');
  main().innerHTML = `<div class="hdr tabsbar"><div class="tabs"><a data-tab="foryou" class="${tab === 'foryou' ? 'on' : ''}"><span>For you</span></a><a data-tab="following" class="${tab === 'following' ? 'on' : ''}"><span>Following</span></a></div></div>
    ${composeHTML({ id: 'homec' })}<div id="newpill"></div><div id="feed">${skeleton(6)}</div><div id="sentinel"></div>`;
  $$('[data-tab]', main()).forEach(a => a.onclick = () => { if (a.dataset.tab !== tab) { sessionStorage.setItem('z_tab', a.dataset.tab); homeCache = null; viewHome(); } else scrollTo({ top: 0, behavior: 'smooth' }); });
  wireCompose($('#homec'));
  const feed = $('#feed');
  let list = [], loading = false, done = false;
  const draw = (arr, append) => {
    const h = arr.map(p => postHTML(p)).join('');
    if (append) feed.insertAdjacentHTML('beforeend', h); else feed.innerHTML = h || emptyState(tab === 'following' ? 'Welcome to your timeline' : 'Nothing here yet', tab === 'following' ? 'Follow accounts and their posts will show up here.' : 'The accounts are warming up…');
  };
  const load = async (before) => {
    if (loading || done) return; loading = true;
    try { const r = await api(`/feed?tab=${tab}${before ? '&before=' + before : ''}`); if (r.length < 25) done = true; draw(r, !!before); list = list.concat(r); }
    finally { loading = false; }
  };
  await load();
  homeNewest = list[0]?.created || 0;
  io?.disconnect(); io = new IntersectionObserver(es => { if (es[0].isIntersecting && list.length) load(list[list.length - 1].created); }, { rootMargin: '600px' }); io.observe($('#sentinel'));
  clearInterval(feedTimer);
  feedTimer = setInterval(async () => {
    if (!(location.hash === '' || location.hash === '#/home' || location.hash === '#/')) return clearInterval(feedTimer);
    const fresh = await api('/feed?tab=' + tab).catch(() => []);
    const n = fresh.filter(p => p.created > homeNewest).length;
    if (n && $('#newpill')) { $('#newpill').innerHTML = `<button class="pill">Show ${n} post${n > 1 ? 's' : ''}</button>`; $('#newpill .pill').onclick = () => { scrollTo(0, 0); viewHome(); }; }
  }, 20000);
}
let homeNewest = 0;

// ---------- Post detail ----------
async function viewPost(id) {
  main().innerHTML = hdrBack('Post') + `<div class="empty-pad">${skeleton(2)}</div>`;
  let data;
  try { data = await api('/post/' + id); } catch { main().innerHTML = hdrBack('Post') + emptyState('Hmm...this page doesn’t exist.', 'Try searching for something else.'); return; }
  const { post, ancestors } = data; posts.set(post.id, post);
  const a = post.author;
  setTitle(`${a.name} on Z: “${post.text.slice(0, 50)}${post.text.length > 50 ? '…' : ''}”`);
  const detail = `<article class="detail"><div class="dhead"><a href="#/u/${esc(a.handle)}">${av(a)}</a><div class="dnames"><a href="#/u/${esc(a.handle)}" class="nm">${nameLine(a)}</a><div class="mute">@${esc(a.handle)}</div></div><button class="menu-btn" data-act="menu" data-id="${post.id}" aria-label="More">${svg('dots')}</button></div>
    ${post.reply_to ? `<div class="mute rto" style="margin-top:12px">Replying to <a class="tag" href="#/u/${esc(post.reply_to)}">@${esc(post.reply_to)}</a></div>` : ''}
    <div class="dtxt">${linkify(post.text)}</div>${post.quoted ? quoteHTML(post.quoted) : ''}
    <div class="dmeta mute">${fullTime(post.created)} · <b data-detail="views" data-id="${post.id}">${count(post, 'views').toLocaleString()}</b> Views</div>
    <div class="dcounts"><span><b data-detail="reposts" data-id="${post.id}">${count(post, 'reposts').toLocaleString()}</b> <span class="mute">Reposts</span></span><span><b data-detail="likes" data-id="${post.id}">${count(post, 'likes').toLocaleString()}</b> <span class="mute">Likes</span></span><span><b data-detail="bookmarks" data-id="${post.id}">${count(post, 'bookmarks')}</b> <span class="mute">${count(post, 'bookmarks') === 1 ? 'Bookmark' : 'Bookmarks'}</span></span></div>
    ${actsHTML(post, true)}</article>`;
  main().innerHTML = hdrBack('Post') + ancestors.map(p => postHTML(p, { line: true })).join('') + detail +
    composeHTML({ placeholder: 'Post your reply', btn: 'Reply', id: 'rc' }) + `<div id="replies">${skeleton(4)}</div>`;
  wireCompose($('#rc'), { parent_id: post.id, onDone: p => window.onPosted(p, post) });
  const R = $('#replies');
  const draw = r => {
    R.innerHTML = r.replies.map(c => `<div class="thread">${postHTML(c, { line: c.children.length > 0 })}${c.children.map((k, i) => postHTML(k, { last: i === c.children.length - 1 })).join('')}</div>`).join('')
      + (r.can_more ? '<button class="more" id="moreR">Show more replies</button>' : '') || emptyState('No replies yet', 'Be the first to reply.');
    const mb = $('#moreR'); if (mb) mb.onclick = async () => { mb.textContent = 'Loading…'; draw(await api(`/post/${id}/replies?more=1`)); };
  };
  api(`/post/${id}/replies`).then(draw).catch(() => { R.innerHTML = emptyState('Something went wrong', 'Try reloading.'); });
  const refresh = async () => { if (!location.hash.startsWith('#/post/' + id)) return; try { const r = await api(`/post/${id}/replies`); if (!$('#rc textarea')?.value) draw(r); } catch { } window._rt = setTimeout(refresh, 15000); };
  window._rt = setTimeout(refresh, 15000);
}

// ---------- Profile ----------
async function viewProfile(handle, tab = 'posts') {
  main().innerHTML = hdrBack('', '') + `<div class="banner shimmer"></div><div class="empty-pad">${skeleton(3)}</div>`;
  let r;
  try { r = await api(`/profile/${handle}?tab=${tab}`); } catch { main().innerHTML = hdrBack('Profile') + `<div class="banner"></div><div class="prof"><div class="av l def">${SIL}</div><h1>@${esc(handle)}</h1></div>` + emptyState('This account doesn’t exist', 'Try searching for another.'); return; }
  const a = r.account;
  if (r.me) { Object.assign(me, { followers: a.followers, verified: a.verified, name: a.name, bio: a.bio }); renderMe(); }
  setTitle(`${a.name} (@${a.handle})`);
  const h = [...a.handle].reduce((x, c) => (x * 31 + c.charCodeAt(0)) % 360, 0);
  const tabs = ['posts', 'replies', 'media', ...(r.me ? ['likes'] : [])];
  const joined = new Date(a.joined).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  main().innerHTML = hdrBack(`${esc(a.name)}${verified(a.verified)}`, `${r.posts.length}${r.posts.length >= 40 ? '+' : ''} posts`) +
    `<div class="banner" style="background:linear-gradient(135deg,hsl(${h},38%,24%),hsl(${(h + 55) % 360},42%,12%))"></div>
    <div class="prof"><div class="ptop">${av(a, 'l')}<div class="pbtns">${r.me ? `<button class="obtn" id="editp">Edit profile</button>` : `<button class="iconbtn ring-btn" data-dm="${esc(a.handle)}" aria-label="Message">${svg('mail')}</button>${followBtn(a, r.following)}`}</div></div>
    <div class="pname"><h1>${esc(a.name)}${verified(a.verified)}</h1><div class="mute">@${esc(a.handle)}</div></div>
    ${a.bio ? `<div class="pbio">${linkify(a.bio)}</div>` : ''}
    <div class="pmeta mute">${svg('calendar')}<span>Joined ${joined}</span></div>
    <div class="pstats"><span><b>${compact(a.following)}</b> <span class="mute">Following</span></span><span><b id="pf">${a.followers < 1e4 ? a.followers.toLocaleString() : compact(a.followers)}</b> <span class="mute">Followers</span></span></div></div>
    ${r.me && a.verified !== 'blue' ? `<div class="fame"><b>Road to verified</b><div class="mute">Post, reply to big accounts and go viral. At ${me.verify_at.toLocaleString()} followers you earn the blue check.</div><div class="bar"><i style="width:${Math.min(100, a.followers / me.verify_at * 100)}%"></i></div><div class="mute" style="font-size:13px;margin-top:6px">${a.followers.toLocaleString()} / ${me.verify_at.toLocaleString()}</div></div>` : ''}
    <div class="tabs prof-tabs">${tabs.map(t => `<a href="#/u/${esc(a.handle)}${t === 'posts' ? '' : '/' + t}" class="${t === tab ? 'on' : ''}"><span>${t[0].toUpperCase() + t.slice(1)}</span></a>`).join('')}</div>
    ${r.posts.map(p => postHTML(p, { showReplyTo: true })).join('') || emptyState(tab === 'media' ? 'Lights, camera … attachments!' : tab === 'likes' ? 'You haven’t liked any posts yet' : r.me ? 'You haven’t posted yet' : `@${esc(a.handle)} hasn’t posted`, tab === 'media' ? 'Photos and videos aren’t part of Z yet.' : r.me ? 'When you do, it’ll show up here.' : 'When they do, it’ll show up here.')}`;
  const ep = $('#editp'); if (ep) ep.onclick = () => openModal(`<div class="mtitle">Edit profile</div><div class="mform"><label>Name<input id="en" maxlength="30" value="${esc(me.name)}"></label><label>Bio<textarea id="eb" maxlength="160" rows="3">${esc(me.bio || '')}</textarea></label><button class="btn" id="es">Save</button></div>`, {
    onMount: (m, close) => { $('#es', m).onclick = async () => { await api('/me', 'PATCH', { name: $('#en', m).value, bio: $('#eb', m).value }); close(); me = await api('/me'); renderMe(); viewProfile(handle, tab); }; } });
}

// ---------- Explore / Search ----------
async function viewExplore() {
  setTitle('Explore');
  const tabsDef = [['foryou', 'For You'], ['trending', 'Trending'], ['news', 'News'], ['sports', 'Sports'], ['ent', 'Entertainment']];
  const cur = sessionStorage.getItem('z_etab') || 'foryou';
  main().innerHTML = `<div class="hdr"><div class="sbox in-hdr"><div class="sfield">${svg('search')}<input id="eq" placeholder="Search" autocomplete="off"></div></div><div class="tabs">${tabsDef.map(([k, l]) => `<a data-etab="${k}" class="${cur === k ? 'on' : ''}"><span>${l}</span></a>`).join('')}</div></div><div id="ex">${skeleton(4)}</div>`;
  $('#eq').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.value.trim()) location.hash = '#/search?q=' + encodeURIComponent(e.target.value.trim()); });
  $$('[data-etab]').forEach(a => a.onclick = () => { sessionStorage.setItem('z_etab', a.dataset.etab); viewExplore(); });
  const ex = await api('/explore');
  const filt = { foryou: () => true, trending: () => true, news: t => /news|politic/i.test(t.cat), sports: t => /sport/i.test(t.cat), ent: t => /entertain|music|hip|meme/i.test(t.cat) }[cur];
  const trends = ex.trends.filter(filt);
  let html = trends.map((t, i) => `<div class="trend" data-go="#/search?q=${encodeURIComponent(t.topic)}"><div class="tc mute">${i + 1} · ${esc(t.cat)}</div><div class="tn">${esc(t.topic)}</div><div class="mute tp">${esc(t.posts)} posts</div></div>`).join('') || emptyState('Nothing trending here yet', 'Check back soon.');
  if (cur === 'foryou') { const hot = await api('/feed'); hot.sort((a, b) => b.likes_t - a.likes_t); html += `<div class="sect">Hot right now</div>` + hot.slice(0, 8).map(p => postHTML(p)).join(''); }
  $('#ex').innerHTML = html;
}
async function viewSearch(qs) {
  const q = new URLSearchParams(qs).get('q') || '';
  setTitle(q ? `${q} - Search` : 'Search');
  const tab = sessionStorage.getItem('z_stab') || 'top';
  main().innerHTML = `<div class="hdr"><div class="title"><button class="iconbtn" data-back aria-label="Back">${svg('back')}</button><div class="sbox in-hdr" style="flex:1"><div class="sfield">${svg('search')}<input id="eq" value="${esc(q)}" autocomplete="off"></div></div></div>
    <div class="tabs">${[['top', 'Top'], ['latest', 'Latest'], ['people', 'People']].map(([k, l]) => `<a data-stab="${k}" class="${tab === k ? 'on' : ''}"><span>${l}</span></a>`).join('')}</div></div><div id="ex">${skeleton(4)}</div>`;
  $('#eq').addEventListener('keydown', e => { if (e.key === 'Enter') location.hash = '#/search?q=' + encodeURIComponent(e.target.value.trim()); });
  $$('[data-stab]').forEach(a => a.onclick = () => { sessionStorage.setItem('z_stab', a.dataset.stab); viewSearch(qs); });
  const r = await api('/search?q=' + encodeURIComponent(q));
  const people = r.people.map(a => userRowHTML(a)).join(''), ps = tab === 'latest' ? r.posts.slice().sort((a, b) => b.created - a.created) : r.posts;
  $('#ex').innerHTML = (tab !== 'latest' && people ? `${tab === 'top' ? '<div class="sect">People</div>' : ''}${people}` : '') + (tab !== 'people' ? (tab === 'top' && people ? '<div class="sect">Posts</div>' : '') + ps.map(p => postHTML(p)).join('') : '')
    || emptyState(`No results for “${esc(q)}”`, 'Try searching for something else.');
}

// ---------- Notifications ----------
async function viewNotifs() {
  setTitle('Notifications');
  const tab = sessionStorage.getItem('z_ntab') || 'all';
  main().innerHTML = `<div class="hdr"><div class="title"><div class="tt"><div class="t1">Notifications</div></div></div><div class="tabs">${[['all', 'All'], ['verified', 'Verified'], ['mentions', 'Mentions']].map(([k, l]) => `<a data-ntab="${k}" class="${tab === k ? 'on' : ''}"><span>${l}</span></a>`).join('')}</div></div><div id="nl">${skeleton(4)}</div>`;
  $$('[data-ntab]').forEach(a => a.onclick = () => { sessionStorage.setItem('z_ntab', a.dataset.ntab); viewNotifs(); });
  let rows = await api('/notifs'); badges.notifs = 0; setBadges();
  if (tab === 'verified') rows = rows.filter(n => n.verified === 'blue' || n.verified === 'gold' || n.type === 'verified');
  if (tab === 'mentions') rows = rows.filter(n => ['reply', 'celeb_reply', 'quote'].includes(n.type));
  const who = n => n.name ? `<a href="#/u/${esc(n.handle)}" class="nm"><b>${esc(n.name)}</b>${verified(n.verified)}</a>` : '<b>Z</b>';
  $('#nl').innerHTML = rows.map(n => {
    const icon = n.type === 'verified' ? `<span class="ni" style="color:var(--blue)">${svg('badge')}</span>` : n.type === 'sim' ? `<span class="ni" style="color:var(--blue)">${svg('clock')}</span>` : n.type === 'celeb_dm' ? `<span class="ni" style="color:var(--blue)">${svg('mailF')}</span>` : n.type === 'quote' ? `<span class="ni" style="color:var(--green)">${svg('rt')}</span>` : `<span class="ni" style="color:var(--blue)">${svg('reply')}</span>`;
    const label = n.type === 'celeb_reply' || n.type === 'reply' ? `${who(n)} replied to your post` : n.type === 'quote' ? `${who(n)} quoted your post` : n.type === 'celeb_dm' ? `${who(n)} sent you a message` : '';
    const go = n.type === 'celeb_dm' ? `#/messages/${n.handle}` : n.post_id ? `#/post/${n.post_id}` : '#/home';
    return `<div class="notif ${n.read ? '' : 'unread'}" data-go="${go}">${icon}<div class="nb"><div class="nav-av">${n.name ? av({ name: n.name, handle: n.handle, pfp: n.pfp, verified: n.verified }, 's') : ''}</div><div class="nt">${label || esc(n.text)}</div>${label && n.type !== 'celeb_dm' ? `<div class="mute nq">${esc(n.text)}</div>` : ''}<div class="mute ntm">${ago(n.created)}</div></div></div>`;
  }).join('') || emptyState(tab === 'mentions' ? 'Nothing to see here — yet' : 'Nothing to see here — yet', 'From likes to reposts and a whole lot more, this is where all the action happens.');
}

// ---------- Bookmarks ----------
async function viewBookmarks() {
  setTitle('Bookmarks');
  main().innerHTML = hdrBack('Bookmarks', '@' + esc(me.handle)) + `<div id="bl">${skeleton(3)}</div>`;
  const r = await api('/bookmarks');
  $('#bl').innerHTML = r.map(p => postHTML(p)).join('') || emptyState('Save posts for later', 'Bookmark posts to easily find them again in the future.');
}

// ---------- Messages (two-pane, like X) ----------
let chatTimer;
async function viewMessages(handle) {
  setTitle('Messages');
  document.body.classList.add('dm');
  main().innerHTML = `<div class="dmwrap ${handle ? 'open' : ''}"><section class="dmlist" id="dmlist"></section><section class="dmchat" id="dmchat"></section></div>`;
  let rows = await api('/dms');
  const drawList = () => {
    $('#dmlist').innerHTML = `<div class="hdr"><div class="title"><div class="tt"><div class="t1">Messages</div></div><button class="iconbtn" id="newdm" aria-label="New message">${svg('compose')}</button></div></div>
      <div class="sbox"><div class="sfield">${svg('search')}<input id="dmq" placeholder="Search Direct Messages" autocomplete="off"></div></div>
      ${rows.map(d => `<div class="dm ${handle && d.handle.toLowerCase() === handle.toLowerCase() ? 'sel' : ''}" data-go="#/messages/${esc(d.handle)}" data-name="${esc((d.name + ' ' + d.handle).toLowerCase())}">${av(d)}<div class="info"><div class="nl"><b>${esc(d.name)}</b>${verified(d.verified)}<span class="mute">@${esc(d.handle)} · ${ago(d.created)}</span></div><p class="${d.unread ? 'ub' : 'mute'}">${d.from_user ? 'You: ' : ''}${esc(d.text)}</p></div>${d.unread ? '<span class="unread"></span>' : ''}</div>`).join('') || `<div class="empty"><div class="eh">Welcome to your inbox!</div><p>Drop a line, share posts and more with private conversations between you and others on Z.</p><button class="btn" id="newdm2">Write a message</button></div>`}`;
    const nd = () => openModal(`<div class="mtitle">New message</div><div class="mform"><input id="nq" placeholder="Search people" autocomplete="off"><div id="nres"></div></div>`, { onMount: (m, close) => { let t; $('#nq', m).oninput = e => { clearTimeout(t); t = setTimeout(async () => { const q = e.target.value.trim(); if (!q) return; const r = await api('/search?q=' + encodeURIComponent(q)); $('#nres', m).innerHTML = r.people.map(a => `<div class="urow" data-pick="${esc(a.handle)}">${av(a)}<div class="info"><div class="nl"><b>${esc(a.name)}</b>${verified(a.verified)}</div><div class="mute">@${esc(a.handle)}</div></div></div>`).join(''); }, 250); }; m.onclick = e => { const p = e.target.closest('[data-pick]'); if (p) { close(); location.hash = '#/messages/' + p.dataset.pick; } }; $('#nq', m).focus(); } });
    $('#newdm').onclick = nd; const n2 = $('#newdm2'); if (n2) n2.onclick = nd;
    $('#dmq').oninput = e => { const f = e.target.value.toLowerCase(); $$('.dm', $('#dmlist')).forEach(d => d.style.display = d.dataset.name.includes(f) ? '' : 'none'); };
  };
  drawList();
  if (!handle) { $('#dmchat').innerHTML = `<div class="empty chat-empty"><div class="eh">Select a message</div><p>Choose from your existing conversations, start a new one, or just keep swimming.</p><button class="btn" id="newdm3">New message</button></div>`; $('#newdm3').onclick = () => $('#newdm').click(); return; }
  // ----- conversation -----
  let awaiting = 0, theirCount = null, seen = false, busy = false;
  const draw = async first => {
    if (!location.hash.startsWith('#/messages/') || busy) return; busy = true;
    try {
      const r = await api('/dms/' + handle), a = r.account;
      const theirs = r.messages.filter(m => !m.from_user).length;
      if (theirCount === null) theirCount = theirs;
      if (theirs > theirCount) { awaiting = 0; theirCount = theirs; seen = false; }
      const last = r.messages[r.messages.length - 1], typing = Date.now() < awaiting || r.typing;
      if (first) $('#dmchat').innerHTML = `<div class="hdr"><div class="title"><button class="iconbtn only-mobile" data-back aria-label="Back">${svg('back')}</button><a href="#/u/${esc(a.handle)}" class="chead">${av(a, 's')}<div class="tt"><div class="t1">${nameLine(a)}</div><div class="t2 mute" id="cstat">@${esc(a.handle)}</div></div></a></div></div>
        <div class="msgs" id="msgs"></div><div class="chatin"><input id="mi" placeholder="Start a new message" autocomplete="off"><button class="sendb" id="ms" aria-label="Send" disabled>${svg('send')}</button></div>`;
      const box = $('#msgs'); if (!box) return;
      const atBottom = first || box.scrollHeight - box.scrollTop - box.clientHeight < 90;
      const sig = r.messages.map(m => m.id).join() + '|' + typing + '|' + seen;
      if (box.dataset.sig !== sig) {
        box.dataset.sig = sig;
        const intro = `<div class="cintro"><a href="#/u/${esc(a.handle)}">${av(a, 'l2')}</a><div class="nl"><b>${esc(a.name)}</b>${verified(a.verified)}</div><div class="mute">@${esc(a.handle)}</div>${a.bio ? `<div class="ubio">${esc(a.bio)}</div>` : ''}<div class="mute small">${compact(a.followers)} Followers</div></div>`;
        let html = '', prev = 0;
        r.messages.forEach((m, i) => {
          if (!prev || m.created - prev > 3600e3) html += `<div class="stamp mute">${new Date(m.created).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>`;
          const nxt = r.messages[i + 1], tail = !nxt || nxt.from_user !== m.from_user;
          html += `<div class="m ${m.from_user ? 'me2' : 'th'} ${tail ? 'tail' : ''}">${esc(m.text)}</div>`; prev = m.created;
        });
        const status = last && last.from_user && !typing ? `<div class="mstat mute">${seen ? 'Seen' : Date.now() - last.created > 25000 ? 'Delivered' : 'Sent'}</div>` : '';
        box.innerHTML = intro + html + status + (typing ? '<div class="m th typing"><i></i><i></i><i></i></div>' : '');
        if (atBottom) box.scrollTop = box.scrollHeight;
      }
      const st = $('#cstat'); if (st) st.textContent = typing ? 'typing…' : '@' + a.handle;
      if (first) {
        const inp = $('#mi'), sb = $('#ms');
        const send = async () => {
          const t = inp.value.trim(); if (!t) return; inp.value = ''; sb.disabled = true;
          const res = await api('/dms/' + handle, 'POST', { text: t });
          if (!rows.some(x => x.handle.toLowerCase() === handle.toLowerCase())) { rows = await api('/dms'); drawList(); }
          if (res.reply) awaiting = Date.now() + 30000; else setTimeout(() => { seen = true; draw(); }, 1800 + Math.random() * 2500);
          draw();
        };
        inp.oninput = () => sb.disabled = !inp.value.trim(); sb.onclick = send; inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); send(); } }); inp.focus();
      }
    } finally { busy = false; }
  };
  await draw(true);
  const loop = () => { draw(false).catch(() => { }).finally(() => { chatTimer = setTimeout(loop, Date.now() < awaiting ? 800 : 3000); }); };
  clearTimeout(chatTimer); chatTimer = setTimeout(loop, 1000);
  pollNow();
}
