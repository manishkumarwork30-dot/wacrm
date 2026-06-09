import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTextMessage } from '@/lib/whatsapp/meta-api';
import { decrypt } from '@/lib/whatsapp/encryption';

let _adminClient: any = null;
function getSupabaseAdmin() {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _adminClient;
}

async function logBotMessage(conversationId: string, text: string, messageId?: string) {
  const db = getSupabaseAdmin();
  try {
    await db.from('messages').insert({
      conversation_id: conversationId,
      sender_type: 'agent',
      content_type: 'text',
      content_text: text,
      message_id: messageId || null,
      status: 'sent',
    });
    await db.from('conversations').update({
      last_message_text: text,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', conversationId);
  } catch (err) {
    console.error('[chatbot-cron] failed to log outgoing message:', err);
  }
}

export async function GET(request: Request) {
  // Use same cron secret for security
  const expected = process.env.AUTOMATION_CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'cron not configured' }, { status: 503 });
  }

  const supplied = request.headers.get('x-cron-secret') ?? '';
  if (supplied !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  const now = new Date();
  
  // Cutoff is 48 hours ago
  const cutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

  // Find chatbot runs stuck in AWAITING_TERMS_AGREEMENT for more than 48 hours
  const { data: runs, error } = await db
    .from('chatbot_runs')
    .select('*, contacts(phone)')
    .eq('state', 'AWAITING_TERMS_AGREEMENT')
    .lt('updated_at', cutoff);

  if (error) {
    console.error('[chatbot-cron] failed to fetch active runs:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!runs || runs.length === 0) {
    return NextResponse.json({ success: true, processed: 0 });
  }

  console.log(`[chatbot-cron] Found ${runs.length} runs eligible for 48h follow-up`);
  let processed = 0;

  for (const run of runs) {
    try {
      // 1. Fetch user's whatsapp config for credentials
      const { data: config } = await db
        .from('whatsapp_config')
        .select('*')
        .eq('user_id', run.user_id)
        .single();

      if (!config || !run.contacts?.phone) continue;

      const accessToken = decrypt(config.access_token);
      const toPhone = run.contacts.phone;

      // 2. Fetch conversation id
      const { data: conv } = await db
        .from('conversations')
        .select('id')
        .eq('user_id', run.user_id)
        .eq('contact_id', run.contact_id)
        .single();

      if (!conv) continue;

      const followUpMsg = `नमस्ते 😊\n\nहमने आपको पहले मोबाइल टावर स्थापना के बारे में जानकारी भेजी थी।\n\nक्या आप अभी भी इस अवसर में रुचि रखते हैं?\n\n👉 अगर आप इन शर्तों से सहमत हैं और आगे बात करना चाहते हैं, तो कृपया "YES" लिखकर भेजें。\n\n👉 अगर नहीं, तो कृपया "NO" लिखकर जवाब दें।\n\nहम आपकी प्रतिक्रिया का इंतजार कर रहे हैं। 🙏\n\nसादर,\nMs. Meena Kumari | मोबाइल टावर स्थापना\n📞 9217662196`;

      // 3. Send follow-up message
      const sent = await sendTextMessage({
        phoneNumberId: config.phone_number_id,
        accessToken,
        to: toPhone,
        text: followUpMsg
      });

      // 4. Log message to conversation
      await logBotMessage(conv.id, followUpMsg, sent.messageId);

      // 5. Update updated_at of the chatbot run so it waits another 48 hours
      await db
        .from('chatbot_runs')
        .update({
          updated_at: now.toISOString()
        })
        .eq('id', run.id);

      processed++;
    } catch (err) {
      console.error(`[chatbot-cron] Error processing follow-up for run ${run.id}:`, err);
    }
  }

  return NextResponse.json({ success: true, processed });
}
