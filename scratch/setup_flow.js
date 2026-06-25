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

import { getTowerApplicationFlowJSON } from '../src/lib/whatsapp/tower-flow-json.ts';

async function run() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = '8782904e-82a9-4dd7-b59b-84f1f97ef2f3';

  console.log('Fetching config...');
  const { data: config } = await db.from('whatsapp_config').select('waba_id, access_token').eq('user_id', userId).single();
  
  const accessToken = decrypt(config.access_token);
  const wabaId = config.waba_id;

  console.log('Creating flow...');
  const createRes = await fetch(`${META_API_BASE}/${wabaId}/flows`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'tower_application_' + Date.now(),
      categories: ['LEAD_GENERATION']
    })
  });
  
  if (!createRes.ok) {
    console.error(await createRes.json());
    return;
  }
  const createData = await createRes.json();
  const flowId = createData.id;
  console.log('Flow created:', flowId);

  console.log('Uploading JSON...');
  const flowJson = getTowerApplicationFlowJSON();
  const formData = new FormData();
  formData.append('file', new Blob([JSON.stringify(flowJson)], { type: 'application/json' }), 'flow.json');
  formData.append('name', 'flow.json');
  formData.append('asset_type', 'FLOW_JSON');

  const uploadRes = await fetch(`${META_API_BASE}/${flowId}/assets`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}` },
    body: formData
  });

  if (!uploadRes.ok) {
    console.error(await uploadRes.json());
    return;
  }
  console.log('JSON Uploaded');

  console.log('Publishing...');
  const publishRes = await fetch(`${META_API_BASE}/${flowId}/publish`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!publishRes.ok) {
    console.error(await publishRes.json());
    return;
  }
  console.log('Published!');

  console.log('Updating Chatbot Config in DB...');
  const { data: tmpl } = await db.from('message_templates').select('*').eq('user_id', userId).eq('name', '__chatbot_config').single();
  let buttons = tmpl.buttons || {};
  buttons.flow_id = flowId;
  buttons.use_web_form = true;
  
  await db.from('message_templates').update({ buttons }).eq('id', tmpl.id);
  console.log('DB Updated! Flow ID is now active:', flowId);
}

run();
