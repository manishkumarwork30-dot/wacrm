import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { processChatbot } from '../src/lib/whatsapp/chatbot.ts';

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
  
  const senderPhone = '918796443057';
  const userId = '8782904e-82a9-4dd7-b59b-84f1f97ef2f3';

  // Restore Questionnaire Mode in DB
  const { data: tmpl } = await db.from('message_templates').select('*').eq('user_id', userId).eq('name', '__chatbot_config').single();
  let buttons = tmpl.buttons || {};
  buttons.use_web_form = false; // TURNING OFF WEB FORM to trigger Questionnaire!
  await db.from('message_templates').update({ buttons }).eq('id', tmpl.id);

  const { data: config } = await db.from('whatsapp_config').select('*').eq('user_id', userId).single();
  const actualPhoneNumberId = config.phone_number_id;
  const accessToken = decrypt(config.access_token);

  const { data: contact } = await db.from('contacts').select('*').eq('phone', senderPhone).single();
  const { data: conv } = await db.from('conversations').select('*').eq('contact_id', contact.id).single();

  console.log('Running chatbot trigger for Hi (Questionnaire Mode)...');
  try {
    await processChatbot({
      userId,
      contactId: contact.id,
      conversationId: conv.id,
      messageText: 'hi',
      senderPhone,
      phoneNumberId: actualPhoneNumberId,
      accessToken,
      messageId: 'wamid.test.quest.123'
    });
    console.log('Success! Questionnaire message sent.');
  } catch (err) {
    console.error('Error running chatbot:', err);
  }
}

run();
