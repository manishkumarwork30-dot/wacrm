import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

async function run() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = '8782904e-82a9-4dd7-b59b-84f1f97ef2f3';

  // Restore Web Form in DB
  const { data: tmpl } = await db.from('message_templates').select('*').eq('user_id', userId).eq('name', '__chatbot_config').single();
  let buttons = tmpl.buttons || {};
  buttons.use_web_form = true;
  buttons.flow_id = '';
  buttons.use_template_welcome = false; // So it sends the CTA Url Button instead
  await db.from('message_templates').update({ buttons }).eq('id', tmpl.id);

  console.log('Switched back to Web Form Mode.');
}

run();
