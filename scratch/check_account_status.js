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

  // 1. Check WABA status
  console.log('=== WABA Account Status ===');
  const wabaRes = await fetch(`https://graph.facebook.com/v21.0/${config.waba_id}?fields=id,name,account_review_status,on_behalf_of_business_info,message_template_namespace`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const wabaData = await wabaRes.json();
  console.log(JSON.stringify(wabaData, null, 2));

  // 2. Check phone number messaging status
  console.log('\n=== Phone Number Status ===');
  const phoneRes = await fetch(`https://graph.facebook.com/v21.0/${config.phone_number_id}?fields=id,display_phone_number,verified_name,quality_rating,messaging_limit_tier,name_status,status,is_official_business_account,account_mode,is_pin_enabled`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const phoneData = await phoneRes.json();
  console.log(JSON.stringify(phoneData, null, 2));

  // 3. Check business verification status
  console.log('\n=== Business Verification ===');
  const bizRes = await fetch(`https://graph.facebook.com/v21.0/${config.waba_id}?fields=id,name,account_review_status,ownership_type`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const bizData = await bizRes.json();
  console.log(JSON.stringify(bizData, null, 2));

  // 4. Check the phone number's registered status
  console.log('\n=== Phone Registration Status ===');
  const regRes = await fetch(`https://graph.facebook.com/v21.0/${config.phone_number_id}?fields=is_pin_enabled,code_verification_status,messaging_limit_tier,platform_type,certificate`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const regData = await regRes.json();
  console.log(JSON.stringify(regData, null, 2));

  // 5. Check message status for the recent wamid
  console.log('\n=== Recent Message Status Check ===');
  const { data: recs } = await db
    .from('broadcast_recipients')
    .select('whatsapp_message_id, status, contact:contacts(name, phone)')
    .order('created_at', { ascending: false })
    .limit(3);

  for (const r of recs || []) {
    if (r.whatsapp_message_id) {
      console.log(`\n  ${r.contact?.name} (${r.contact?.phone}): ${r.status}`);
      console.log(`  WA Message ID: ${r.whatsapp_message_id}`);
      
      // Try to get message status from Meta (this may not work)
      try {
        const msgRes = await fetch(`https://graph.facebook.com/v21.0/${r.whatsapp_message_id}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const msgData = await msgRes.json();
        console.log(`  Meta status: ${JSON.stringify(msgData)}`);
      } catch (e) {
        console.log(`  Cannot check status: ${e.message}`);
      }
    }
  }
}

run();
