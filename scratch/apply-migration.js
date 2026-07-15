import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config({ path: '.env.local' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.join(__dirname, '../supabase/migrations/024_add_android_sms_gateway.sql');
const migrationSql = fs.readFileSync(migrationPath, 'utf8');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  console.log('Applying migration...');
  const { data, error } = await supabase.rpc('admin_sql', { query: migrationSql });
  if (error) {
    console.error('Error applying migration via admin_sql RPC:', error);
    process.exit(1);
  }
  console.log('Migration applied successfully:', data);
}

run();
