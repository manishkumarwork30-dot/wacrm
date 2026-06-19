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
  console.log("Checking tower_leads columns...");
  const { data, error } = await supabase
    .from('tower_leads')
    .select('id, name, approval_date')
    .limit(1);
  if (error) {
    console.error("Database query failed:", error);
  } else {
    console.log("Success! Columns are available in DB. Data sample:", data);
  }
}

run();
