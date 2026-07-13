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

// Get the action from command line args
const action = process.argv[2]; // 'request' or 'verify'
const code = process.argv[3];   // 6-digit OTP code (only for 'verify')

async function run() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = '8782904e-82a9-4dd7-b59b-84f1f97ef2f3';

  const { data: config } = await db.from('whatsapp_config').select('phone_number_id, access_token').eq('user_id', userId).single();
  const accessToken = decrypt(config.access_token);
  const phoneNumberId = config.phone_number_id;

  if (action === 'request') {
    // Step 1: Request verification code via SMS
    console.log('📱 Requesting verification code via SMS...');
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/request_code`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          code_method: 'SMS',
          language: 'en',
        }),
      }
    );
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log(JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('\n✅ Verification code sent via SMS to +91 93159 70774');
      console.log('📝 Now run this command with the code you received:');
      console.log('   node scratch/verify_phone.js verify <6-DIGIT-CODE>');
    } else {
      console.log('\n❌ Failed to request code');
      if (data.error?.message) {
        console.log('Error:', data.error.message);
      }
    }

  } else if (action === 'verify') {
    if (!code || code.length !== 6) {
      console.log('❌ Please provide the 6-digit verification code');
      console.log('Usage: node scratch/verify_phone.js verify 123456');
      return;
    }

    // Step 2: Verify the code
    console.log(`🔑 Verifying code: ${code}...`);
    const verifyRes = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/verify_code`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          code: code,
        }),
      }
    );
    const verifyData = await verifyRes.json();
    console.log(`Status: ${verifyRes.status}`);
    console.log(JSON.stringify(verifyData, null, 2));

    if (verifyData.success) {
      console.log('\n✅ Code verified!');

      // Now register the phone
      console.log('\n📝 Registering phone number...');
      const regRes = await fetch(
        `https://graph.facebook.com/v21.0/${phoneNumberId}/register`,
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
      const regData = await regRes.json();
      console.log(`Register status: ${regRes.status}`);
      console.log(JSON.stringify(regData, null, 2));

      if (regData.success) {
        console.log('\n🎉 Phone number registered successfully!');
        
        // Check final status
        await new Promise(r => setTimeout(r, 2000));
        const statusRes = await fetch(
          `https://graph.facebook.com/v21.0/${phoneNumberId}?fields=code_verification_status,status,messaging_limit_tier`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const statusData = await statusRes.json();
        console.log('\nFinal status:', JSON.stringify(statusData, null, 2));

        // Send test message
        console.log('\n📤 Sending test message...');
        const sendRes = await fetch(
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
        const sendData = await sendRes.json();
        console.log(JSON.stringify(sendData, null, 2));

        if (sendData.messages?.[0]?.id) {
          console.log('\n🔔 Message sent! Check your phone (918796443057)!');
        }
      }
    } else {
      console.log('\n❌ Code verification failed');
    }

  } else if (action === 'status') {
    // Just check current status
    const statusRes = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}?fields=code_verification_status,status,messaging_limit_tier,is_pin_enabled`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const statusData = await statusRes.json();
    console.log('Current status:', JSON.stringify(statusData, null, 2));

  } else {
    console.log('Usage:');
    console.log('  node scratch/verify_phone.js request          → SMS code bhejega +91 93159 70774 pe');
    console.log('  node scratch/verify_phone.js verify <CODE>    → Code verify karega aur register karega');
    console.log('  node scratch/verify_phone.js status           → Current status check karega');
  }
}

run();
