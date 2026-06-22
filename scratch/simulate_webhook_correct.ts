import fs from 'fs';
import path from 'path';

// Parse .env.local manually first
const envLocalPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envLocalPath, 'utf8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
  if (match) {
    const key = match[1].trim();
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
});

// Import POST after environment variables are set
import { NextRequest } from 'next/server';
import { POST } from '../src/app/api/whatsapp/webhook/route';

async function simulate() {
  console.log("Simulating webhook call to POST (correct order)...");
  
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
                  id: "wamid.HBgLOTE5NzUyOTk3NzE1FQIAERgSRjQ1NjBBRERBQ0Y0NDNBMzJBAA==" + Date.now(),
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

  const rawBody = JSON.stringify(body);
  const secret = process.env.META_APP_SECRET || '';
  const crypto = require('crypto');
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

simulate();
