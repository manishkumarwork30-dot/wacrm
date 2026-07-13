import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY || '', 'hex');

function decrypt(encryptedText) {
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const authTag = Buffer.from(parts.pop(), 'hex');
  const encrypted = Buffer.from(parts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function run() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = '8782904e-82a9-4dd7-b59b-84f1f97ef2f3';

  const { data: config } = await db.from('whatsapp_config').select('waba_id, phone_number_id, access_token').eq('user_id', userId).single();
  const accessToken = decrypt(config.access_token);
  
  // Check if the number 918796443057 even has WhatsApp
  console.log('=== Checking if 918796443057 has WhatsApp ===');
  // We can't directly check this, but we can see the contact validation
  // from the last send response - it returned wa_id: "918796443057" which
  // means WhatsApp confirmed this number exists on their platform
  
  // Check webhook subscriptions
  console.log('\n=== WABA Subscribed Apps ===');
  const subsRes = await fetch(
    `https://graph.facebook.com/v21.0/${config.waba_id}/subscribed_apps`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const subsData = await subsRes.json();
  console.log(JSON.stringify(subsData, null, 2));

  // Check phone number's two-step verification
  console.log('\n=== Phone 2FA & Registration Details ===');
  const phone2Res = await fetch(
    `https://graph.facebook.com/v21.0/${config.phone_number_id}?fields=code_verification_status,is_pin_enabled,last_onboarded_time,name_status,new_name_status,status,messaging_limit_tier`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const phone2Data = await phone2Res.json();
  console.log(JSON.stringify(phone2Data, null, 2));

  // Try to check if the app is properly subscribed to webhook fields
  if (config.app_id) {
    console.log(`\n=== App (${config.app_id}) Webhook Subscriptions ===`);
    const appSubsRes = await fetch(
      `https://graph.facebook.com/v21.0/${config.app_id}/subscriptions`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const appSubsData = await appSubsRes.json();
    console.log(JSON.stringify(appSubsData, null, 2));
  }

  // Try sending a plain text message (within 24-hour window)
  // First check if there's been any recent message from 918796443057
  console.log('\n=== Checking recent conversations with 918796443057 ===');
  const { data: convos } = await db
    .from('conversations')
    .select('id, contact_phone, last_message_at')
    .or('contact_phone.eq.918796443057,contact_phone.eq.8796443057')
    .order('last_message_at', { ascending: false })
    .limit(3);
  console.log('Conversations:', JSON.stringify(convos, null, 2));

  // Check if the recipient's WhatsApp number matches  
  console.log('\n=== Verifying recipient number format ===');
  // Send with explicit number check
  const checkRes = await fetch(
    `https://graph.facebook.com/v21.0/${config.phone_number_id}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: '918796443057',
        type: 'text',
        text: { body: 'Test message from CRM diagnostic script - please confirm if received' }
      }),
    }
  );
  const checkData = await checkRes.json();
  console.log(`Text message send status: ${checkRes.status}`);
  console.log(JSON.stringify(checkData, null, 2));
  
  if (checkData.error) {
    console.log('\n⚠️  Text message failed — this means 918796443057 has NOT messaged');
    console.log('    your business number (+91 93159 70774) in the last 24 hours.');
    console.log('    Template messages should still work though.\n');
  }

  // Final: try to deregister + re-register more aggressively  
  console.log('\n=== Aggressive Re-Registration ===');
  
  // Deregister first
  console.log('Deregistering...');
  const deregRes = await fetch(
    `https://graph.facebook.com/v21.0/${config.phone_number_id}/deregister`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ messaging_product: 'whatsapp' }),
    }
  );
  const deregData = await deregRes.json();
  console.log(`Deregister: ${deregRes.status} - ${JSON.stringify(deregData)}`);

  // Wait 2 seconds
  await new Promise(r => setTimeout(r, 2000));

  // Re-register
  console.log('Re-registering...');
  const reregRes = await fetch(
    `https://graph.facebook.com/v21.0/${config.phone_number_id}/register`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        pin: '123456',
      }),
    }
  );
  const reregData = await reregRes.json();
  console.log(`Re-register: ${reregRes.status} - ${JSON.stringify(reregData)}`);

  // Wait and check status
  await new Promise(r => setTimeout(r, 3000));
  
  const finalRes = await fetch(
    `https://graph.facebook.com/v21.0/${config.phone_number_id}?fields=code_verification_status,status`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const finalData = await finalRes.json();
  console.log(`\nFinal status: ${JSON.stringify(finalData, null, 2)}`);

  // Now try sending again
  console.log('\n=== Final Test Send ===');
  const finalSend = await fetch(
    `https://graph.facebook.com/v21.0/${config.phone_number_id}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: '918796443057',
        type: 'template',
        template: { name: 'new_massage_v4', language: { code: 'en' } }
      }),
    }
  );
  const finalSendData = await finalSend.json();
  console.log(`Status: ${finalSend.status}`);
  console.log(JSON.stringify(finalSendData, null, 2));

  console.log('\n🔔 Now check your phone (918796443057) for the message!');
}

run();
