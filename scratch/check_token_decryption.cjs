const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

const crypto = require('crypto');
const ENCRYPTION_KEY = env.ENCRYPTION_KEY;
const GCM_IV_LENGTH = 12;
const CBC_IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function decrypt(encryptedText) {
  const parts = encryptedText.split(':');

  if (parts.length === 3) {
    const [ivHex, ctHex, tagHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    if (iv.length !== GCM_IV_LENGTH) {
      throw new Error(`Encrypted token has unexpected GCM IV length ${iv.length}`);
    }
    const authTag = Buffer.from(tagHex, 'hex');
    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error(`Encrypted token has unexpected GCM auth-tag length ${authTag.length}`);
    }
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(ctHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  if (parts.length === 2) {
    const [ivHex, ctHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    if (iv.length !== CBC_IV_LENGTH) {
      throw new Error(`Encrypted token has unexpected CBC IV length ${iv.length}`);
    }
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let decrypted = decipher.update(ctHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  throw new Error(`Encrypted token has unrecognised format (expected 1 or 2 colons, got ${parts.length - 1})`);
}

async function check() {
  const { data: configs, error } = await supabase
    .from('whatsapp_config')
    .select('*');

  if (error) {
    console.error(error);
    return;
  }

  for (const config of configs) {
    console.log(`Config for User: ${config.user_id}, Phone Number ID: ${config.phone_number_id}`);
    try {
      const decrypted = decrypt(config.access_token);
      console.log(`  Decryption: SUCCESS (Length: ${decrypted.length})`);
    } catch (e) {
      console.log(`  Decryption: FAILED - ${e.message}`);
    }
  }
}

check().catch(console.error);
