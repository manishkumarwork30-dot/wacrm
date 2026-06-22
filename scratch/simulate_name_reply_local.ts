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
  const { NextRequest } = await import('next/server');
  const { POST } = await import('../src/app/api/whatsapp/webhook/route');

  console.log("Simulating local webhook call for customer name reply...");
  
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
  const secret = process.env.META_APP_SECRET || '';
  const signature = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  const req = new NextRequest(new URL('http://localhost:3000/api/whatsapp/webhook'), {
    method: 'POST',
    headers: {
      'x-hub-signature-256': signature,
      'content-type': 'application/json'
    },
    body: rawBody
  });

  try {
    const res = await POST(req);
    console.log("Response Status:", res.status);
    const data = await res.json();
    console.log("Response Body:", data);
  } catch (error) {
    console.error("Error in POST:", error);
  }
}

run();
