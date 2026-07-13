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
  const phoneNumberId = config.phone_number_id;

  // Step 1: Check current registration status
  console.log('=== Current Phone Status ===');
  const statusRes = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}?fields=code_verification_status,is_pin_enabled,messaging_limit_tier,platform_type,display_phone_number,name_status,quality_rating`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const statusData = await statusRes.json();
  console.log(JSON.stringify(statusData, null, 2));

  // Step 2: Try to re-register the phone number
  console.log('\n=== Attempting to Re-Register Phone Number ===');
  const registerRes = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/register`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        pin: '123456', // 6-digit PIN for registration
      }),
    }
  );
  const registerData = await registerRes.json();
  console.log(`Status: ${registerRes.status}`);
  console.log(JSON.stringify(registerData, null, 2));

  if (registerData.success) {
    console.log('\n✅ Phone number re-registered successfully!');
    
    // Wait a moment and check status again
    await new Promise(r => setTimeout(r, 3000));
    
    console.log('\n=== Updated Phone Status ===');
    const newStatusRes = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}?fields=code_verification_status,is_pin_enabled,messaging_limit_tier,platform_type`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const newStatusData = await newStatusRes.json();
    console.log(JSON.stringify(newStatusData, null, 2));

    // Try sending a test message
    console.log('\n=== Sending Test Message After Re-Registration ===');
    const testRes = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
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
    const testData = await testRes.json();
    console.log(`Status: ${testRes.status}`);
    console.log(JSON.stringify(testData, null, 2));
  } else {
    console.log('\n❌ Re-registration failed.');
    console.log('You may need to re-register from Meta Developer Portal:');
    console.log('  1. Go to https://developers.facebook.com');
    console.log('  2. Select your app');
    console.log('  3. Go to WhatsApp > API Setup');
    console.log('  4. Click on your phone number');
    console.log('  5. Click "Register" or "Re-register"');
  }
}

run();
