import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// 1. Load .env.local manually first
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

// 2. Import Supabase to inspect state
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const testPhone = '919999999999';
let contactId = '';
const secret = process.env.META_APP_SECRET || 'test_secret';

// 3. Mock global fetch to intercept Meta API and Google Sheets calls
const originalFetch = global.fetch;
global.fetch = async (url: string | URL | Request, options?: RequestInit): Promise<Response> => {
  const urlStr = url.toString();
  
  if (urlStr.includes('graph.facebook.com')) {
    console.log(`\n--- MOCK META API CALL ---`);
    console.log(`URL: ${urlStr}`);
    if (options?.body) {
      const parsed = JSON.parse(options.body as string);
      console.log(`Body:`, JSON.stringify(parsed, null, 2));
    }
    return new Response(JSON.stringify({
      messages: [{ id: 'wamid.mock_message_' + Math.floor(Math.random() * 1000000) }]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (urlStr.includes('script.google.com') || (process.env.GOOGLE_SHEETS_WEBHOOK_URL && urlStr.includes(process.env.GOOGLE_SHEETS_WEBHOOK_URL))) {
    console.log(`\n--- MOCK GOOGLE SHEETS WEBHOOK CALL ---`);
    console.log(`URL: ${urlStr}`);
    if (options?.body) {
      console.log(`Payload:`, options.body);
    }
    return new Response(JSON.stringify({ status: 'success' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return originalFetch(url, options);
};

// 4. Helper to simulate incoming WhatsApp message
async function sendWebhookMessage(messagePayload: any) {
  const { NextRequest } = await import('next/server');
  const { POST } = await import('../src/app/api/whatsapp/webhook/route');

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
                    name: "Test Flow User"
                  },
                  wa_id: testPhone
                }
              ],
              messages: [
                {
                  id: "wamid.HBgLOTE5OTk5OTk5OTk1" + Date.now(),
                  from: testPhone,
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  ...messagePayload
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
  const signature = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  const req = new NextRequest(new URL('http://localhost:3000/api/whatsapp/webhook'), {
    method: 'POST',
    headers: {
      'x-hub-signature-256': signature,
      'content-type': 'application/json'
    },
    body: rawBody
  });

  const res = await POST(req);
  return res;
}

async function getChatbotRun() {
  const { data } = await supabase
    .from('chatbot_runs')
    .select('*')
    .eq('contact_id', contactId)
    .maybeSingle();
  return data;
}

async function getTowerLead() {
  const { data } = await supabase
    .from('tower_leads')
    .select('*')
    .eq('contact_id', contactId)
    .maybeSingle();
  return data;
}

async function runSimulation() {
  console.log('=== STARTING 7-STEP CHATBOT FLOW SIMULATION ===');

  // Step 0: Ensure contact exists, clean up old test runs/leads
  console.log('1. Preparing database state...');
  let { data: contact } = await supabase
    .from('contacts')
    .select('id')
    .eq('phone', testPhone)
    .maybeSingle();

  if (!contact) {
    const { data: newContact, error } = await supabase
      .from('contacts')
      .insert({
        phone: testPhone,
        name: 'Test Flow User',
        user_id: '8782904e-82a9-4dd7-b59b-84f1f97ef2f3' // Admin user ID
      })
      .select('id')
      .single();
    if (error) throw error;
    contact = newContact;
  }

  contactId = contact.id;
  
  // Clean up
  await supabase.from('chatbot_runs').delete().eq('contact_id', contactId);
  await supabase.from('tower_leads').delete().eq('contact_id', contactId);
  console.log(`Cleaned up. Contact ID is: ${contactId}`);

  // Flow Step 1: User sends "hi"
  console.log('\n--- Simulation Step 1: Sending greeting "hi" ---');
  await sendWebhookMessage({
    type: 'text',
    text: { body: 'hi' }
  });
  
  let run = await getChatbotRun();
  console.log(`-> Chatbot state in DB: ${run?.state}`);

  // Flow Step 2: User clicks "YES" on greeting
  console.log('\n--- Simulation Step 2: Clicking YES on greeting ---');
  await sendWebhookMessage({
    type: 'interactive',
    interactive: {
      type: 'button_reply',
      button_reply: { id: 'yes_welcome', title: 'YES' }
    }
  });
  
  run = await getChatbotRun();
  console.log(`-> Chatbot state in DB: ${run?.state}`);

  // Flow Step 3: User replies with Name "Rohan Sharma"
  console.log('\n--- Simulation Step 3: Sending Name "Rohan Sharma" ---');
  await sendWebhookMessage({
    type: 'text',
    text: { body: 'Rohan Sharma' }
  });
  
  run = await getChatbotRun();
  let lead = await getTowerLead();
  console.log(`-> Chatbot state in DB: ${run?.state}`);
  console.log(`-> Tower Lead Name: ${lead?.name}`);

  // Flow Step 4: User replies with Location "Indira Nagar"
  console.log('\n--- Simulation Step 4: Sending Location "Indira Nagar" ---');
  await sendWebhookMessage({
    type: 'text',
    text: { body: 'Indira Nagar' }
  });
  
  run = await getChatbotRun();
  lead = await getTowerLead();
  console.log(`-> Chatbot state in DB: ${run?.state}`);
  console.log(`-> Tower Lead Location: ${lead?.location}`);

  // Flow Step 5: User replies with State "Uttar Pradesh"
  console.log('\n--- Simulation Step 5: Sending State "Uttar Pradesh" ---');
  await sendWebhookMessage({
    type: 'text',
    text: { body: 'Uttar Pradesh' }
  });
  
  run = await getChatbotRun();
  lead = await getTowerLead();
  console.log(`-> Chatbot state in DB: ${run?.state}`);
  console.log(`-> Tower Lead State: ${lead?.state}`);

  // Flow Step 6: User replies with Pin Code "226016"
  console.log('\n--- Simulation Step 6: Sending PIN Code "226016" ---');
  await sendWebhookMessage({
    type: 'text',
    text: { body: '226016' }
  });
  
  run = await getChatbotRun();
  lead = await getTowerLead();
  console.log(`-> Chatbot state in DB: ${run?.state}`);
  console.log(`-> Tower Lead PIN Code: ${lead?.pin_code}`);

  // Flow Step 7: User replies with Mobile (clicking YES button to use same WhatsApp number)
  console.log('\n--- Simulation Step 7: Sending Mobile (using same number button) ---');
  await sendWebhookMessage({
    type: 'interactive',
    interactive: {
      type: 'button_reply',
      button_reply: { id: 'yes_mobile', title: 'YES (Same No)' }
    }
  });
  
  run = await getChatbotRun();
  lead = await getTowerLead();
  console.log(`-> Chatbot state in DB: ${run?.state}`);
  console.log(`-> Tower Lead Mobile: ${lead?.mobile_no}`);

  // Flow Step 8: User replies with Land Size "2400 sq ft"
  console.log('\n--- Simulation Step 8: Sending Land Size "2400 sq ft" ---');
  await sendWebhookMessage({
    type: 'text',
    text: { body: '2400 sq ft' }
  });
  
  run = await getChatbotRun();
  lead = await getTowerLead();
  console.log(`-> Chatbot state in DB: ${run?.state}`);
  console.log(`-> Tower Lead Land Size: ${lead?.land_size}`);

  // Flow Step 9: User replies with Ownership "हाँ (Yes)"
  console.log('\n--- Simulation Step 9: Sending Ownership "हाँ (Yes)" ---');
  await sendWebhookMessage({
    type: 'interactive',
    interactive: {
      type: 'button_reply',
      button_reply: { id: 'yes_owner', title: 'हाँ (Yes)' }
    }
  });
  
  run = await getChatbotRun();
  lead = await getTowerLead();
  console.log(`-> Chatbot state in DB: ${run?.state}`);
  console.log(`-> Tower Lead Ownership: ${lead?.ownership}`);

  // Flow Step 10: User replies with Terms Agreement "YES"
  console.log('\n--- Simulation Step 10: Agreeing to Terms (clicking YES) ---');
  await sendWebhookMessage({
    type: 'interactive',
    interactive: {
      type: 'button_reply',
      button_reply: { id: 'yes_terms', title: 'YES (सहमत)' }
    }
  });
  
  run = await getChatbotRun();
  lead = await getTowerLead();
  console.log(`-> Chatbot state in DB: ${run ? run.state : 'Deleted (Completed)'}`);
  console.log(`-> Final Tower Lead Status: ${lead?.status}`);

  console.log('\n=== SIMULATION COMPLETED SUCCESSFULLY ===');
}

runSimulation().catch(err => {
  console.error("Simulation failed:", err);
});
