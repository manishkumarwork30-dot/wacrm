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

  const { data: config } = await db.from('whatsapp_config').select('phone_number_id, access_token').eq('user_id', userId).single();
  const accessToken = decrypt(config.access_token);

  // Try sending a hello_world template (which is en_US and always works)
  const testPhone = '918796443057';
  
  console.log(`\nTest 1: Sending hello_world (en_US) to ${testPhone}...`);
  const res1 = await fetch(`https://graph.facebook.com/v21.0/${config.phone_number_id}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: testPhone,
      type: 'template',
      template: { name: 'hello_world', language: { code: 'en_US' } }
    }),
  });
  const data1 = await res1.json();
  console.log(`Status: ${res1.status}`);
  console.log(`Response: ${JSON.stringify(data1, null, 2)}`);

  console.log(`\nTest 2: Sending new_template_v2 (en) to ${testPhone}...`);
  const res2 = await fetch(`https://graph.facebook.com/v21.0/${config.phone_number_id}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: testPhone,
      type: 'template',
      template: { name: 'new_template_v2', language: { code: 'en' } }
    }),
  });
  const data2 = await res2.json();
  console.log(`Status: ${res2.status}`);
  console.log(`Response: ${JSON.stringify(data2, null, 2)}`);

  // Both should return wamid - but do they actually deliver?
  console.log('\n\nWait 10 seconds for webhooks to come in...');
  await new Promise(r => setTimeout(r, 10000));

  // Check if webhook updated the status
  if (data1.messages?.[0]?.id) {
    const { data: msg1 } = await db
      .from('messages')
      .select('status')
      .eq('message_id', data1.messages[0].id)
      .maybeSingle();
    console.log(`\nhello_world message status in DB: ${msg1?.status ?? 'NOT FOUND'}`);
  }

  if (data2.messages?.[0]?.id) {
    const { data: msg2 } = await db
      .from('messages')
      .select('status')
      .eq('message_id', data2.messages[0].id)
      .maybeSingle();
    console.log(`new_template_v2 message status in DB: ${msg2?.status ?? 'NOT FOUND'}`);
  }
}

run();
