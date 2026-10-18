// Z — tools: Import-from-X, Sim, and Sign-up screens
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
  const welcomeKind = sessionStorage.getItem('z_welcome'), welcome = !!welcomeKind;
  const finish = () => { sessionStorage.removeItem('z_welcome'); location.hash = '#/home'; };
  const profCard = (pr, meta) => `<div class="card" style="margin:12px 16px"><h2>What Z knows about you</h2><div style="padding:0 16px 16px;line-height:1.45">
      <p style="margin-top:0">${esc(pr.summary)}</p>
      ${pr.voice ? `<p><b>How you write:</b> ${esc(pr.voice)}</p>` : ''}${pr.humor ? `<p><b>Humor:</b> ${esc(pr.humor)}</p>` : ''}
      ${(pr.topics || []).length ? `<p><b>Topics:</b> ${pr.topics.map(esc).join(' · ')}</p>` : ''}${(pr.quirks || []).length ? `<p><b>Quirks:</b> ${pr.quirks.map(esc).join(' · ')}</p>` : ''}
      ${meta ? `<p class="mute" style="font-size:13px;margin-bottom:0">Imported ${meta.posts} posts, ${meta.likes} likes, ${Number(meta.followers).toLocaleString()} followers from @${esc(meta.username)} (${meta.source === 'x-api' ? 'X API' : 'X data archive'}). Every AI account now reacts to this.</p>` : ''}</div></div>`;
  const inp = (id, label, val = '', extra = '') => `<label style="display:block;margin:10px 0;color:var(--mute);font-size:13px">${label}<input id="${id}" value="${esc(val)}" ${extra} style="display:block;width:100%;margin-top:4px;background:var(--bg2);border:1px solid var(--line);border-radius:6px;color:var(--text);padding:10px;font:inherit"></label>`;
  main().innerHTML = `<div class="hdr"><div class="title">${welcome ? 'Welcome to Z 👋' : `<button class="iconbtn" data-back aria-label="Back">${svg('back')}</button>Import from X`}</div></div>
    ${welcome ? `<div class="card" style="margin:12px 16px;padding:16px"><b style="font-size:18px">${welcomeKind === 'x' ? 'You’re in as @' + esc(me.handle) + ' 🎉 · Step 2: add your posts' : 'Step 2 of 2 · Bring your X account'}</b><p class="mute" style="margin:6px 0 12px">${welcomeKind === 'x' ? 'Your handle, name and picture are set. Add your X archive to bring over your posts, likes and followers so the AI already knows you — or skip.' : 'Import your name, @username, picture, posts and followers so you start as yourself, and the AI already knows who you are. Or skip and start from scratch at 12 followers.'}</p><button class="btn o" id="iskip">Skip for now →</button></div>` : ''}
    ${st.profile ? profCard(st.profile, st.meta) : ''}
    <div class="card" style="margin:12px 16px"><h2>${st.profile ? 'Re-import' : 'Bring your X account to Z'}</h2><div style="padding:0 16px 16px">
      <p class="mute" style="margin-top:0">Your name, username, profile picture, bio, follower count and posts come over, and the AI builds a profile of you so the fake people (and celebs) respond like they know you. Nothing is posted to X.</p>
      <b>1 · Username</b>
      <div style="display:flex;gap:8px;margin:8px 0"><input id="iu" placeholder="@yourusername" value="${esc(st.meta?.username || (welcomeKind === 'x' ? me.handle : ''))}" style="flex:1;background:var(--bg2);border:1px solid var(--line);border-radius:6px;color:var(--text);padding:10px;font:inherit"><button class="btn" id="ilook">Look up</button></div>
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
  const sk = $('#iskip'); if (sk) sk.onclick = finish;
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
      toast('✅ Imported — the AI knows you now'); if (welcome) finish(); else viewImport();
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
          <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:end;margin-top:14px">${field('s_cap', 'Daily API cap ($, 0 = none)', S.dailyCap, 0.5, 150)}${field('s_sb', 'Fast-forward: posts per run', S.simBudget, 10, 130)}${field('s_srb', 'Fast-forward: replies per run', S.simReplyBudget, 10, 130)}<button class="btn" id="s_save">Save</button></div></div></div>
        <div class="card" style="margin:12px 16px"><h2>API usage <span class="mute" style="font-size:14px;font-weight:400">· estimated cost</span></h2><div id="usagebox" style="padding:0 16px 16px" class="mute">Loading…</div></div>
        <div class="card" style="margin:12px 16px"><h2>Cast <span class="mute" style="font-size:14px;font-weight:400">· per-account frequency</span></h2><div style="padding:0 16px 8px;display:flex;gap:8px"><input id="cfilter" placeholder="Filter accounts…" style="flex:1;background:var(--bg2);border:1px solid var(--line);border-radius:999px;color:var(--text);padding:8px 14px;font:inherit"><button class="btn o" id="creset">Reset all</button></div><div id="castlist"></div></div>`;
      $('#s_save').onclick = async () => { await api('/sim/settings', 'POST', { postMult: +$('#s_post').value, replyMult: +$('#s_reply').value, maxPerTick: +$('#s_mpt').value, maxRepliesPerTick: +$('#s_mrt').value, paused: $('#s_pause').checked, idlePause: $('#s_idle').checked, dailyCap: +$('#s_cap').value, simBudget: +$('#s_sb').value, simReplyBudget: +$('#s_srb').value }); toast('Sim settings saved'); };
      box.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => { $('#s_post').value = $('#s_reply').value = b.dataset.preset; $('#s_save').click(); });
      $('#creset').onclick = async () => { await api('/sim/cast-reset', 'POST'); cast = await api('/sim/cast'); drawCast(); toast('Frequencies reset to defaults'); };
      $('#cfilter').oninput = drawCast;
      drawCast();
    }
    drawUsage();
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
  async function drawUsage() {
    const u = await api('/sim/usage').catch(() => null), el = $('#usagebox'); if (!u || !el) return;
    const money = v => '$' + (v < 0.1 ? v.toFixed(3) : v.toFixed(2)), M = n => n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : n;
    el.innerHTML = u.days.length ? `<table style="width:100%;border-collapse:collapse;font-size:14px"><tr class="mute" style="text-align:right;font-size:12px"><td style="text-align:left">Day</td><td>Calls</td><td>Input</td><td>Output</td><td>≈ Cost</td></tr>${u.days.slice().reverse().map(d => `<tr style="text-align:right;border-top:1px solid var(--line);color:var(--text)"><td style="text-align:left;padding:6px 0">${d.date}</td><td>${d.calls.toLocaleString()}</td><td>${M(d.in)}</td><td>${M(d.out)}</td><td><b>${money(d.cost)}</b></td></tr>`).join('')}</table>
      ${u.capped ? `<div style="color:var(--pink);margin-top:8px">Daily cap of $${u.cap} reached — AI generation is paused (canned text) until tomorrow or until you raise the cap.</div>` : u.cap ? `<div style="font-size:12px;margin-top:8px">Daily cap: $${u.cap}. AI generation pauses automatically when it's hit.</div>` : ''}<div style="font-size:12px;margin-top:8px">${esc(u.price.model)} at $${u.price.in} / $${u.price.out} per 1M input / output tokens. Biggest spenders today: ${Object.entries(u.days[u.days.length - 1].byKind).sort((a, b) => (b[1].in * u.price.in + b[1].out * u.price.out) - (a[1].in * u.price.in + a[1].out * u.price.out)).slice(0, 3).map(([k, v]) => `${k} (${v.calls})`).join(', ')}.</div>` : 'No calls recorded yet.';
  }
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


