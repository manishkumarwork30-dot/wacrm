import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/automations/admin-client';
import { sendTextMessage } from '@/lib/whatsapp/meta-api';
import { decrypt } from '@/lib/whatsapp/encryption';
import { logBotMessage } from '@/lib/whatsapp/chatbot';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body?.contact_id || !body?.conversation_id) {
      return NextResponse.json(
        { error: 'contact_id and conversation_id are required' },
        { status: 400 }
      );
    }

    const { contact_id, conversation_id } = body;
    const db = supabaseAdmin();

    // 1. Fetch contact details (especially phone number)
    const { data: contact, error: contactError } = await db
      .from('contacts')
      .select('phone')
      .eq('id', contact_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (contactError || !contact) {
      return NextResponse.json(
        { error: contactError?.message || 'Contact not found' },
        { status: 404 }
      );
    }

    // 2. Fetch user's whatsapp config for credentials
    const { data: config, error: configError } = await db
      .from('whatsapp_config')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (configError || !config) {
      return NextResponse.json(
        { error: 'WhatsApp config not found. Connect WhatsApp in Settings first.' },
        { status: 400 }
      );
    }

    if (config.status !== 'connected') {
      return NextResponse.json(
        { error: 'WhatsApp is disconnected. Reconnect in Settings first.' },
        { status: 400 }
      );
    }

    const accessToken = decrypt(config.access_token);
    const toPhone = contact.phone;

    // 3. Load dynamic chatbot configuration from database message_templates
    const { data: configRow } = await db
      .from('message_templates')
      .select('buttons')
      .eq('user_id', user.id)
      .eq('name', '__chatbot_config')
      .maybeSingle();

    const configData = (configRow?.buttons as any) || {};
    const welcomeMsg = configData.welcome_msg || `नमस्ते 😊\n\nक्या आपके पास खाली जमीन / प्लॉट है?\n\n4G/5G टावर इंस्टॉलेशन के लिए आवेदन आमंत्रित हैं।\n\nकृपया जवाब दें:\n✅ YES – अगर आपके पास जमीन है\n❌ NO – अगर नहीं है`;

    // 4. Reset chatbot run: Delete existing run for this contact
    await db.from('chatbot_runs').delete().eq('contact_id', contact_id);

    // Ensure the lead exists in tower_leads and reset its fields so it starts fresh!
    const { data: existingLead } = await db
      .from('tower_leads')
      .select('id')
      .eq('contact_id', contact_id)
      .maybeSingle();

    if (!existingLead) {
      await db.from('tower_leads').insert({
        user_id: user.id,
        contact_id: contact_id,
        name: contact.phone,
        mobile_no: contact.phone,
        location: 'Pending Chatbot',
        status: 'Pending'
      });
    } else {
      await db.from('tower_leads').update({
        location: 'Pending Chatbot',
        state: null,
        pin_code: null,
        land_size: null,
        ownership: null,
        status: 'Pending',
        welcome_doc_sent: false
      }).eq('contact_id', contact_id);
    }

    const useWebForm = configData.use_web_form !== false;

    if (useWebForm) {
      // 5. Start new chatbot run
      const { error: runError } = await db.from('chatbot_runs').insert({
        user_id: user.id,
        contact_id: contact_id,
        state: 'AWAITING_FORM_SUBMISSION',
        collected_data: {}
      });

      if (runError) {
        console.error('[chatbot-trigger] Failed to start chatbot run:', runError.message);
        return NextResponse.json(
          { error: `Failed to start chatbot run: ${runError.message}` },
          { status: 500 }
        );
      }

      const formUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://whatsapp-crm-fawn.vercel.app'}/apply/${contact_id}`;
      const textToSend = `${welcomeMsg}\n\n📋 कृपया नीचे दिए गए लिंक पर क्लिक करके अपना आवेदन फॉर्म भरें (यह लिंक व्हाट्सएप पर ही खुल जाएगा):\n👉 ${formUrl}`;

      // 6. Send the initial welcome message via WhatsApp Meta Cloud API
      const sent = await sendTextMessage({
        phoneNumberId: config.phone_number_id,
        accessToken,
        to: toPhone,
        text: textToSend
      });

      // 7. Log message in local database
      await logBotMessage(conversation_id, textToSend, sent.messageId);
    } else {
      // 5. Start new chatbot run with questionnaire
      const { error: runError } = await db.from('chatbot_runs').insert({
        user_id: user.id,
        contact_id: contact_id,
        state: 'AWAITING_LAND_CONFIRMATION',
        collected_data: {}
      });

      if (runError) {
        console.error('[chatbot-trigger] Failed to start chatbot run:', runError.message);
        return NextResponse.json(
          { error: `Failed to start chatbot run: ${runError.message}` },
          { status: 500 }
        );
      }

      // 6. Send the initial welcome message via WhatsApp Meta Cloud API
      const sent = await sendTextMessage({
        phoneNumberId: config.phone_number_id,
        accessToken,
        to: toPhone,
        text: welcomeMsg
      });

      // 7. Log message in local database
      await logBotMessage(conversation_id, welcomeMsg, sent.messageId);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[chatbot-trigger] Internal error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
