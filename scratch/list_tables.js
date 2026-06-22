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
  console.log('Fetching table list and counts...');
  // Since we have service role key, we can call postgres tables via RPC or raw query if we have an admin sql function,
  // or we can just fetch row counts of known tables.
  const tables = [
    'contacts',
    'conversations',
    'messages',
    'message_reactions',
    'whatsapp_config',
    'tower_leads'
  ];

  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`Table: ${table} - Error: ${error.message}`);
    } else {
      console.log(`Table: ${table} - Count: ${count}`);
    }
  }
}

run();
