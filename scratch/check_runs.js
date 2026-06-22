const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envLocalPath = path.join(__dirname, '../.env.local');
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
  console.log('--- Active Chatbot Runs ---');
  const { data: runs, error: runsErr } = await supabase.from('chatbot_runs').select('*, contacts(id, phone, name)');
  if (runsErr) {
    console.error('Error:', runsErr);
  } else {
    console.log(JSON.stringify(runs, null, 2));
  }

  console.log('\n--- Recent Tower Leads ---');
  const { data: leads, error: leadsErr } = await supabase.from('tower_leads').select('*').order('updated_at', { ascending: false }).limit(3);
  if (leadsErr) {
    console.error('Error:', leadsErr);
  } else {
    console.log(JSON.stringify(leads, null, 2));
  }
}

run();
