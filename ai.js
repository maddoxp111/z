// Haiku 5.5 content generation, with offline fallbacks so Z still works without a key.
const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.Z_MODEL || 'claude-haiku-5-5';
const BASE = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';

const SAFETY = `This is "Z", a parody social network where every account except the player is AI-written fiction. Keep everything playful and clearly fictional: no real crimes, deaths, diseases, sexual content, slurs, or serious allegations about real people. Output ONLY valid JSON, no prose, no code fences.`;

async function ask(prompt, max = 1800, system = SAFETY) {
  if (!KEY) return null;
  try {
    const r = await fetch(BASE + '/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: max, thinking: { type: 'disabled' }, system, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!r.ok) { console.error('[ai]', r.status, (await r.text()).slice(0, 200)); return null; }
    const j = await r.json();
    return (j.content || []).map(c => c.text || '').join('');
  } catch (e) { console.error('[ai] fail', e.message); return null; }
}
async function askJSON(prompt, max, system) {
  const t = await ask(prompt, max, system);
  if (!t) return null;
  const m = t.match(/[\[{][\s\S]*[\]}]/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}
const pick = a => a[Math.floor(Math.random() * a.length)];

// ---------- fallbacks ----------
const NEWS = ['Local man discovers 14 unread emails, declares inbox "under control"', 'Scientists confirm Tuesdays remain Tuesdays', 'City council votes to add 3 more benches to park, benches "thrilled"', 'Study: 9 in 10 group chats now dead by Wednesday', 'Man who said "I\'ll be there in 5" still en route after 3 hours', 'Airline introduces premium tier for people who just want to sit quietly', 'Experts warn of extremely good weather this weekend'];
const GEN = ['Big things coming.', 'Thank you all for the love 🙏', 'Today was a good day.', 'Who\'s up?', 'Locked in.', 'You\'ll see soon 👀', 'No days off.', 'Appreciate everybody who showed up tonight.', 'Sometimes you just gotta believe.'];
const COMM = ['🚨 JUST IN: Fans are losing it after surprise announcement tonight', 'Y\'all see this?? 👀', 'EXCLUSIVE: Sources say plans are "in the works"', 'Chart update: new peak reached this week 📈'];
const REPLIES = ['lmaooo not you posting this', 'this is the best thing I\'ve seen all day', 'ratio incoming', 'nah this can\'t be real 😭', 'W take', 'I need an explanation', 'the timeline is undefeated today', 'first', 'respectfully... no', 'goated', 'who let them cook', 'this ain\'t it chief', 'I\'m screaming', 'me reading this at 3am 💀', 'can someone explain', 'ok but why is this true'];
const FIRST = ['Jay', 'Mia', 'Tre', 'Luna', 'Kai', 'Zoe', 'Dre', 'Nina', 'Omar', 'Lexi', 'Cole', 'Sasha', 'Rico', 'Hana', 'Theo', 'Maya', 'Jordan', 'Vince', 'Amara', 'Beck'];
const SUF = ['stan', 'vibes', 'daily', 'wav', 'online', 'xo', 'fr', 'corner', 'tv', 'hq'];
const fbPost = a => ({ handle: a.handle, text: a.kind === 'news' ? pick(NEWS) : a.kind === 'commentary' ? pick(COMM) : pick(GEN) });
function fbReplies(n) {
  return Array.from({ length: n }, (_, i) => {
    const f = pick(FIRST), s = pick(SUF);
    return { name: f + ' ' + (Math.random() < .5 ? s : ''), handle: (f + s + Math.floor(Math.random() * 99)).toLowerCase(), bio: '', text: pick(REPLIES), parent: i > 2 && Math.random() < .4 ? Math.floor(Math.random() * i) : null };
  });
}

// ---------- generators ----------
async function genPosts(accts) {
  const list = accts.map(a => `- @${a.handle} (${a.name}, ${a.kind}): voice = ${a.voice}`).join('\n');
  const j = await askJSON(`Write ONE brand-new post (max 240 chars, in-universe, as of right now) for each account below, in that account's authentic voice. News/commentary accounts invent fresh, specific, fictional-but-plausible (and silly/harmless) stories; be specific, not generic. Vary formats.\n${list}\n\nReturn JSON array: [{"handle":"...","text":"..."}]`, 1500);
  if (!Array.isArray(j)) return accts.map(fbPost);
  const norm = h => String(h).replace(/^@/, '').toLowerCase();
  const out = j.filter(x => x && x.handle && x.text);
  return accts.map(a => { const f = out.find(x => norm(x.handle) === a.handle.toLowerCase()); return f ? { handle: a.handle, text: String(f.text) } : fbPost(a); });
}
// Generates fake-people replies to a post (some are threaded: "parent" = index of an earlier reply).
async function genReplies({ authorHandle, authorName, text, n, existing = [] }) {
  const ctx = existing.length ? `\nAlready posted (do not repeat): ${existing.slice(0, 6).map(t => JSON.stringify(t)).join(' | ')}` : '';
  const j = await askJSON(`Post by ${authorName} (@${authorHandle}): ${JSON.stringify(text)}${ctx}\n\nWrite ${n} replies from made-up random internet users: fans, haters, jokers, trolls, confused folks, meme-ers, "first!" types, other pages. Real-feeling X replies: slang, typos, emoji, lowercase, short (most <120 chars). About a third must be replies to an earlier reply in your array (set "parent" to that array index; otherwise null) forming mini-arguments or jokes. Invent each user's display name and handle (unique, realistic, mixed styles) and a short bio (can be empty).\nJSON array: [{"name":"","handle":"","bio":"","text":"","parent":null}]`, 2200);
  return Array.isArray(j) && j.length ? j.filter(x => x && x.text && x.handle) : fbReplies(n);
}
async function genUserReplies({ userName, userHandle, text, ctx, n }) {
  const j = await askJSON(`The player ${userName} (@${userHandle}) posted${ctx ? ' ' + ctx : ''}: ${JSON.stringify(text)}\nWrite ${n} replies from made-up users reacting to this exact message (react to its content, not generically). Mix supportive, jokey, skeptical. Short, realistic X style.\nJSON array: [{"name":"","handle":"","bio":"","text":"","parent":null}]`, 1200);
  return Array.isArray(j) && j.length ? j.filter(x => x && x.text && x.handle) : fbReplies(n);
}
async function genCelebReply(a, { postText, userText, userName, fame }) {
  const j = await askJSON(`You are ${a.name} (@${a.handle}), voice: ${a.voice}. A fan named ${userName} (about ${fame} followers) ${postText ? `commented on your post ${JSON.stringify(postText)}:` : 'posted:'} ${JSON.stringify(userText)}\nWrite your short reply (<200 chars), noticing them in-voice (funny/impressed/teasing). JSON: {"text":""}`, 300);
  return j && j.text ? j.text : pick(['ok this is actually funny 😭', 'respect.', 'Who is this? Love it', 'W comment', 'lmaooo I see you 👀']);
}
async function genDMReply(a, { history, userName, fame, ratio }) {
  const stance = ratio < 0.0005 ? 'The user is a total nobody to you. Be dismissive, short, maybe skeptical, "who is this", or give a polite brush-off. Do not agree to anything.' : ratio < 0.01 ? 'The user is small but you are mildly aware of them. Be lukewarm, brief, slightly condescending but not rude.' : ratio < 0.1 ? 'The user has a real following. Be friendly and receptive, open to collabs.' : 'The user is almost as famous as you. Be warm, respectful, treat them as an equal.';
  const j = await askJSON(`You are ${a.name} (@${a.handle}), a ${a.kind} account. Voice: ${a.voice}. You are replying in a DM to ${userName} who has ${fame} followers (you have ${a.followers}). ${stance}\nConversation so far (oldest first):\n${history.map(h => (h.from_user ? userName : a.name) + ': ' + h.text).join('\n')}\n\nWrite your next DM, 1-2 sentences, in-voice. JSON: {"text":""}`, 300);
  return j && j.text ? j.text : pick(['who dis', 'lol ok', 'appreciate it', 'hit me later']);
}
async function genIncomingDM({ userName, fame, sender }) {
  const j = await askJSON(`Write a first DM sent to ${userName} (a rising account with ${fame} followers) from ${sender.kind === 'celeb' ? `${sender.name} (@${sender.handle}), voice: ${sender.voice}, reaching out because they noticed ${userName} blowing up` : `a made-up random internet user named ${sender.name}`}. ${sender.kind === 'celeb' ? 'Something like a collab, shoutout or compliment.' : 'Pick one: wants you to get them a shoutout, asks you to connect them with a celeb, fan gushing, or asks for a follow back, or pitches something silly.'} 1-2 sentences, casual DM style.\nJSON: {"text":""}`, 250);
  return j && j.text ? j.text : (sender.kind === 'celeb' ? 'yo saw your posts, we should link' : 'bro can u shout me out? i have 12 followers 😭');
}
async function genTrends() {
  const j = await askJSON(`Invent 8 fictional trending topics on a parody social network right now (mix of entertainment, hip-hop, sports, news, memes). Include one hashtag. JSON array: [{"cat":"Trending in Music","topic":"","posts":"123K"}]`, 600);
  return Array.isArray(j) && j.length ? j.slice(0, 10) : [
    { cat: 'Trending in Music', topic: '#ZAlbumFriday', posts: '184K' }, { cat: 'Sports · Trending', topic: 'Game 7', posts: '92.3K' },
    { cat: 'Entertainment · Trending', topic: 'Surprise drop', posts: '51.2K' }, { cat: 'Trending', topic: 'Benches', posts: '12.4K' }, { cat: 'Politics · Trending', topic: 'Inbox Zero', posts: '8,311' }];
}
module.exports = { genPosts, genReplies, genUserReplies, genCelebReply, genDMReply, genIncomingDM, genTrends, hasKey: !!KEY, MODEL };
