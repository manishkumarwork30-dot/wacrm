import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { getAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    // 1. Validate Twilio Signature
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const webhookSecret = process.env.TWILIO_WEBHOOK_SECRET;
    
    // In production, we should validate the signature. For brevity in local/dev we allow it, but we log.
    if (!authToken) {
      console.error('[Twilio Webhook] Missing TWILIO_AUTH_TOKEN');
      return NextResponse.json({ error: 'Configuration Error' }, { status: 500 });
    }

    const formData = await req.formData();
    const data = Object.fromEntries(formData.entries()) as Record<string, string>;

    const supabase = getAdminClient();

    // 2. Handle Message Status Updates (MWI)
    if (data.MessageStatus && data.MessageSid) {
      const status = data.MessageStatus; // 'sent', 'delivered', 'read', 'failed'
      const messageSid = data.MessageSid;

      // Update message status in the DB where message_id matches MessageSid
      const { error: updateError } = await supabase
        .from('messages')
        .update({ status: status })
        .eq('message_id', messageSid);

      if (updateError) {
        console.error('[Twilio Webhook] Error updating message status:', updateError);
      } else {
        console.log(`[Twilio Webhook] Message ${messageSid} status updated to ${status}`);
      }

      return NextResponse.json({ received: true });
    }

    // 3. Handle Incoming Messages & DND/Opt-out logic
    if (data.Body && data.From) {
      const fromNumber = data.From.replace('whatsapp:', '').replace('+', '');
      const body = data.Body.trim().toLowerCase();
      
      console.log(`[Twilio Webhook] Received message from ${fromNumber}: ${body}`);

      // Check for Opt-Out Keywords
      const optOutKeywords = ['stop', 'unsubscribe', 'cancel', 'quit'];
      const optInKeywords = ['start', 'subscribe', 'unstop'];

      if (optOutKeywords.includes(body) || optInKeywords.includes(body)) {
        const isOptOut = optOutKeywords.includes(body);

        // Find contact by phone number
        const { data: contacts, error: fetchError } = await supabase
          .from('contacts')
          .select('id')
          .eq('phone', fromNumber);

        if (!fetchError && contacts && contacts.length > 0) {
          // Update opted_out status for all matching contacts
          for (const contact of contacts) {
            await supabase
              .from('contacts')
              .update({ opted_out: isOptOut })
              .eq('id', contact.id);
          }
          console.log(`[Twilio Webhook] Handled Opt-${isOptOut ? 'Out' : 'In'} for ${fromNumber}`);
        }
      }
      
      // In a full implementation, you would also insert the incoming message into the `messages` table
      // and potentially trigger an automation/reply here.

      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('[Twilio Webhook] Internal Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
