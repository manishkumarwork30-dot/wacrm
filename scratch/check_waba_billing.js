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
  
  console.log('=== Checking WABA detailed status ===');
  const res = await fetch(
    `https://graph.facebook.com/v21.0/${config.waba_id}?fields=id,name,currency,timezone_id,message_template_namespace,account_review_status,business_verification_status,primary_funding_id,purchase_order_number`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

run();
