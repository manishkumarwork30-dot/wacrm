import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

async function run() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  console.log('--- Checking 10 Latest Messages ---');
  const { data: messages, error: msgErr } = await db
    .from('messages')
    .select('*, conversations(id, contacts(id, phone, name))')
    .order('created_at', { ascending: false })
    .limit(10);
  if (msgErr) {
    console.error('Error fetching messages:', msgErr);
  } else {
    console.log(JSON.stringify(messages, null, 2));
  }
}

run();
