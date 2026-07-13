const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Parse .env.local manually
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

async function check() {
  const { data, error } = await supabase
    .from('broadcast_recipients')
    .select('status, error_message')
    .eq('status', 'failed');

  if (error) {
    console.error(error);
    return;
  }

  const uniqueErrors = new Set();
  data.forEach(r => {
    uniqueErrors.add(r.error_message);
  });

  console.log("Unique error messages for failed recipients:");
  uniqueErrors.forEach(err => {
    console.log(`- ${err}`);
  });
}

check().catch(console.error);
