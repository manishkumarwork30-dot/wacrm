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
  const { data: templates } = await supabase.from('message_templates').select('*').eq('name', '__chatbot_config');
  console.log('--- Chatbot Config Templates ---');
  console.log(JSON.stringify(templates, null, 2));

  const { data: runs } = await supabase.from('chatbot_runs').select('*');
  console.log('--- Active Runs ---');
  console.log(JSON.stringify(runs, null, 2));
}

run();
