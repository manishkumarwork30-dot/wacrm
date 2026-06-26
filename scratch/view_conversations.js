import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

async function run() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  console.log('--- Checking Conversations ---');
  const { data: conversations, error } = await db
    .from('conversations')
    .select('*, contacts(id, phone, name)')
    .order('last_message_at', { ascending: false });
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log(JSON.stringify(conversations, null, 2));
  }
}

run();
