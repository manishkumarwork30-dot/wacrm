import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

async function run() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  // Check recent broadcasts
  const { data } = await db
    .from('broadcasts')
    .select('id, name, template_name, template_language, status, total_recipients, sent_count, delivered_count, failed_count')
    .order('created_at', { ascending: false })
    .limit(5);
  
  console.log('Recent broadcasts:');
  for (const b of data || []) {
    console.log(`\n  Name: ${b.name}`);
    console.log(`  Template: ${b.template_name}`);
    console.log(`  Language: "${b.template_language}"`);
    console.log(`  Status: ${b.status}`);
    console.log(`  Total: ${b.total_recipients} | Sent: ${b.sent_count} | Delivered: ${b.delivered_count} | Failed: ${b.failed_count}`);
  }
}
run();
