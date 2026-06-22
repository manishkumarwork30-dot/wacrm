const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load environment variables
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

// Encryption decryption function matching src/lib/whatsapp/encryption.ts
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function decrypt(cipherText) {
  if (!cipherText) return '';
  try {
    const key = Buffer.from(env.ENCRYPTION_KEY, 'hex');
    const parts = cipherText.split(':');
    
    // Check if it's the newer GCM format or legacy format
    if (parts.length === 3) {
      // GCM format: iv:ciphertext:tag
      const [ivHex, encryptedHex, tagHex] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');
      
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } else {
      // Legacy format (AES-256-CBC)
      const [ivHex, encryptedHex] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');
      
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }
  } catch (error) {
    console.error('Decryption failed:', error.message);
    throw error;
  }
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('Fetching whatsapp_config...');
  const { data: config, error } = await supabase
    .from('whatsapp_config')
    .select('*')
    .limit(1)
    .single();

  if (error || !config) {
    console.error('Error fetching config:', error);
    return;
  }

  console.log('Config loaded. Phone Number ID:', config.phone_number_id);
  
  let decryptedToken;
  try {
    decryptedToken = decrypt(config.access_token);
    console.log('Token successfully decrypted. (Length:', decryptedToken.length, ')');
  } catch (e) {
    console.error('Failed to decrypt token:', e.message);
    return;
  }

  console.log('Testing Meta API token info...');
  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/debug_token?input_token=${decryptedToken}&access_token=${decryptedToken}`);
    const debugData = await response.json();
    console.log('Debug Token Response:', JSON.stringify(debugData, null, 2));
  } catch (e) {
    console.error('Error calling debug_token API:', e.message);
  }

  // Also query info about the phone number
  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/${config.phone_number_id}`, {
      headers: {
        Authorization: `Bearer ${decryptedToken}`
      }
    });
    const phoneData = await response.json();
    console.log('Phone Number API Response:', JSON.stringify(phoneData, null, 2));
  } catch (e) {
    console.error('Error calling Phone Number API:', e.message);
  }
}

run();
