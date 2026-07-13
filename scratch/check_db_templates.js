import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

async function run() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const { data, error } = await db
    .from('message_templates')
    .select('name, language, status')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Templates in DB:');
    for (const t of data || []) {
      console.log(`  ${t.name} | language: "${t.language}" | status: ${t.status}`);
    }
  }
}
run();
