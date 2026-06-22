const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Parse .env.local manually first
const envLocalPath = path.join(process.cwd(), '.env.local');
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
    process.env[key] = val;
  }
});

async function run() {
  const url = 'https://whatsapp-crm-fawn.vercel.app/api/whatsapp/webhook';
  
  console.log("Sending signed POST to Vercel webhook (Simulated Customer Name reply)...");
  
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
                    name: "companytelecommunication3"
                  },
                  wa_id: "918796443057"
                }
              ],
              messages: [
                {
                  id: "wamid.HBgMOTE4Nzk2NDQzMDU3FQIAEhggQUMwQUM3RjE2MjVGMUY2NTc2OTAwNERGNEEwNzA2RDEA" + Date.now(),
                  from: "918796443057",
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  type: "text",
                  text: {
                    body: "Manish Kumar"
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
  const signature = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

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
