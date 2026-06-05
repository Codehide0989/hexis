import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const PORT = process.env.PORT || 3000;
const BOT_SHARED_SECRET = process.env.BOT_SHARED_SECRET || 'change-me';

app.use(cors());
app.use(express.json({ limit: '2mb' }));

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase')
    ? { rejectUnauthorized: false } : false,
});

function checkBotAuth(req, res, next) {
  if ((req.headers['x-bot-secret'] || req.query.secret) !== BOT_SHARED_SECRET)
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  next();
}

// === Discord OAuth exchange ===
app.post('/api/discord/oauth/exchange', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.json({ ok: false, error: 'missing_code' });

    const clientId     = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirect     = process.env.DISCORD_OAUTH_REDIRECT
      || `${process.env.VITE_APP_URL || 'http://localhost:5173'}/auth/discord/callback`;
    if (!clientId || !clientSecret)
      return res.json({ ok: false, error: 'discord_oauth_not_configured' });

    const tokRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId, client_secret: clientSecret,
        grant_type: 'authorization_code', code, redirect_uri: redirect,
      }),
    });
    const tok = await tokRes.json();
    if (!tokRes.ok || !tok.access_token)
      return res.json({ ok: false, error: tok.error || 'token_failed' });

    const meRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tok.access_token}` },
    });
    const me = await meRes.json();
    if (!meRes.ok || !me.id) return res.json({ ok: false, error: 'me_failed' });

    const avatarUrl = me.avatar
      ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.${me.avatar.startsWith('a_') ? 'gif' : 'png'}?size=256`
      : `https://cdn.discordapp.com/embed/avatars/${(Number(me.discriminator || 0) || (BigInt(me.id) >> 22n) % 6n)}.png`;

    return res.json({
      ok: true,
      profile: { id: me.id, username: me.username, global_name: me.global_name || null,
                 avatar: me.avatar, email: me.email || null, avatarUrl },
    });
  } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
});

// === Bot sync endpoints ===
app.get('/api/sync/user/:discord_id', checkBotAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, username, plan, discord_username, discord_avatar, plan_expires_at FROM users WHERE discord_id = $1 LIMIT 1',
      [req.params.discord_id]);
    if (!rows.length) return res.json({ ok: false, error: 'not_linked' });
    res.json({ ok: true, user: rows[0] });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/sync/event', checkBotAuth, async (req, res) => {
  try {
    const { user_id, discord_id, event_type, payload } = req.body;
    await pool.query(
      'INSERT INTO discord_sync_events (user_id, discord_id, event_type, payload) VALUES ($1,$2,$3,$4)',
      [user_id || null, discord_id || null, event_type, payload || {}]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/sync/consume-code', checkBotAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE discord_link_codes SET consumed = true
       WHERE code = $1 AND consumed = false AND expires_at > now()
       RETURNING user_id`, [req.body.code]);
    if (!rows.length) return res.json({ ok: false, error: 'invalid_or_expired' });
    res.json({ ok: true, user_id: rows[0].user_id });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.get('/health', (_req, res) => res.json({ ok: true }));

// === Existing Resend proxy ===
app.post('/api/resend/emails', async (req, res) => {
  try {
    const apiKey = process.env.VITE_RESEND_API_KEY || process.env.RESEND_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'Missing Resend API Key in server environment' });
    }
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ success: false, error: data.message || 'Email failed to send' });
    }
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// === Existing Admin Reset endpoint ===
app.get('/api/admin/reset', async (req, res) => {
  const secret = req.query.secret;
  if (secret !== 'reset123') {
    return res.status(403).send('Forbidden: Invalid secret key. Use /api/admin/reset?secret=reset123');
  }
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return res.status(500).send('Error: DATABASE_URL env variable is missing on server.');
  }
  try {
    const result = await pool.query('DELETE FROM admin_users;');
    res.send(`SUCCESS: Deleted ${result.rowCount} admin user(s). The setup wizard is now unlocked at /admin/setup.`);
  } catch (err) {
    res.status(500).send('Database error: ' + err.message);
  }
});

// === Admin Setup endpoint (Bypasses RLS since it runs server-side with DATABASE_URL) ===
app.post('/api/admin/setup', async (req, res) => {
  const { username, email, password_hash, md5_hash } = req.body;
  if (!username || !email || !password_hash || !md5_hash) {
    return res.status(400).json({ ok: false, error: 'Missing required fields' });
  }
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return res.status(500).json({ ok: false, error: 'DATABASE_URL env variable is missing on server' });
  }
  try {
    const query = `
      INSERT INTO admin_users (username, email, password_hash, md5_hash, is_super_admin)
      VALUES ($1, $2, $3, $4, true)
      ON CONFLICT (username)
      DO UPDATE SET
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash,
        md5_hash = EXCLUDED.md5_hash,
        is_super_admin = true
      RETURNING id, username, email, is_super_admin
    `;
    const result = await pool.query(query, [username, email, password_hash, md5_hash]);
    res.json({ ok: true, admin: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
  }
});

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => console.log(`[HEXIS API] :${PORT}`));
}

export default app;
