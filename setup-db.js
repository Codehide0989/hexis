import fs from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function setup() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database.');

    const sql = fs.readFileSync('supabase_schema.sql', 'utf8');
    await client.query(sql);
    console.log('Schema executed successfully.');
  } catch (err) {
    console.error('Error executing schema:', err);
  } finally {
    await client.end();
  }
}

setup();
