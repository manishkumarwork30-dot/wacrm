import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateCongratulationsDoc } from '@/lib/document-generator';
import { sendDocumentMessage } from '@/lib/whatsapp/meta-api';
import { decrypt } from '@/lib/whatsapp/encryption';

// This is the cron endpoint that runs every hour via Vercel
export async function GET(req: Request) {
  // Check authorization header for security (important for cron jobs)
  // Optional: Vercel sends a specific header `x-vercel-cron` or you can use a cron secret.
  
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // We want leads that qualified 10 hours ago.
    // 'updated_at' <= now - 10 hours
    const tenHoursAgo = new Date();
    tenHoursAgo.setHours(tenHoursAgo.getHours() - 10);
    const timeThreshold = tenHoursAgo.toISOString();

    const { data: leads, error } = await db
      .from('tower_leads')
      .select('*')
      .eq('status', 'Interested – Payment Pending')
      .is('welcome_doc_sent', false)
      .lte('updated_at', timeThreshold);

    if (error) {
      console.error('Error fetching leads:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({ message: 'No leads found to process' }, { status: 200 });
    }

    // Get the first WA account config from DB to get access token and phone number ID
    const { data: accounts } = await db.from('whatsapp_accounts').select('*').limit(1);
    const waAccount = accounts?.[0];

    if (!waAccount) {
      console.error('No WhatsApp account configured');
      return NextResponse.json({ error: 'No WhatsApp account configured' }, { status: 500 });
    }

    let processedCount = 0;

    for (const lead of leads) {
      try {
        // 2. Generate PDF using dynamic data instead of just name and location
        // We pass the lead object
        const pdfBytes = await generateCongratulationsDoc({
          name: lead.name || 'User',
          location: lead.location || 'Your Location',
          mobile_no: lead.phone,
          state: lead.state,
          pin_code: lead.pin_code,
          land_size: lead.land_size,
          ownership: lead.ownership,
          date: lead.updated_at || new Date().toISOString()
        });
        const filename = `Approval_Letter_${lead.name || 'User'}.pdf`;

        // 2. Upload to Supabase Storage temporarily (create a bucket named "documents" if it doesn't exist)
        // Wait, for this we need a 'documents' bucket. You must create this in Supabase dashboard.
        const { data: uploadData, error: uploadError } = await db.storage
          .from('documents')
          .upload(`welcomes/${lead.id}-${Date.now()}.pdf`, pdfBytes, {
            contentType: 'application/pdf',
            upsert: true
          });

        if (uploadError) {
          console.error(`Failed to upload doc for lead ${lead.id}:`, uploadError);
          continue; // Skip this lead and try again next run
        }

        // Get public URL
        const { data: publicUrlData } = db.storage
          .from('documents')
          .getPublicUrl(uploadData.path);
        
        const documentUrl = publicUrlData.publicUrl;

        // 3. Send WhatsApp Document Message
        await sendDocumentMessage({
          phoneNumberId: waAccount.phone_number_id,
          accessToken: decrypt(waAccount.access_token),
          to: lead.mobile_no,
          documentUrl: documentUrl,
          filename: filename,
          caption: `Congratulations ${lead.name}! 🎊\n\nYour location at ${lead.location} has been successfully verified for the tower installation. Please find your approval document attached.`
        });

        // 4. Mark lead as processed
        await db.from('tower_leads')
          .update({ welcome_doc_sent: true })
          .eq('id', lead.id);

        processedCount++;
      } catch (err) {
        console.error(`Failed processing lead ${lead.id}:`, err);
      }
    }

    return NextResponse.json({ message: `Processed ${processedCount} leads` }, { status: 200 });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
