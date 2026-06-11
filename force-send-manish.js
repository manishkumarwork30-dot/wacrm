// force-send-manish.js
// Directly generates PDF and sends WhatsApp — bypasses web auth.
// Run: node force-send-manish.js

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://bwiylhfavbntkickvrdl.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3aXlsaGZhdmJudGtpY2t2cmRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDAyNTEzNiwiZXhwIjoyMDk1NjAxMTM2fQ.j8x06vVOfmOoaTzKaow9sGQmqrLfGK8ebWhOaZUgXnw';
process.env.ENCRYPTION_KEY = 'a383b00f567bc8d8d0653481bcad384df84263437e2fae3822df1a153f8b3b38';

const LEAD_ID   = 'd3251841-8924-4bb5-9d19-c6d6fbd28f54';
const LEAD_NAME = 'manish';
const LEAD_LOC  = 'punjab bora';

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
