import twilio from 'twilio';
import { getAdminClient } from '@/lib/supabase/admin';

export async function sendTwilioMessage(to: string, body: string, contactId?: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!accountSid || !authToken || !twilioNumber) {
    throw new Error('Twilio credentials are not fully configured in environment variables.');
  }

  const client = twilio(accountSid, authToken);

  // Check DND if contactId is provided
  if (contactId) {
    const supabase = getAdminClient();
    const { data: contact } = await supabase
      .from('contacts')
      .select('opted_out')
      .eq('id', contactId)
      .single();

    if (contact?.opted_out) {
      console.log(`[Twilio] Contact ${contactId} has opted out. Skipping message.`);
      return { success: false, error: 'User opted out' };
    }
  }

  try {
    const message = await client.messages.create({
      body: body,
      from: twilioNumber,
      to: `whatsapp:${to.replace('+', '')}`,
    });

    return { success: true, messageSid: message.sid };
  } catch (error) {
    console.error('[Twilio] Error sending message:', error);
    return { success: false, error };
  }
}
