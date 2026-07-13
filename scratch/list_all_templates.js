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

const META_API_VERSION = 'v21.0';
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

async function run() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = '8782904e-82a9-4dd7-b59b-84f1f97ef2f3';

  const { data: config } = await db.from('whatsapp_config').select('waba_id, access_token').eq('user_id', userId).single();
  const accessToken = decrypt(config.access_token);
  const wabaId = config.waba_id;

  console.log('Fetching ALL templates...');
  const res = await fetch(`${META_API_BASE}/${wabaId}/message_templates?limit=100`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  
  const data = await res.json();
  
  if (data.data) {
    console.log(`\nFound ${data.data.length} templates:\n`);
    for (const t of data.data) {
      const isTarget = t.name.includes('new_template') || t.name.includes('new_massage');
      const marker = isTarget ? ' ⬅️ ' : '   ';
      console.log(`${marker}${t.name} | language: ${t.language} | status: ${t.status}`);
    }
  } else {
    console.log('Response:', JSON.stringify(data, null, 2));
  }
}

run();
