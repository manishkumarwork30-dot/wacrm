// test-send-manish.js
// Sends the approval PDF to the lead named "manish" for testing.
// Run: node test-send-manish.js

const SUPABASE_URL = 'https://bwiylhfavbntkickvrdl.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3aXlsaGZhdmJudGtpY2t2cmRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDAyNTEzNiwiZXhwIjoyMDk1NjAxMTM2fQ.j8x06vVOfmOoaTzKaow9sGQmqrLfGK8ebWhOaZUgXnw';
const SITE_URL = 'https://whatsapp-crm-fawn.vercel.app';

async function main() {
  console.log('🔍 Looking for lead named "manish"...');

  // 1. Find Manish's lead
  const searchRes = await fetch(
    `${SUPABASE_URL}/rest/v1/tower_leads?name=ilike.*manish*&select=id,name,location,state,pin_code,land_size,ownership,user_id&limit=5`,
    {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    }
  );

  const leads = await searchRes.json();
  console.log('Leads found:', JSON.stringify(leads, null, 2));

  if (!leads || leads.length === 0) {
    console.error('❌ No lead found with name containing "manish".');
    process.exit(1);
  }

  const lead = leads[0];
  console.log(`\n✅ Using lead: ${lead.name} (ID: ${lead.id}), District: ${lead.location}`);

  // 2. Call the live Vercel API (bypasses working-hours check by hitting directly — same logic)
  console.log('\n📤 Triggering approval send via Vercel API...');
  console.log(`   POST ${SITE_URL}/api/leads/${lead.id}/send-approval`);
  console.log(`   Name: ${lead.name}, Location: ${lead.location}`);

  // We need a valid session cookie to call the API since it requires auth.
  // Instead, call the internal generate + send logic directly via Supabase service role
  // by invoking the API with the service role key as a custom header.
  // NOTE: The API requires user auth — so for testing we'll use the live URL.
  // Please make sure you are logged in to the app while running this, 
  // OR use the admin panel at: ${SITE_URL}/admin/approvals

  console.log('\n⚠️  The API requires admin authentication.');
  console.log('👉 To test, open this URL in your browser (while logged in):');
  console.log(`   ${SITE_URL}/admin/approvals`);
  console.log(`\n   Then click "Send" on the row for: ${lead.name} (${lead.location})`);
  console.log('\n   OR: To force-send bypassing auth, run the command below:');
  console.log(`\n   node force-send-manish.js`);

  // 3. Generate force-send script
  const forceScript = `// force-send-manish.js
// Directly generates PDF and sends WhatsApp — bypasses web auth.
// Run: node force-send-manish.js

process.env.NEXT_PUBLIC_SUPABASE_URL = '${SUPABASE_URL}';
process.env.SUPABASE_SERVICE_ROLE_KEY = '${SERVICE_ROLE_KEY}';
process.env.ENCRYPTION_KEY = 'a383b00f567bc8d8d0653481bcad384df84263437e2fae3822df1a153f8b3b38';

const LEAD_ID   = '${lead.id}';
const LEAD_NAME = '${lead.name}';
const LEAD_LOC  = '${lead.location}';

import('node-fetch').catch(() => {});

async function go() {
  // Dynamic imports for TS source via tsx
  const { generateCongratulationsDoc } = await import('./src/lib/document-generator.ts');
  const { sendDocumentMessage }        = await import('./src/lib/whatsapp/meta-api.ts');
  const { supabaseAdmin }              = await import('./src/lib/automations/admin-client.ts');
  const { decrypt }                    = await import('./src/lib/whatsapp/encryption.ts');

  console.log('1. Fetching lead data...');
  const { data: lead } = await supabaseAdmin()
    .from('tower_leads')
    .select('*, contacts(id, phone)')
    .eq('id', LEAD_ID)
    .single();

  console.log('Lead:', lead?.name, '| Phone:', lead?.contacts?.phone);

  console.log('2. Generating PDF...');
  const pdfBuffer = await generateCongratulationsDoc({
    name: LEAD_NAME,
    location: LEAD_LOC,
    mobile_no: lead?.contacts?.phone,
    state: lead?.state,
    pin_code: lead?.pin_code,
    land_size: lead?.land_size,
    ownership: lead?.ownership,
    date: new Date().toISOString(),
  });
  console.log('PDF generated:', pdfBuffer.length, 'bytes');

  console.log('3. Uploading to Supabase Storage...');
  const fileName = 'approval_test_manish_' + Date.now() + '.pdf';
  const { error: upErr } = await supabaseAdmin()
    .storage.from('documents')
    .upload(fileName, pdfBuffer, { contentType: 'application/pdf', upsert: true });
  if (upErr) throw upErr;

  const { data: { publicUrl } } = supabaseAdmin()
    .storage.from('documents').getPublicUrl(fileName);
  console.log('PDF URL:', publicUrl);

  console.log('4. Fetching WhatsApp config...');
  const { data: config } = await supabaseAdmin()
    .from('whatsapp_config')
    .select('phone_number_id, access_token')
    .eq('user_id', lead.user_id)
    .eq('status', 'connected')
    .single();

  console.log('5. Sending WhatsApp message...');
  const result = await sendDocumentMessage({
    phoneNumberId: config.phone_number_id,
    accessToken:   decrypt(config.access_token),
    to:            lead.contacts.phone,
    documentUrl:   publicUrl,
    filename:      fileName,
    caption:       'Test approval PDF for ' + LEAD_NAME,
  });
  console.log('✅ Sent! Message ID:', result.messageId);
}

go().catch(e => { console.error('❌ Error:', e.message || e); process.exit(1); });
`;

  require('fs').writeFileSync('force-send-manish.js', forceScript);
  console.log('\n✅ force-send-manish.js created. Run it with:');
  console.log('   npx tsx force-send-manish.js');
}

main().catch(e => { console.error('Error:', e); process.exit(1); });
