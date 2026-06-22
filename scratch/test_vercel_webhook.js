const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load environment variables
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

async function run() {
  const url = 'https://whatsapp-crm-fawn.vercel.app/api/whatsapp/webhook';
  
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
                    name: "External Test User"
                  },
                  wa_id: "919752997715"
                }
              ],
              messages: [
                {
                  id: "wamid.HBgLOTE5NzUyOTk3NzE1FQIAERgSRjQ1NjBBRERBQ0Y0NDNBMzJBAA==" + Date.now(),
                  from: "919752997715",
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  type: "text",
                  text: {
                    body: "Hello Test from External Script!"
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

  const rawBody = JSON.stringify(body);
  const secret = env.META_APP_SECRET || '';
  console.log("Using META_APP_SECRET:", secret);
  const signature = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  console.log("Sending signed POST to Vercel webhook...");
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-hub-signature-256': signature,
        'Content-Type': 'application/json'
      },
      body: rawBody
    });
    
    console.log("Response Status:", response.status);
    const data = await response.text();
    console.log("Response Body:", data);
  } catch (error) {
    console.error("Error fetching Vercel:", error);
  }
}

run();
