const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Parse .env.local manually
const envLocalPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envLocalPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
  if (match) {
    const key = match[1].trim();
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const ENCRYPTION_KEY = env.ENCRYPTION_KEY;
const GCM_IV_LENGTH = 12;
const CBC_IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function decrypt(encryptedText) {
  const parts = encryptedText.split(':');
  if (parts.length === 3) {
    const [ivHex, ctHex, tagHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(ctHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
  throw new Error("Only GCM is expected here");
}

function sanitizePhoneForMeta(phone) {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

function isValidE164(phone) {
  return /^\+?[1-9]\d{6,14}$/.test(phone);
}

function phoneVariants(sanitized) {
  const seen = new Set();
  const push = (v) => { if (v && !seen.has(v)) seen.add(v); };
  push(sanitized);
  for (const ccLen of [1, 2, 3]) {
    if (sanitized.length <= ccLen) continue;
    const cc = sanitized.slice(0, ccLen);
    const rest = sanitized.slice(ccLen);
    if (!rest.startsWith('0')) push(cc + '0' + rest);
  }
  return [...seen];
}

async function sendTemplateMessage({ phoneNumberId, accessToken, to, templateName, language, params }) {
  const META_API_VERSION = 'v21.0';
  const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;
  const url = `${META_API_BASE}/${phoneNumberId}/messages`;

  const template = {
    name: templateName,
    language: { code: language },
  };

  if (params && params.length > 0) {
    template.components = [
      {
        type: 'body',
        parameters: params.map((p) => ({ type: 'text', text: String(p) })),
      },
    ];
  }

  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const resJson = await response.json();
  if (!response.ok) {
    throw new Error(resJson.error?.message || `Meta API error: ${response.status}`);
  }
  return { messageId: resJson.messages[0].id };
}

async function debugBroadcast() {
  const userId = "8782904e-82a9-4dd7-b59b-84f1f97ef2f3";
  const body = {
    recipients: [{ phone: "8796443057", params: [] }],
    template_name: "new_massage_v4",
    template_language: "en"
  };

  const { data: config, error: configError } = await supabase
    .from('whatsapp_config')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (configError) {
    console.error("Config error:", configError);
    return;
  }

  const accessToken = decrypt(config.access_token);
  const recipient = body.recipients[0];
  const sanitized = sanitizePhoneForMeta(recipient.phone);
  console.log("Sanitized phone:", sanitized);
  console.log("IsValidE164:", isValidE164(sanitized));

  const variants = phoneVariants(sanitized);
  console.log("Variants:", variants);

  for (const variant of variants) {
    console.log(`Sending to variant: ${variant}`);
    try {
      const result = await sendTemplateMessage({
        phoneNumberId: config.phone_number_id,
        accessToken,
        to: variant,
        templateName: body.template_name,
        language: body.template_language,
        params: recipient.params || []
      });
      console.log("SUCCESS:", result);
      break;
    } catch (e) {
      console.error(`FAILED for variant ${variant}:`, e.message);
    }
  }
}

debugBroadcast().catch(console.error);
