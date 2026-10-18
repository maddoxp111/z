// Z — core: helpers, icons, api, and the shared X-style components (post card, avatar, menus, modals, composer)
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- icons (24x24). strings starting with "<" are inner markup, otherwise a single path ----------
const S = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const I = {
  home: 'M12 9c-2.209 0-4 1.791-4 4s1.791 4 4 4 4-1.791 4-4-1.791-4-4-4zm0 6c-1.105 0-2-.895-2-2s.895-2 2-2 2 .895 2 2-.895 2-2 2zm0-13.304L.622 8.807l1.06 1.696L3 9.679V19.5C3 20.881 4.119 22 5.5 22h13c1.381 0 2.5-1.119 2.5-2.5V9.679l1.318.824 1.06-1.696L12 1.696zM19 19.5c0 .276-.224.5-.5.5h-13c-.276 0-.5-.224-.5-.5V8.429l7-4.375 7 4.375V19.5z',
  homeF: 'M12 1.696L.622 8.807l1.06 1.696L3 9.679V19.5C3 20.881 4.119 22 5.5 22h13c1.381 0 2.5-1.119 2.5-2.5V9.679l1.318.824 1.06-1.696L12 1.696zM12 16.5c-1.933 0-3.5-1.567-3.5-3.5s1.567-3.5 3.5-3.5 3.5 1.567 3.5 3.5-1.567 3.5-3.5 3.5z',
  search: 'M10.25 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.419-.726 4.596-1.904 1.178-1.177 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.815-1.824 5.262l4.781 4.781-1.414 1.414-4.781-4.781c-1.447 1.142-3.276 1.824-5.262 1.824-4.694 0-8.5-3.806-8.5-8.5z',
  bell: 'M19.993 9.042C19.48 5.017 16.054 2 11.996 2s-7.49 3.021-7.999 7.051L2.866 18H7.1c.463 2.282 2.481 4 4.9 4s4.437-1.718 4.9-4h4.236l-1.143-8.958zM12 20c-1.306 0-2.417-.835-2.829-2h5.658c-.412 1.165-1.523 2-2.829 2zm-6.866-4l.847-6.698C6.364 6.272 8.941 4 11.996 4s5.627 2.268 6.013 5.295L18.864 16H5.134z',
  bellF: 'M11.996 2c-4.062 0-7.49 3.021-7.999 7.051L2.866 18H7.1c.463 2.282 2.481 4 4.9 4s4.437-1.718 4.9-4h4.236l-1.143-8.958C19.48 5.017 16.054 2 11.996 2zM9.171 18h5.658c-.412 1.165-1.523 2-2.829 2s-2.417-.835-2.829-2z',
  mail: 'M1.998 5.5c0-1.381 1.119-2.5 2.5-2.5h15c1.381 0 2.5 1.119 2.5 2.5v13c0 1.381-1.119 2.5-2.5 2.5h-15c-1.381 0-2.5-1.119-2.5-2.5v-13zm2.5-.5c-.276 0-.5.224-.5.5v2.764l8 3.6 8-3.6V5.5c0-.276-.224-.5-.5-.5h-15zm15.5 5.463l-8 3.6-8-3.6V18.5c0 .276.224.5.5.5h15c.276 0 .5-.224.5-.5v-8.037z',
  mailF: 'M1.998 5.5c0-1.381 1.119-2.5 2.5-2.5h15c1.381 0 2.5 1.119 2.5 2.5V8l-10 4.5L1.998 8V5.5zm0 6.7V18.5c0 1.381 1.119 2.5 2.5 2.5h15c1.381 0 2.5-1.119 2.5-2.5v-6.3l-10 4.5-10-4.5z',
  bookmark: 'M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5zM6.5 4c-.276 0-.5.22-.5.5v14.56l6-4.29 6 4.29V4.5c0-.28-.224-.5-.5-.5h-11z',
  bookmarkF: 'M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5z',
  user: 'M5.651 19h12.698c-.337-1.8-1.023-3.21-1.945-4.19C15.318 13.65 13.838 13 12 13s-3.317.65-4.404 1.81c-.922.98-1.608 2.39-1.945 4.19zm.486-5.56C7.627 11.85 9.648 11 12 11s4.373.85 5.863 2.44c1.477 1.58 2.366 3.8 2.632 6.46l.11 1.1H3.395l.11-1.1c.266-2.66 1.155-4.88 2.632-6.46zM12 4c-1.105 0-2 .9-2 2s.895 2 2 2 2-.9 2-2-.895-2-2-2zM8 6c0-2.21 1.791-4 4-4s4 1.79 4 4-1.791 4-4 4-4-1.79-4-4z',
  userF: 'M17.863 13.44c1.477 1.58 2.366 3.8 2.632 6.46l.11 1.1H3.395l.11-1.1c.266-2.66 1.155-4.88 2.632-6.46C7.627 11.85 9.648 11 12 11s4.373.85 5.863 2.44zM12 2C9.791 2 8 3.79 8 6s1.791 4 4 4 4-1.79 4-4-1.791-4-4-4z',
  more: `<g ${S} stroke-width="1.8"><circle cx="12" cy="12" r="9"/></g><circle cx="8" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="16" cy="12" r="1.3"/>`,
  dots: '<circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>',
  reply: 'M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z',
  rt: 'M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z',
  heart: 'M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z',
  hearts: 'M20.884 13.19c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z',
  views: 'M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z',
  share: 'M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z',
  back: 'M7.414 13l5.043 5.04-1.414 1.42L3.586 12l7.457-7.46 1.414 1.42L7.414 11H21v2H7.414z',
  close: 'M10.59 12L4.54 5.96l1.42-1.42L12 10.59l6.04-6.05 1.42 1.42L13.41 12l6.05 6.04-1.42 1.42L12 13.41l-6.04 6.05-1.42-1.42L10.59 12z',
  badge: 'M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z',
  clock: 'M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm1-13h-2v6l4.5 2.7 1-1.64-3.5-2.06V7z',
  logo: 'M5 4h14v2.5L9.2 17.5H19V20H5v-2.5L14.8 6.5H5z',
  image: 'M3 5.5C3 4.119 4.119 3 5.5 3h13C19.881 3 21 4.119 21 5.5v13c0 1.381-1.119 2.5-2.5 2.5h-13C4.119 21 3 19.881 3 18.5v-13zM5.5 5c-.276 0-.5.224-.5.5v9.086l3-3 3 3 5-5 3 3V5.5c0-.276-.224-.5-.5-.5h-13zM19 15.414l-3-3-5 5-3-3-3 3V18.5c0 .276.224.5.5.5h13c.276 0 .5-.224.5-.5v-3.086zM9.75 7C8.784 7 8 7.784 8 8.75s.784 1.75 1.75 1.75 1.75-.784 1.75-1.75S10.716 7 9.75 7z',
  gif: `<g ${S} stroke-width="1.7"><rect x="3" y="4" width="18" height="16" rx="3.5"/></g><text x="12" y="15.2" text-anchor="middle" font-size="6.6" font-weight="800" font-family="Arial,sans-serif">GIF</text>`,
  poll: `<g ${S} stroke-width="1.9"><path d="M6 6h6M6 12h12M6 18h8"/></g>`,
  emoji: `<g ${S} stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M8.2 14c.9 1.4 2.2 2.1 3.8 2.1s2.9-.7 3.8-2.1"/></g><circle cx="9" cy="9.7" r="1.15"/><circle cx="15" cy="9.7" r="1.15"/>`,
  schedule: `<g ${S} stroke-width="1.8"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></g>`,
  pin: `<g ${S} stroke-width="1.8"><path d="M12 21s-7-6.3-7-11.2A7 7 0 0 1 19 9.8C19 14.7 12 21 12 21z"/><circle cx="12" cy="10" r="2.5"/></g>`,
  calendar: `<g ${S} stroke-width="1.6"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></g>`,
  globe: `<g ${S} stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z"/></g>`,
  link: `<g ${S} stroke-width="1.9"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.700l1-1"/></g>`,
  trash: `<g ${S} stroke-width="1.8"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></g>`,
  person: `<g ${S} stroke-width="1.8"><circle cx="9.5" cy="8" r="3.5"/><path d="M3 20c.7-3.5 3.200-5.500 6.500-5.500S15.300 16.500 16 20M19 8v6M16 11h6"/></g>`,
  out: `<g ${S} stroke-width="1.8"><path d="M15 4h3.500A1.500 1.500 0 0 1 20 5.500v13a1.500 1.500 0 0 1-1.500 1.500H15M10 8l-4 4 4 4M6 12h10"/></g>`,
  gear: `<g ${S} stroke-width="1.7"><circle cx="12" cy="12" r="3"/><path d="M19.400 15a1.700 1.700 0 0 0 .3 1.800l.1.100a2 2 0 1 1-2.800 2.800l-.1-.1a1.700 1.700 0 0 0-1.800-.3 1.700 1.700 0 0 0-1 1.500V21a2 2 0 1 1-4 0v-.1a1.700 1.700 0 0 0-1.100-1.500 1.700 1.700 0 0 0-1.800.3l-.1.1a2 2 0 1 1-2.800-2.800l.1-.1a1.700 1.700 0 0 0 .3-1.800 1.700 1.700 0 0 0-1.500-1H3a2 2 0 1 1 0-4h.1a1.700 1.700 0 0 0 1.500-1.100 1.700 1.700 0 0 0-.3-1.800l-.1-.1a2 2 0 1 1 2.800-2.800l.1.100a1.700 1.700 0 0 0 1.800.3H9a1.700 1.700 0 0 0 1-1.500V3a2 2 0 1 1 4 0v.1a1.700 1.700 0 0 0 1 1.500 1.700 1.700 0 0 0 1.800-.3l.1-.1a2 2 0 1 1 2.800 2.800l-.1.100a1.700 1.700 0 0 0-.3 1.800V9a1.700 1.700 0 0 0 1.500 1H21a2 2 0 1 1 0 4h-.1a1.700 1.700 0 0 0-1.500 1z"/></g>`,
  compose: `<g ${S} stroke-width="1.8"><path d="M4 20h4L19 9a2.800 2.800 0 0 0-4-4L4 16v4z"/></g>`,
  send: 'M2.504 21.866l.526-2.108C3.04 19.719 4 15.823 4 12s-.96-7.719-.97-7.757l-.527-2.109L22.236 12 2.504 21.866zM5.981 13c-.072 1.962-.34 3.833-.583 5.183L17.764 12 5.398 5.818c.242 1.349.51 3.221.583 5.183H10v2H5.981z',
};
const svg = (k, cls = '') => { const d = I[k] || ''; return `<svg viewBox="0 0 24 24" class="${cls}" aria-hidden="true">${d.startsWith('<') ? d : `<path d="${d}"/>`}</svg>`; };
const verified = v => v === 'blue' || v === 'gold' ? `<svg viewBox="0 0 24 24" class="vf ${v}" aria-label="Verified account"><path d="${I.badge}"/></svg>` : '';

