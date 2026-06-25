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

  console.log('Fetching config...');
  const { data: config } = await db.from('whatsapp_config').select('waba_id, access_token').eq('user_id', userId).single();
  
  const accessToken = decrypt(config.access_token);
  const wabaId = config.waba_id;

  console.log('Creating Meta Template: tower_lead_welcome_v1...');
  
  const templateName = 'tower_lead_welcome_v1';
  
  const bodyData = {
    name: templateName,
    language: 'hi',
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text: 'नमस्ते 😊\n\nक्या आपके पास खाली जमीन / प्लॉट है?\n\n4G/5G टावर इंस्टॉलेशन के लिए आवेदन आमंत्रित हैं।\n\n👉 आवेदन के लिए नीचे दिए गए "Apply Now" बटन पर क्लिक करें।'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Apply Now',
            url: 'https://whatsapp-crm-fawn.vercel.app/apply/{{1}}'
          }
        ]
      }
    ]
  };

  const createRes = await fetch(`${META_API_BASE}/${wabaId}/message_templates`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(bodyData)
  });
  
  if (!createRes.ok) {
    const errorBody = await createRes.json();
    console.error('Failed to create template:', errorBody);
    return;
  }
  
  const createData = await createRes.json();
  console.log('Template created successfully! ID:', createData.id);

  console.log('Updating Chatbot Config in DB to use this template...');
  const { data: tmpl } = await db.from('message_templates').select('*').eq('user_id', userId).eq('name', '__chatbot_config').single();
  let buttons = tmpl.buttons || {};
  buttons.use_web_form = true;
  buttons.flow_id = ''; // Clear flow ID so it falls back to template
  buttons.use_template_welcome = true;
  buttons.welcome_template_name = templateName;
  buttons.welcome_template_lang = 'hi';
  
  await db.from('message_templates').update({ buttons }).eq('id', tmpl.id);
  console.log('DB Updated! Chatbot is now configured to use the Meta Template URL webview.');
}

run();
