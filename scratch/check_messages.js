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
  console.log('--- Checking WhatsApp Config ---');
  const { data: configs, error: configErr } = await supabase.from('whatsapp_config').select('*');
  if (configErr) {
    console.error('Error fetching configs:', configErr);
  } else {
    console.log(configs.map(c => ({
      id: c.id,
      user_id: c.user_id,
      phone_number_id: c.phone_number_id,
      status: c.status,
      created_at: c.created_at,
      verify_token_configured: !!c.verify_token,
      access_token_configured: !!c.access_token
    })));
  }

  console.log('\n--- Checking Messages Count ---');
  const { count, error: countErr } = await supabase.from('messages').select('*', { count: 'exact', head: true });
  if (countErr) {
    console.error('Error fetching messages count:', countErr);
  } else {
    console.log('Total messages:', count);
  }

  console.log('\n--- Checking 10 Latest Messages ---');
  const { data: messages, error: msgErr } = await supabase
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