// ---------- state / api ----------
let token = localStorage.getItem('z_token');
let me = null, badges = { notifs: 0, dms: 0 };
const posts = new Map(); // id -> post (live counters, optimistic toggles)
async function api(path, method = 'GET', body) {
  const r = await fetch('/api' + path, { method, headers: { 'content-type': 'application/json', 'x-token': token || '' }, body: body ? JSON.stringify(body) : undefined });
  if (r.status === 401 && token) { localStorage.removeItem('z_token'); token = null; location.reload(); throw new Error('auth'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || 'error'), { status: r.status });
  return j;
}
function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.append(d); setTimeout(() => d.remove(), 4000); }

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
  const d = new Date(ts), y = d.getFullYear() !== new Date().getFullYear();
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(y ? { year: 'numeric' } : {}) });
}
const fullTime = ts => { const d = new Date(ts); return `${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} · ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`; };
const growth = (t, created, tau) => t * (1 - Math.exp(-Math.max(0, Date.now() - created) / 1000 / tau));
function count(p, k) {
  if (k === 'likes') return Math.floor(growth(p.likes_t, p.created, p.tau)) + (p.liked ? 1 : 0);
  if (k === 'reposts') return Math.floor(growth(p.reposts_t, p.created, p.tau)) + (p.reposted ? 1 : 0);
  if (k === 'replies') return Math.max(p.real_replies, Math.floor(growth(p.replies_t, p.created, p.tau)));
  if (k === 'bookmarks') return p.bookmarked ? 1 : 0;
  return Math.floor(growth(p.views_t, p.created, p.tau * 1.5));
}
const shortN = (v, k) => { const t = compact(v); return t === '0' ? '' : t; };
function linkify(t) {
  return esc(t).replace(/(^|[\s(])(#[\p{L}\p{N}_]+)/gu, '$1<a class="tag" href="#/search?q=$2">$2</a>')
    .replace(/(^|[\s(])@(\w{1,15})/g, '$1<a class="tag" href="#/u/$2">@$2</a>')
    .replace(/(https?:\/\/[^\s<]+)/g, '<a class="tag" href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
}

// ---------- avatars (X's default grey silhouette; gold-check organisations get square avatars) ----------
const SIL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 11.5a3.6 3.6 0 1 0 0-7.200 3.600 3.600 0 0 0 0 7.200zm0 1.900c-3.800 0-7 2.500-7.800 6.500-.1.600.4 1.100 1 1.100h13.600c.6 0 1.100-.5 1-1.100-.8-4-4-6.500-7.800-6.500z" fill="#71767b"/></svg>';
function av(a, cls = '') {
  cls += a.verified === 'gold' ? ' sq' : '';
  const fb = `<div class="av def ${cls}">${SIL}</div>`;
  if (!a.pfp) return fb;
  return `<img class="av ${cls}" src="${esc(a.pfp)}" loading="lazy" alt="" referrerpolicy="no-referrer" onerror="this.outerHTML=this.dataset.fb" data-fb="${esc(fb)}">`;
}
const nameLine = a => `<b>${esc(a.name)}</b>${verified(a.verified)}`;

// ---------- post card (X layout) ----------
function actionBtn(cls, icon, p, k, label, extra = '') {
  const n = k ? shortN(count(p, k)) : '';
  return `<button class="ab ${cls} ${extra}" data-act="${cls}" data-id="${p.id}" aria-label="${label}"><span class="ic">${svg(icon)}</span>${k ? `<span class="n" data-live="${k}" data-id="${p.id}">${n}</span>` : ''}</button>`;
}
function actsHTML(p, big = false) {
  return `<div class="acts ${big ? 'big' : ''}"><div class="ag">
    ${actionBtn('rp', 'reply', p, big ? null : 'replies', 'Reply')}
    ${actionBtn('rt', 'rt', p, big ? null : 'reposts', 'Repost', p.reposted ? 'on' : '')}
    <button class="ab lk ${p.liked ? 'on' : ''}" data-act="lk" data-id="${p.id}" aria-label="Like"><span class="ic"><svg viewBox="0 0 24 24"><path d="${p.liked ? I.hearts : I.heart}"/></svg></span>${big ? '' : `<span class="n" data-live="likes" data-id="${p.id}">${shortN(count(p, 'likes'))}</span>`}</button>
    ${big ? '' : `<button class="ab vw" data-act="vw" data-id="${p.id}" aria-label="Views"><span class="ic">${svg('views')}</span><span class="n" data-live="views" data-id="${p.id}">${shortN(count(p, 'views'))}</span></button>`}
    ${big ? actionBtn('bm', p.bookmarked ? 'bookmarkF' : 'bookmark', p, null, 'Bookmark', p.bookmarked ? 'on' : '') : ''}
    ${big ? actionBtn('sh', 'share', p, null, 'Share') : ''}
  </div>${big ? '' : `<div class="ag r">${actionBtn('bm', p.bookmarked ? 'bookmarkF' : 'bookmark', p, null, 'Bookmark', p.bookmarked ? 'on' : '')}${actionBtn('sh', 'share', p, null, 'Share')}</div>`}</div>`;
}
function quoteHTML(q) {
  return `<div class="quote" data-go="#/post/${q.id}"><div class="head">${av(q.author, 'xs')}<b>${esc(q.author.name)}</b>${verified(q.author.verified)}<span class="mute">@${esc(q.author.handle)} · ${ago(q.created)}</span></div><div class="txt">${linkify(q.text)}</div></div>`;
}
function postHTML(p, o = {}) {
  posts.set(p.id, p);
  const a = p.author;
  return `<article class="post ${o.line ? 'has-line' : ''} ${o.last ? 'last' : ''}" data-go="#/post/${p.id}" data-pid="${p.id}">
    ${o.context ? `<div class="pctx">${o.context}</div>` : ''}
    <div class="prow">
      <div class="avcol"><a href="#/u/${esc(a.handle)}" class="avlink">${av(a)}</a>${o.line ? '<div class="thread-line"></div>' : ''}</div>
      <div class="body">
        <div class="head"><a href="#/u/${esc(a.handle)}" class="nm">${nameLine(a)}</a><span class="mute hd">@${esc(a.handle)}</span><span class="mute dot">·</span><a class="mute tm" href="#/post/${p.id}" data-ago="${p.created}" title="${esc(fullTime(p.created))}">${ago(p.created)}</a>
          <button class="menu-btn" data-act="menu" data-id="${p.id}" aria-label="More">${svg('dots')}</button></div>
        ${o.showReplyTo && p.reply_to ? `<div class="mute rto">Replying to <a class="tag" href="#/u/${esc(p.reply_to)}">@${esc(p.reply_to)}</a></div>` : ''}
        <div class="txt">${linkify(p.text)}</div>${p.quoted ? quoteHTML(p.quoted) : ''}
        ${actsHTML(p)}
      </div></div></article>`;
}
// live counters (likes keep climbing, timestamps tick)
function tickLive() {
  $$('[data-live]').forEach(el => { const p = posts.get(+el.dataset.id); if (p) el.textContent = shortN(count(p, el.dataset.live)); });
  $$('[data-detail]').forEach(el => { const p = posts.get(+el.dataset.id); if (p) el.textContent = Number(count(p, el.dataset.detail)).toLocaleString(); });
  $$('[data-ago]').forEach(el => el.textContent = ago(+el.dataset.ago));
}
setInterval(tickLive, 1200);
function refreshBtns(id) {
  const p = posts.get(id); if (!p) return;
  $$(`[data-act="lk"][data-id="${id}"]`).forEach(b => { b.classList.toggle('on', p.liked); b.querySelector('path').setAttribute('d', p.liked ? I.hearts : I.heart); if (p.liked) { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); } });
  $$(`[data-act="rt"][data-id="${id}"]`).forEach(b => b.classList.toggle('on', p.reposted));
  $$(`[data-act="bm"][data-id="${id}"]`).forEach(b => { b.classList.toggle('on', p.bookmarked); b.querySelector('path').setAttribute('d', p.bookmarked ? I.bookmarkF : I.bookmark); });
  tickLive();
}
const skeleton = (n = 5) => Array.from({ length: n }, () => `<div class="post sk"><div class="prow"><div class="avcol"><div class="av shimmer"></div></div><div class="body"><div class="shimmer" style="height:14px;width:38%;margin:4px 0 10px"></div><div class="shimmer" style="height:13px;width:92%;margin-bottom:7px"></div><div class="shimmer" style="height:13px;width:70%"></div></div></div></div>`).join('');

// ---------- popover menus & modals ----------
let openMenuEl = null;
function closeMenu() { openMenuEl?.remove(); openMenuEl = null; }
function openMenu(anchor, items, { align = 'right' } = {}) {
  closeMenu();
  const m = document.createElement('div'); m.className = 'popmenu'; m.setAttribute('role', 'menu');
  m.innerHTML = items.filter(Boolean).map((it, i) => `<button class="pi ${it.danger ? 'danger' : ''}" data-i="${i}">${it.icon ? svg(it.icon) : ''}<span>${it.label}</span></button>`).join('');
  document.body.append(m);
  const r = anchor.getBoundingClientRect(), w = m.offsetWidth, h = m.offsetHeight;
  let left = align === 'right' ? r.right - w : r.left, top = r.bottom + 4;
  if (top + h > innerHeight - 8) top = Math.max(8, r.top - h - 4);
  m.style.left = Math.max(8, Math.min(left, innerWidth - w - 8)) + 'px'; m.style.top = top + 'px';
  const list = items.filter(Boolean);
  m.onclick = e => { const b = e.target.closest('.pi'); if (!b) return; e.stopPropagation(); closeMenu(); list[+b.dataset.i].onClick(); };
  openMenuEl = m;
}
document.addEventListener('mousedown', e => { if (openMenuEl && !openMenuEl.contains(e.target)) closeMenu(); }, true);
function openModal(html, { onMount, cls = '' } = {}) {
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="box ${cls}"><div class="mx"><button class="xbtn" aria-label="Close">${svg('close')}</button></div>${html}</div>`;
  document.body.append(m); document.body.classList.add('noscroll');
  const close = () => { m.remove(); if (!$('.modal')) document.body.classList.remove('noscroll'); };
  m.onmousedown = e => { if (e.target === m) close(); };
  $('.xbtn', m).onclick = close;
  onMount && onMount(m, close);
  return { el: m, close };
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (openMenuEl) closeMenu(); else $('.modal:last-of-type')?.querySelector('.xbtn')?.click(); } });

// ---------- composer (X style: avatar, textarea, tool icons, character ring, Post button) ----------
const NA = () => toast("That isn't available in Z yet");
function ring(len) {
  const left = 280 - len, pct = Math.min(1, len / 280), c = 2 * Math.PI * 10, over = left < 0;
  const color = over ? '#f4212e' : left <= 20 ? '#ffd400' : '#1d9bf0';
  return `<svg viewBox="0 0 24 24" class="ring"><circle cx="12" cy="12" r="10" fill="none" stroke="#2f3336" stroke-width="2"/><circle cx="12" cy="12" r="10" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}" transform="rotate(-90 12 12)" stroke-linecap="round"/></svg>${left <= 20 ? `<span class="rn" style="color:${over ? '#f4212e' : 'var(--mute)'}">${left}</span>` : ''}`;
}
function composeHTML({ placeholder = 'What is happening?!', btn = 'Post', id = 'c' + Math.random().toString(36).slice(2, 7), replyHint = false, quote = null } = {}) {
  return `<div class="compose" id="${id}">${av(me)}<div class="cbody">
    ${replyHint ? '' : ''}<textarea maxlength="400" placeholder="${placeholder}" rows="1" aria-label="${placeholder}"></textarea>
    ${quote ? quoteHTML(quote) : ''}
    <div class="reply-perm">${svg('globe')}<span>Everyone can reply</span></div>
    <div class="crow"><div class="tools">${['image', 'gif', 'poll', 'emoji', 'schedule', 'pin'].map(k => `<button type="button" class="tool" data-na aria-label="${k}">${svg(k)}</button>`).join('')}</div>
      <div class="cright"><div class="ringwrap"></div><button class="btn post-btn" disabled>${btn}</button></div></div></div></div>`;
}
function wireCompose(root, { parent_id, quote_of, onDone } = {}) {
  const ta = $('textarea', root), b = $('.post-btn', root), rw = $('.ringwrap', root);
  const upd = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; const n = ta.value.length; b.disabled = !ta.value.trim() || n > 280; rw.innerHTML = n ? ring(n) : ''; root.classList.toggle('active', !!n || document.activeElement === ta); };
  ta.oninput = upd; ta.onfocus = () => root.classList.add('active'); ta.onblur = () => !ta.value && root.classList.remove('active');
  $$('[data-na]', root).forEach(t => t.onclick = NA);
  const submit = async () => {
    if (b.disabled) return; b.disabled = true;
    try {
      const r = await api('/post', 'POST', { text: ta.value, parent_id, quote_of });
      ta.value = ''; upd();
      if (r.events.includes('noticed')) toast('👀 Someone famous may have noticed your reply…');
      else if (r.events.includes('viral')) toast('🔥 Your post is taking off!');
      onDone && onDone(r.post); pollNow();
    } catch (e) { toast('Something went wrong. Try again.'); b.disabled = false; }
  };
  b.onclick = submit;
  ta.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') submit(); });
}
function openComposeModal({ parent, quote } = {}) {
  const ctx = parent ? `<div class="mctx"><div class="avcol">${av(parent.author)}<div class="thread-line"></div></div><div class="body"><div class="head"><b>${esc(parent.author.name)}</b>${verified(parent.author.verified)}<span class="mute">@${esc(parent.author.handle)} · ${ago(parent.created)}</span></div><div class="txt">${linkify(parent.text)}</div><div class="mute rto" style="margin-top:12px">Replying to <span class="tag">@${esc(parent.author.handle)}</span></div></div></div>` : '';
  openModal(ctx + composeHTML({ id: 'mc', placeholder: parent ? 'Post your reply' : quote ? 'Add a comment' : 'What is happening?!', btn: parent ? 'Reply' : 'Post', quote }), {
    cls: 'compose-modal',
    onMount: (m, close) => { wireCompose($('#mc', m), { parent_id: parent?.id, quote_of: quote?.id, onDone: p => { close(); window.onPosted && window.onPosted(p, parent); } }); $('textarea', m).focus(); $('#mc', m).classList.add('active'); },
  });
}

// ---------- shared user rows ----------
function followBtn(a, following) {
  return `<button class="fbtn ${following ? 'on' : ''}" data-follow="${esc(a.handle)}"><span class="t0">Follow</span><span class="t1">Following</span><span class="t2">Unfollow</span></button>`;
}
function userRowHTML(a, { follow = true, following = false } = {}) {
  return `<div class="urow" data-go="#/u/${esc(a.handle)}">${av(a)}<div class="info"><div class="nl"><b>${esc(a.name)}</b>${verified(a.verified)}</div><div class="mute">@${esc(a.handle)}</div>${a.bio ? `<div class="ubio">${esc(a.bio)}</div>` : ''}</div>${follow ? followBtn(a, following) : ''}</div>`;
}
