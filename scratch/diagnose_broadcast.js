/**
 * diagnose_broadcast.js
 * 
 * Directly tests the Meta WhatsApp API to diagnose why
 * broadcast messages show "Sent" but never get delivered.
 * 
 * Run: node scratch/diagnose_broadcast.js
 */

import { config as dotenvConfig } from 'dotenv';
dotenvConfig({ path: '.env.local' });
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

function decrypt(encryptedText) {
  if (!ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY not set');
  const parts = encryptedText.split(':');

  if (parts.length === 3) {
    // GCM format: ivHex:ciphertextHex:authTagHex
    const [ivHex, ctHex, tagHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      iv
    );
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(ctHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  if (parts.length === 2) {
    // Legacy CBC format: ivHex:ciphertextHex
    const [ivHex, ctHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      iv
    );
    let decrypted = decipher.update(ctHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  throw new Error(`Unrecognized format (${parts.length - 1} colons)`);
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  WhatsApp Broadcast Diagnostics');
  console.log('═══════════════════════════════════════════\n');

  // 1. Check env vars
  console.log('1️⃣  Checking environment variables...');
  if (!SUPABASE_URL) { console.error('   ❌ NEXT_PUBLIC_SUPABASE_URL not set'); return; }
  if (!SERVICE_ROLE_KEY) { console.error('   ❌ SUPABASE_SERVICE_ROLE_KEY not set'); return; }
  if (!ENCRYPTION_KEY) { console.error('   ❌ ENCRYPTION_KEY not set'); return; }
  console.log('   ✅ All env vars present\n');

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // 2. Get WhatsApp config
  console.log('2️⃣  Fetching WhatsApp config...');
  const { data: configs, error: configErr } = await supabase
    .from('whatsapp_config')
    .select('*');
  
  if (configErr || !configs?.length) {
    console.error('   ❌ No WhatsApp config found:', configErr?.message);
    return;
  }

  const config = configs[0];
  console.log(`   Phone Number ID: ${config.phone_number_id}`);
  console.log(`   Status: ${config.status}`);
  console.log(`   User ID: ${config.user_id}\n`);

  // 3. Decrypt access token
  console.log('3️⃣  Decrypting access token...');
  let accessToken;
  try {
    accessToken = decrypt(config.access_token);
    console.log(`   ✅ Token decrypted (length: ${accessToken.length})`);
    console.log(`   Token starts with: ${accessToken.substring(0, 20)}...`);
    console.log(`   Token ends with: ...${accessToken.substring(accessToken.length - 10)}\n`);
  } catch (e) {
    console.error(`   ❌ Decryption failed: ${e.message}`);
    return;
  }

  // 4. Verify phone number with Meta
  console.log('4️⃣  Verifying phone number with Meta API...');
  try {
    const verifyRes = await fetch(
      `https://graph.facebook.com/v21.0/${config.phone_number_id}?fields=id,display_phone_number,verified_name,quality_rating,messaging_limit_tier,name_status`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const verifyData = await verifyRes.json();
    if (verifyData.error) {
      console.error('   ❌ Meta API error:', JSON.stringify(verifyData.error, null, 2));
      return;
    }
    console.log(`   ✅ Phone verified!`);
    console.log(`   Display number: ${verifyData.display_phone_number}`);
    console.log(`   Verified name: ${verifyData.verified_name}`);
    console.log(`   Quality rating: ${verifyData.quality_rating}`);
    console.log(`   Messaging limit: ${verifyData.messaging_limit_tier}`);
    console.log(`   Name status: ${verifyData.name_status}\n`);
  } catch (e) {
    console.error(`   ❌ Network error: ${e.message}\n`);
  }

  // 5. Check template status
  console.log('5️⃣  Checking template "new_template_v2"...');
  try {
    // First get WABA ID
    const wabaRes = await fetch(
      `https://graph.facebook.com/v21.0/${config.phone_number_id}?fields=id`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    
    // Try to get templates via the business account
    const templatesRes = await fetch(
      `https://graph.facebook.com/v21.0/${config.phone_number_id}/message_templates?fields=name,status,language,components`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    // This may not work directly - try WABA approach  
    if (!templatesRes.ok) {
      console.log('   ⚠️  Cannot list templates from phone number directly');
      
      // Try to list via the account
      const bizRes = await fetch(
        `https://graph.facebook.com/v21.0/${config.phone_number_id}?fields=id,account_id`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const bizData = await bizRes.json();
      console.log('   Business data:', JSON.stringify(bizData, null, 2));
    } else {
      const tplData = await templatesRes.json();
      if (tplData.data) {
        const target = tplData.data.find(t => t.name === 'new_template_v2');
        if (target) {
          console.log(`   ✅ Template found!`);
          console.log(`   Name: ${target.name}`);
          console.log(`   Status: ${target.status}`);
          console.log(`   Language: ${target.language}`);
        } else {
          console.log('   ⚠️  Template "new_template_v2" not in the list');
          console.log('   Available templates:');
          tplData.data.forEach(t => console.log(`     - ${t.name} (${t.status}, ${t.language})`));
        }
      }
    }
    console.log();
  } catch (e) {
    console.log(`   ⚠️  Template check skipped: ${e.message}\n`);
  }

  // 6. Send a REAL test message to one number
  const testPhone = '918796443057'; // "you" contact with 91 prefix
  console.log(`6️⃣  Sending test template message to ${testPhone}...`);
  
  const sendBody = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: testPhone,
    type: 'template',
    template: {
      name: 'new_template_v2',
      language: { code: 'en_US' },
    },
  };

  console.log('   Request body:', JSON.stringify(sendBody, null, 2));

  try {
    const sendRes = await fetch(
      `https://graph.facebook.com/v21.0/${config.phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(sendBody),
      }
    );

    const sendData = await sendRes.json();
    console.log(`\n   HTTP Status: ${sendRes.status}`);
    console.log('   Full response:', JSON.stringify(sendData, null, 2));

    if (sendData.messages?.[0]?.id) {
      console.log(`\n   ✅ Meta accepted the message!`);
      console.log(`   Message ID: ${sendData.messages[0].id}`);
      console.log(`   Message Status: ${sendData.messages[0].message_status}`);
      
      if (sendData.messages[0].message_status === 'accepted') {
        console.log('\n   ⚠️  Message was ACCEPTED by Meta but you say it was NOT delivered.');
        console.log('   Possible causes:');
        console.log('   a) UNVERIFIED BUSINESS - Meta accepts the message but does NOT deliver');
        console.log('      it to non-test numbers. Only numbers added in Meta Developer');
        console.log('      Portal > WhatsApp > API Setup > "To" field can receive messages.');
        console.log('   b) RATE LIMIT - You hit Meta\'s messaging limit tier.');
        console.log('   c) TEMPLATE ISSUE - Template was approved but may have content issues.');
        console.log('   d) PHONE FORMAT - The number must have country code (91 for India).');
      }
    } else if (sendData.error) {
      console.log(`\n   ❌ Meta REJECTED the message!`);
      console.log(`   Error code: ${sendData.error.code}`);
      console.log(`   Error message: ${sendData.error.message}`);
      if (sendData.error.error_data?.details) {
        console.log(`   Details: ${sendData.error.error_data.details}`);
      }
    }
  } catch (e) {
    console.error(`   ❌ Network error: ${e.message}`);
  }

  // 7. Check recent broadcast recipients from DB
  console.log('\n\n7️⃣  Checking recent broadcast_recipients from DB...');
  const { data: recentRecs } = await supabase
    .from('broadcast_recipients')
    .select('*, contact:contacts(name, phone), broadcast:broadcasts(name, template_name)')
    .order('created_at', { ascending: false })
    .limit(5);

  if (recentRecs?.length) {
    console.log('   Recent broadcast recipients:');
    for (const r of recentRecs) {
      console.log(`   - ${r.contact?.name} (${r.contact?.phone})`);
      console.log(`     Status: ${r.status} | WA Msg ID: ${r.whatsapp_message_id || 'NONE'}`);
      console.log(`     Error: ${r.error_message || 'none'}`);
      console.log(`     Sent at: ${r.sent_at || '-'} | Delivered at: ${r.delivered_at || '-'}`);
      console.log(`     Broadcast: ${r.broadcast?.name} (template: ${r.broadcast?.template_name})`);
    }
  }

  // 8. Check what phone format was stored
  console.log('\n\n8️⃣  Checking phone numbers in contacts table...');
  const { data: contacts } = await supabase
    .from('contacts')
    .select('name, phone')
    .limit(10);
  
  if (contacts?.length) {
    console.log('   Contacts and their phone numbers:');
    for (const c of contacts) {
      const digits = (c.phone || '').replace(/\D/g, '');
      const hasCountryCode = digits.startsWith('91') && digits.length >= 12;
      console.log(`   - ${c.name}: "${c.phone}" → digits: "${digits}" ${hasCountryCode ? '✅ has 91' : '⚠️ NO country code!'}`);
    }
  }

  console.log('\n═══════════════════════════════════════════');
  console.log('  Diagnostics Complete');
  console.log('═══════════════════════════════════════════');
}

main().catch(e => console.error('Fatal error:', e));
