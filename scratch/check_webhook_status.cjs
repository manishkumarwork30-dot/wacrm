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
  const { data: b, error } = await supabase
    .from('broadcasts')
    .select('id, name')
    .eq('name', 'bulk v4')
    .single();

  if (error) {
    console.error("Broadcast search error:", error);
    return;
  }

  console.log(`Found Broadcast: ${b.name} (${b.id})`);

  const { data: recs, error: recError } = await supabase
    .from('broadcast_recipients')
    .select('*, contacts(*)')
    .eq('broadcast_id', b.id);

  if (recError) {
    console.error("Recipients search error:", recError);
    return;
  }

  console.log("Recipients for bulk v4:");
  recs.forEach(r => {
    console.log(JSON.stringify(r, null, 2));
  });
}

check().catch(console.error);
