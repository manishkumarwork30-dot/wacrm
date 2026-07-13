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
  console.log("Checking recent broadcasts...");
  const { data: broadcasts, error } = await supabase
    .from('broadcasts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error fetching broadcasts:", error);
    return;
  }

  console.log("Recent Broadcasts:");
  for (const b of broadcasts) {
    console.log(`\n- ID: ${b.id}\n  Name: ${b.name}\n  Status: ${b.status}\n  Template: ${b.template_name}\n  Recipients: ${b.total_recipients}\n  Failed: ${b.failed_count}`);
    
    // Fetch recipient errors
    const { data: recipients, error: recError } = await supabase
      .from('broadcast_recipients')
      .select('id, contact_id, status, error_message')
      .eq('broadcast_id', b.id)
      .limit(5);

    if (recError) {
      console.error("Error fetching recipients:", recError);
    } else {
      console.log("  Sample Recipients:");
      recipients.forEach(r => {
        console.log(`    * Status: ${r.status}, Error: ${r.error_message}`);
      });
    }
  }
}

check().catch(console.error);
