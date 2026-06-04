import pg from 'pg';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const { Client } = pg;

async function setupDatabase() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ ERROR: DATABASE_URL is missing in .env');
    console.log('Please add your Supabase connection string to .env:');
    console.log('DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.cmonxrlzschuorzskfsn.supabase.co:5432/postgres');
    process.exit(1);
  }

  const client = new Client({
    connectionString: dbUrl,
  });

  try {
    await client.connect();
    console.log('✅ Connected to Supabase PostgreSQL database.');

    const schemaPath = path.join(process.cwd(), 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('⏳ Executing schema.sql...');
    await client.query(schemaSql);
    
    console.log('✅ All tables pushed successfully!');
  } catch (error) {
    console.error('❌ Error executing SQL:', error);
  } finally {
    await client.end();
  }
}

setupDatabase();
