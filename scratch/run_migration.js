import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env.local
const envLocalPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envLocalPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
  if (match) {
    const key = match[1].trim();
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  try {
    const sqlPath = path.join(__dirname, '../supabase/migrations/022_twilio_opted_out.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log("Running migration...");
    const { data, error } = await supabase.rpc('admin_sql', { query: sql });
    if (error) {
      console.error("Migration failed:", error);
    } else {
      console.log("Migration executed successfully:", data);
    }
  } catch (err) {
    console.error("Error executing migration:", err);
  }
}

run();