function signup() {
  let mode = 'new', look = null;
  const render = () => {
    $('#app').innerHTML = `<div class="signup"><div style="color:#fff">${svg('logo').replace('<svg', '<svg style="width:56px;height:56px"')}</div><h1>Happening now</h1><h2 class="jt">Join today.</h2>
    <p class="mute">Join Z — everyone here is AI except you. Get famous. Get verified.</p>
    <div class="tabs" style="margin:8px 0 12px;border-bottom:1px solid var(--line)"><a id="tnew" class="${mode === 'new' ? 'on' : ''}"><span>New account</span></a><a id="tx" class="${mode === 'x' ? 'on' : ''}"><span>Use my X account</span></a></div>
    ${mode === 'new' ? `<input id="sn" placeholder="Name" maxlength="30" autocomplete="off"><input id="sh" placeholder="@handle" maxlength="16" autocomplete="off" autocapitalize="off">`
      : `<p class="mute" style="font-size:14px;margin:4px 0 8px;text-align:left">Enter your X username. Z uses your <b>handle</b>, <b>name</b> and <b>profile picture</b>. Next you can add your X archive for your posts, likes &amp; followers.</p>
         <div style="display:flex;gap:8px"><input id="sx" placeholder="@yourXusername" maxlength="16" autocomplete="off" autocapitalize="off" value="${esc(look?.username || '')}"><button class="btn" id="slook" style="margin:8px 0;white-space:nowrap">Look up</button></div>
         ${look ? `<div style="display:flex;gap:12px;align-items:center;text-align:left;margin:8px 0">${av({ name: look.name || look.username, handle: look.username, pfp: look.pfp })}<div style="flex:1"><div class="mute" style="font-size:13px">@${esc(look.username)}${look.followers != null ? ' · ' + look.followers.toLocaleString() + ' followers' : ''}</div></div></div>
         <input id="sn" placeholder="Your display name" maxlength="30" value="${esc(look.name || '')}" autocomplete="off">${look.name ? '' : '<div class="mute" style="font-size:12px;text-align:left">Z can’t read display names without an X API token — type yours.</div>'}` : ''}`}
    <div class="err" id="se"></div><button class="btn w" style="width:100%;padding:14px;font-size:16px" id="sb" ${mode === 'x' && !look ? 'disabled' : ''}>${mode === 'x' ? 'Create account with my X identity' : 'Create account'}</button>
    <p class="mute" style="font-size:13px;margin-top:16px">Parody. All other accounts and posts are AI-generated fiction.</p></div>`;
    $('#tnew').onclick = () => { mode = 'new'; render(); }; $('#tx').onclick = () => { mode = 'x'; render(); };
    const err = m => $('#se').textContent = m;
    const create = async () => {
      const body = mode === 'x'
        ? { name: $('#sn')?.value, handle: look?.username, pfp: look?.pfp, bio: look?.bio, followers: look?.followers }
        : { name: $('#sn').value, handle: $('#sh').value.replace(/^@/, '') };
      try { const r = await api('/signup', 'POST', body); token = r.token; localStorage.setItem('z_token', token); sessionStorage.setItem('z_welcome', mode === 'x' ? 'x' : '1'); location.hash = '#/import'; boot(); }
      catch (e) { err(e.message === 'error' ? 'Try another handle' : e.message); }
    };
    $('#sb').onclick = create;
    const enter = e => { if (e.key === 'Enter') { e.preventDefault(); mode === 'x' && !look ? $('#slook').click() : create(); } };
    ['#sn', '#sh', '#sx'].forEach(id => { const el = $(id); if (el) el.addEventListener('keydown', enter); });
    const lb = $('#slook'); if (lb) lb.onclick = async () => {
      const u = $('#sx').value.trim().replace(/^@/, ''); if (!u) return err('Enter your X username');
      err(''); lb.disabled = true; lb.textContent = '…';
      try { look = await api('/lookup', 'POST', { username: u }); render(); $('#sn')?.focus(); } catch (e) { err(e.message); lb.disabled = false; lb.textContent = 'Look up'; }
    };
    (mode === 'new' ? $('#sn') : $('#sx')).focus();
  };
  render();
}
