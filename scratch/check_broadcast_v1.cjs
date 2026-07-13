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
  const { data: broadcasts, error } = await supabase
    .from('broadcasts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error(error);
    return;
  }

  for (const b of broadcasts) {
    console.log(`\nBroadcast: ${b.name} (${b.id})`);
    const { data: recs, error: recError } = await supabase
      .from('broadcast_recipients')
      .select('id, contact_id, status, error_message, contacts(name, phone)')
      .eq('broadcast_id', b.id);

    if (recError) {
      console.error(recError);
    } else {
      recs.forEach(r => {
        console.log(`  Contact: ${r.contacts?.name || 'unknown'}, Phone: ${r.contacts?.phone || 'unknown'}, Status: ${r.status}, Error: ${r.error_message}`);
      });
    }
  }
}

check().catch(console.error);
