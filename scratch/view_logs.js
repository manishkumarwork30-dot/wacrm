import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

async function run() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  console.log('--- Checking 10 Latest Automation Logs ---');
  const { data: logs, error: err } = await db
    .from('automation_logs')
    .select('*, automations(name)')
    .order('created_at', { ascending: false })
    .limit(10);
  if (err) {
    console.error('Error fetching logs:', err);
  } else {
    console.log(JSON.stringify(logs, null, 2));
  }
}

run();
