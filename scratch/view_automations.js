import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

async function run() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: automations, error } = await db.from('automations').select('*');
  if (error) {
    console.error('Error fetching automations:', error);
    return;
  }
  console.log('Automations:', JSON.stringify(automations, null, 2));
}

run();
