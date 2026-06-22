const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envLocalPath = path.join(__dirname, '..', '.env.local');
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
  console.log('--- WhatsApp Configs ---');
  const { data: configs, error: configErr } = await supabase.from('whatsapp_config').select('*');
  if (configErr) {
    console.error('Error fetching configs:', configErr);
  } else {
    configs.forEach(c => {
      console.log(`Config ID: ${c.id}`);
      console.log(`User ID: ${c.user_id}`);
      console.log(`Phone Number ID: ${c.phone_number_id}`);
      console.log(`Status: ${c.status}`);
      console.log(`Verify Token set: ${!!c.verify_token}`);
      console.log(`Access Token set: ${!!c.access_token}`);
      console.log('------------------------');
    });
  }

  console.log('--- 10 Most Recent Messages ---');
  const { data: messages, error: msgErr } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_type, content_type, content_text, created_at, status')
    .order('created_at', { ascending: false })
    .limit(10);

  if (msgErr) {
    console.error('Error messages:', msgErr);
  } else {
    messages.forEach(m => {
      console.log(`Msg ID: ${m.id} | Conv: ${m.conversation_id} | ${m.sender_type} | ${m.content_type} | Status: ${m.status} | Created: ${m.created_at}`);
      console.log(`Text: ${m.content_text ? m.content_text.slice(0, 100) : null}`);
      console.log('---');
    });
  }
}

run();
