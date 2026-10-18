// The Z cast. Each entry carries a persona card used in every generation prompt (see ai.js).
// Edit cast/*.js to change who talks, how they talk, and how often (ppd = posts/day, rpd = replies/day).
const all = [...require('./cast/music'), ...require('./cast/people'), ...require('./cast/media')];
const seen = new Set();
const pfp = require('./cast/pfp');
module.exports = all.filter(a => !seen.has(a.handle.toLowerCase()) && seen.add(a.handle.toLowerCase())).map(a => ({ ...a, pfp: pfp[a.handle] || `https://unavatar.io/x/${a.handle}` }));
