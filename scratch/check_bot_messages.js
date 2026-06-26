import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

async function run() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const { data: messages, error } = await db
    .from('messages')
    .select('*, conversations(id, contacts(id, phone, name))')
    .eq('sender_type', 'bot')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Bot messages:', JSON.stringify(messages, null, 2));
  }
}

run();
