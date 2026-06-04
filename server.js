import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import pg from 'pg';

const { Client } = pg;

// Load environment variables for local testing. In production (Railway), these will be injected by the environment.
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API Endpoint to proxy emails to Resend
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

// Reset Admin Endpoint (Temporary reset bypass via production network)
app.get('/api/admin/reset', async (req, res) => {
  const secret = req.query.secret;
  if (secret !== 'reset123') {
    return res.status(403).send('Forbidden: Invalid secret key. Use /api/admin/reset?secret=reset123');
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return res.status(500).send('Error: DATABASE_URL env variable is missing on server.');
  }

  const client = new Client({
    connectionString: dbUrl,
  });

  try {
    await client.connect();
    const result = await client.query('DELETE FROM admin_users;');
    res.send(`SUCCESS: Deleted ${result.rowCount} admin user(s). The setup wizard is now unlocked at /admin/setup.`);
  } catch (err) {
    res.status(500).send('Database error: ' + err.message);
  } finally {
    await client.end();
  }
});

// Serve static files from the Vite build directory
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback for React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
