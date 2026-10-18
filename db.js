const { Pool } = require('pg');
const url = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/z';
const ssl = process.env.PGSSL === 'true' || /rlwy\.net|railway\.app/.test(url) && !/railway\.internal/.test(url) ? { rejectUnauthorized: false } : undefined;
const pool = new Pool({ connectionString: url, ssl, max: 10 });
pool.on('error', e => console.error('[pg]', e.message));
const q = (s, p) => pool.query(s, p).then(r => r.rows);
const q1 = (s, p) => q(s, p).then(r => r[0]);

async function init() {
  await q(`
CREATE TABLE IF NOT EXISTS accounts(
  id SERIAL PRIMARY KEY, handle TEXT UNIQUE NOT NULL, name TEXT NOT NULL, bio TEXT DEFAULT '',
  followers BIGINT DEFAULT 0, following INT DEFAULT 0, verified TEXT DEFAULT 'none', kind TEXT NOT NULL,
  pfp TEXT, voice TEXT, activity REAL DEFAULT 1, token TEXT UNIQUE, bonus_followers BIGINT DEFAULT 0,
  last_dm_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now());
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS topics TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS ppd REAL DEFAULT 1;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS rpd REAL DEFAULT 0.5;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS tuned BOOLEAN DEFAULT false;
CREATE TABLE IF NOT EXISTS posts(
  id SERIAL PRIMARY KEY, author_id INT NOT NULL REFERENCES accounts(id), text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(), likes_target BIGINT DEFAULT 0, reposts_target BIGINT DEFAULT 0,
  replies_target BIGINT DEFAULT 0, views_target BIGINT DEFAULT 0, tau INT DEFAULT 900,
  parent_id INT, quote_of INT, replies_gen INT DEFAULT 0, viral BOOLEAN DEFAULT false);
CREATE INDEX IF NOT EXISTS posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS posts_parent ON posts(parent_id);
CREATE INDEX IF NOT EXISTS posts_author ON posts(author_id, created_at DESC);
CREATE TABLE IF NOT EXISTS likes(user_id INT, post_id INT, PRIMARY KEY(user_id, post_id));
CREATE TABLE IF NOT EXISTS reposts(user_id INT, post_id INT, PRIMARY KEY(user_id, post_id));
CREATE TABLE IF NOT EXISTS follows(user_id INT, account_id INT, PRIMARY KEY(user_id, account_id));
CREATE TABLE IF NOT EXISTS dms(id SERIAL PRIMARY KEY, user_id INT, account_id INT, from_user BOOLEAN, text TEXT, created_at TIMESTAMPTZ DEFAULT now());
CREATE INDEX IF NOT EXISTS dms_conv ON dms(user_id, account_id, created_at);
CREATE TABLE IF NOT EXISTS notifs(id SERIAL PRIMARY KEY, user_id INT, type TEXT, actor_id INT, post_id INT, text TEXT, created_at TIMESTAMPTZ DEFAULT now(), read BOOLEAN DEFAULT false);
CREATE INDEX IF NOT EXISTS notifs_user ON notifs(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS kv(k TEXT PRIMARY KEY, v JSONB, updated_at TIMESTAMPTZ DEFAULT now());`);
}
module.exports = { pool, q, q1, init };
