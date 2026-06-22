const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Parse .env.local manually
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

process.env.NEXT_PUBLIC_SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
process.env.ENCRYPTION_KEY = env.ENCRYPTION_KEY;

async function simulate() {
  console.log("Simulating webhook call...");
  
  // Construct a dummy webhook body
  const body = {
    entry: [
      {
        id: "123456",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "15550000000",
                phone_number_id: "1159264040603391"
              },
              contacts: [
                {
                  profile: {
                    name: "Simulated User"
                  },
                  wa_id: "919752997715"
                }
              ],
              messages: [
                {
                  id: "wamid.HBgLOTE5NzUyOTk3NzE1FQIAERgSRjQ1NjBBRERBQ0Y0NDNBMzJBAA==",
                  from: "919752997715",
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  type: "text",
                  text: {
                    body: "Hello Test from Simulation!"
                  }
                }
              ]
            },
            field: "messages"
          }
        ]
      }
    ]
  };

  // We can't import the ESM module route.ts directly in commonjs easily without tsx.
  // Instead, let's run it with npx tsx!
}

simulate();
