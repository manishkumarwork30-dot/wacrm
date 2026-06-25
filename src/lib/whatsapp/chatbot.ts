import { createClient } from '@supabase/supabase-js';
import { sendTextMessage, sendDocumentMessage, sendInteractiveButtons, sendCTAUrlButton, sendTemplateMessage, sendFlowMessage } from './meta-api';
import { resolveStateName, resolveOwnershipLabel } from './tower-flow-json';
import { runAutomationsForTrigger } from '@/lib/automations/engine';
import { generateCongratulationsDoc } from '@/lib/document-generator';

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

// Helper to log outgoing chatbot message to database
export async function logBotMessage(conversationId: string, text: string, messageId?: string) {
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
    console.error('[chatbot] failed to log outgoing message:', err);
  }
}

// Combined helper to send via Meta and log in DB
async function sendAndLogBotMessage(
  conversationId: string,
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string
) {
  const sent = await sendTextMessage({
    phoneNumberId,
    accessToken,
    to,
    text,
  });
  await logBotMessage(conversationId, text, sent.messageId);
  return sent;
}

// Helper to send interactive buttons and log
async function sendAndLogInteractiveButtons(
  conversationId: string,
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string,
  buttons: { id: string; title: string }[]
) {
  const sent = await sendInteractiveButtons({
    phoneNumberId,
    accessToken,
    to,
    bodyText: text,
    buttons,
  });
  await logBotMessage(conversationId, text, sent.messageId);
  return sent;
}

// Helper to send CTA URL button and log
async function sendAndLogCTAUrlButton(
  conversationId: string,
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string,
  buttonText: string,
  url: string
) {
  const sent = await sendCTAUrlButton({
    phoneNumberId,
    accessToken,
    to,
    bodyText: text,
    buttonText,
    url,
  });
  return sent;
}

// Helper to send WhatsApp Flow message and log
async function sendAndLogFlowMessage(
  conversationId: string,
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string,
  buttonText: string,
  flowId: string,
  flowCta: string
) {
  const sent = await sendFlowMessage({
    phoneNumberId,
    accessToken,
    to,
    bodyText: text,
    buttonText,
    flowId,
    flowCta,
  });
  await logBotMessage(conversationId, text, sent.messageId);
  return sent;
}


// Helper to post lead details to Google Sheets Web App URL
async function postToGoogleSheets(leadData: any) {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('[chatbot] GOOGLE_SHEETS_WEBHOOK_URL is not configured in environment');
    return;
  }

  try {
    const formattedData = {
      name: leadData.name || '',
      mobile_no: leadData.mobile_no || '',
      location: leadData.location || '',
      state: leadData.state || '',
      pin_code: leadData.pin_code || '',
      land_size: leadData.land_size || '',
      ownership: leadData.ownership || '',
      status: leadData.status || 'Pending',
      date: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    };

    console.log('[chatbot] Posting to Google Sheets:', formattedData);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formattedData)
    });

    if (!response.ok) {
      console.error('[chatbot] Google Sheets post returned non-OK status:', response.status);
    } else {
      console.log('[chatbot] Successfully posted to Google Sheets');
    }
  } catch (err) {
    console.error('[chatbot] Failed to post to Google Sheets:', err);
  }
}

export interface ChatbotProcessInput {
  userId: string;
  contactId: string;
  conversationId: string;
  senderPhone: string;
  messageText: string;
  phoneNumberId: string;
  accessToken: string;
}

export async function processChatbot(input: ChatbotProcessInput): Promise<boolean> {
  const { userId, contactId, conversationId, senderPhone, messageText, phoneNumberId, accessToken } = input;
  const db = getSupabaseAdmin();
  const textClean = messageText.trim();
  const textLower = textClean.toLowerCase();

  // Load dynamic chatbot configuration from database
  const { data: configRow } = await db
    .from('message_templates')
    .select('buttons')
    .eq('user_id', userId)
    .eq('name', '__chatbot_config')
    .maybeSingle();

  const config = (configRow?.buttons as any) || {};

  // If chatbot is explicitly disabled, stop execution
  if (config.is_active === false) {
    return false;
  }

  // Load message templates with fallback to default Hindi values
  const welcomeMsg = config.welcome_msg || `नमस्ते 😊

क्या आपके पास खाली जमीन / प्लॉट है?

4G/5G टावर इंस्टॉलेशन के लिए आवेदन आमंत्रित हैं।

आपका स्थान हमारी सर्वेक्षण टीम द्वारा जांचा जाएगा।

📋 पंजीकरण की प्रक्रिया:

✅ पंजीकरण शुल्क: ₹2,550/-

यह शुल्क आपकी बुकिंग और भागीदारी की पुष्टि के लिए आवश्यक है

📍 यदि आपका स्थान स्वीकृत हो जाता है, तो आपको निम्नलिखित लाभ प्राप्त होंगे:

✅ अग्रिम भुगतान: ₹70,00,000/- (स्थापना से पहले)

✅ मासिक किराया: ₹60,000/-*
   (₹30,000/- सीधे आपके खाते में जमा + ₹30,000/- EMI के रूप में समायोजित)

✅ रोजगार का अवसर:
   टावर रखरखाव अनुबंध के तहत परिवार के एक सदस्य को निश्चित मासिक वेतन पर नौकरी दी जाएगी।

📝 आपके स्थान की स्वीकृति मिलने के बाद, आपको कल सुबह 9 बजे से 1 बजे के बीच WhatsApp पर PDF स्वीकृति रिपोर्ट प्राप्त हो जाएगी SURVEY के बाद।

👉 आवेदन के लिए नीचे दिए गए "Apply Now" बटन पर क्लिक करें।`;
  const askNameMsg = config.ask_name_msg || `नमस्ते 😊\n\n4G / 5G डिजिटल टावर इंस्टॉलेशन आवेदन के लिए कृपया नीचे दी गई जानकारी एक-एक करके बताएं:\n\n1️⃣ आपका पूरा नाम (Full Name) क्या है?\n(पंजीकरण शुल्क: ₹2,550)`;
  const askLocationMsg = config.ask_location_msg || `धन्यवाद।\n\n2️⃣ आपकी जमीन किस स्थान (शहर / गांव / जिला) पर है? कृपया स्थान का नाम लिखकर भेजें:`;
  const askStateMsg = config.ask_state_msg || `3️⃣ आपकी जमीन किस राज्य (State) में है?`;
  const askPinMsg = config.ask_pincode_msg || `4️⃣ आपके क्षेत्र का पिन कोड (PIN Code) क्या है?`;
  const askMobileMsg = config.ask_mobile_msg || `5️⃣ आपका संपर्क मोबाइल नंबर क्या है? \n\n(यदि आप इसी व्हाट्सएप नंबर का उपयोग करना चाहते हैं, तो "YES" लिखकर भेजें)`;
  const askSizeMsg = config.ask_size_msg || `6️⃣ आपकी जमीन का साइज (Land Size) क्या है? (जैसे: 1500 sq ft, 20x50, 1 बीघा, या 2 कट्ठा):`;
  const askOwnershipMsg = config.ask_ownership_msg || `7️⃣ क्या जमीन आपकी स्वयं की (खुद की) है? (हाँ / नहीं):`;
  const endNoLandMsg = config.end_no_land_msg || `ठीक है 🙏\n\nकोई बात नहीं। अगर भविष्य में जमीन हो या किसी और को जरूरत हो, तो हमसे जरूर संपर्क करें।\n\nमोबाइल टावर स्थापना – आपकी सेवा में सदैव तत्पर।`;
  const endNoTermsMsg = config.end_no_terms_msg || `ठीक है 🙏\n\nआपके जवाब के लिए धन्यवाद。\n\nअगर भविष्य में आप इस अवसर का लाभ उठाना चाहें, तो हमसे जरूर संपर्क करें。\n\nमोबाइल टावर स्थापना – आपकी सेवा में हमेशा तत्पर. 😊`;
  const surveyMsg = config.survey_msg || `मोबाइल टावर स्थापना संबंधी अपडेट\n\nप्रिय महोदय/महोदया,\n\nमोबाइल टावर स्थापना के अवसर में आपकी रुचि के लिए धन्यवाद।\n\nजैसा कि चर्चा हुई थी, हमने आपके विवरण को ऑनलाइन स्थान सर्वेक्षण के लिए हमारी सर्वेक्षण टीम को भेज दिया है। इसके आधार पर, हम पुष्टि करेंगे कि आपके क्षेत्र में टावर स्थापना की आवश्यकता है या नहीं。\n\n📍 यदि आपका स्थान स्वीकृत हो जाता है, तो आपको निम्नलिखित लाभ प्राप्त होंगे:\n\n✅ अग्रिम भुगतान: ₹70,0,000/- (स्थापना से पहले)\n\n✅ मासिक किराया: ₹60,000/-*\n   (₹30,000/- सीधे आपके खाते में जमा + ₹30,000/- EMI के रूप में समायोजित)\n\n✅ रोजगार का अवसर:\n   टावर रखरखाव अनुबंध के तहत परिवार के एक सदस्य को निश्चित मासिक वेतन पर नौकरी दी जाएगी।\n\n📝 आपके स्थान की स्वीकृति मिलने के बाद, आपको कल सुबह तक WhatsApp पर PDF स्वीकृति रिपोर्ट प्राप्त हो जाएगी SURVEY के बाद।\n\n📌 महत्वपूर्ण नोट:\nस्वीकृति मिलने पर, आपको ₹2,550 का एकमुश्त पंजीकरण शुल्क देना होगा, जिससे आपकी भागीदारी और बुकिंग की पुष्टि हो जाएगी\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n👉 अगर आप इन शर्तों से सहमत हैं और आगे बात करना चाहते हैं, तो कृपया "YES" लिखकर भेजें (सहमत होने के लिए)।\n\n👉 अगर नहीं, तो "NO" लिखकर जवाब दें।\n\nसादर,\nMs. Meena Kumari\nग्राहक संबंध कार्यकारी\n📞 9217662196\nमोबाइल टावर स्थापना सेवाएं`;
  const paymentMsg = config.payment_msg || `बहुत अच्छा! 🎉\n\nआपका स्थान हमारी सर्वेक्षण टीम द्वारा जांचा जाएगा。\n\n📋 पंजीकरण की प्रक्रिया:\n\n✅ पंजीकरण शुल्क: ₹2,550/-\n\nयह शुल्क आपकी बुकिंग और भागीदारी की पुष्टि के लिए आवश्यक है。\n\nपंजीकरण शुल्क जमा करने के बाद ही आगे की प्रक्रिया (जैसे NOC और एग्रीमेंट) शुरू होगी। QR कोड / Payment Details आपको जल्द ही भेजी जाएंगी।\n\nकृपया थोड़ा इंतजार करें। 🙏`;

  // 1. Fetch active chatbot run for this contact
  const { data: run } = await db
    .from('chatbot_runs')
    .select('*')
    .eq('contact_id', contactId)
    .maybeSingle();

  const isTrigger = ['hi', 'hello', 'hey', 'hlo', 'namaste', 'pranam', 'ram ram', 'installation', 'tower'].some(keyword =>
    textLower.startsWith(keyword) || textLower === keyword
  );

  if (isTrigger) {
    if (run) {
      console.log(`[chatbot] Clearing existing run ${run.id} to restart chatbot for contact: ${contactId}`);
      await db.from('chatbot_runs').delete().eq('id', run.id);
    } else {
      console.log(`[chatbot] Starting chatbot for contact: ${contactId}`);
    }
    
    const useWebForm = config.use_web_form !== false;
    const useTemplateWelcome = config.use_template_welcome === true;
    const welcomeTemplateName = config.welcome_template_name || 'tower_lead_welcome';
    const welcomeTemplateLang = config.welcome_template_lang || 'hi';

    if (useWebForm) {
      if (config.flow_id) {
        // Start chatbot run awaiting flow submission
        await db.from('chatbot_runs').insert({
          user_id: userId,
          contact_id: contactId,
          state: 'AWAITING_FLOW_SUBMISSION',
          collected_data: {}
        });

        // Send greeting with native WhatsApp Flow
        await sendAndLogFlowMessage(
          conversationId,
          phoneNumberId,
          accessToken,
          senderPhone,
          welcomeMsg,
          'Apply Now',
          config.flow_id,
          'Apply Now'
        );
      } else {
        // Fallback: Start chatbot run awaiting web form submission
        await db.from('chatbot_runs').insert({
          user_id: userId,
          contact_id: contactId,
          state: 'AWAITING_FORM_SUBMISSION',
          collected_data: {}
        });

        if (useTemplateWelcome) {
          console.log(`[chatbot] Triggering welcome message via Meta approved template: ${welcomeTemplateName}`);
          // Send approved template message to force WhatsApp to open in-app popup browser
          const sent = await sendTemplateMessage({
            phoneNumberId,
            accessToken,
            to: senderPhone,
            templateName: welcomeTemplateName,
            language: welcomeTemplateLang,
            components: [
              {
                type: 'button',
                sub_type: 'url',
                index: 0,
                parameters: [
                  {
                    type: 'text',
                    text: contactId // Passed to dynamic URL button: /apply/{{1}}
                  }
                ]
              }
            ]
          });
          await logBotMessage(conversationId, `[Template Send: ${welcomeTemplateName}]`, sent.messageId);
        } else {
          const formUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://whatsapp-crm-fawn.vercel.app'}/apply/${contactId}`;
          // Send greeting with "Apply Now" CTA URL button (free-form message)
          await sendAndLogCTAUrlButton(
            conversationId,
            phoneNumberId,
            accessToken,
            senderPhone,
            welcomeMsg,
            'Apply Now',
            formUrl
          );
        }
      }
    } else {
      // Start chatbot run with questionnaire
      await db.from('chatbot_runs').insert({
        user_id: userId,
        contact_id: contactId,
        state: 'AWAITING_LAND_CONFIRMATION',
        collected_data: {}
      });

      // Send greeting with "Apply Now" button to start questionnaire
      await sendAndLogInteractiveButtons(conversationId, phoneNumberId, accessToken, senderPhone, welcomeMsg, [
        { id: 'yes_welcome', title: 'Apply Now' }
      ]);
    }
    return true; // consumed
  }

  if (!run) {
    return false; // not consumed
  }

  // 3. Process chatbot states step-by-step
  const currentState = run.state;
  const collectedData = run.collected_data || {};

  const validStates = [
    'AWAITING_FLOW_SUBMISSION',
    'AWAITING_FORM_SUBMISSION',
    'AWAITING_LAND_CONFIRMATION',
    'AWAITING_NAME',
    'AWAITING_LOCATION',
    'AWAITING_STATE',
    'AWAITING_PINCODE',
    'AWAITING_MOBILE',
    'AWAITING_LAND_SIZE',
    'AWAITING_OWNERSHIP',
    'AWAITING_TERMS_AGREEMENT'
  ];
  if (!validStates.includes(currentState)) {
    console.log(`[chatbot] Obsolete state "${currentState}" detected. Deleting chatbot run for contact: ${contactId}`);
    await db.from('chatbot_runs').delete().eq('id', run.id);
    return false;
  }

  switch (currentState) {
    case 'AWAITING_FLOW_SUBMISSION': {
      try {
        // messageText will be the JSON string from nfm_reply.response_json
        const flowData = JSON.parse(messageText);
        
        if (flowData.name && flowData.location && flowData.pin_code) {
          // Flow submitted successfully
          const resolvedState = resolveStateName(flowData.state);
          const resolvedOwnership = resolveOwnershipLabel(flowData.ownership);

          const updatedData = {
            name: flowData.name,
            location: `${flowData.location}, ${resolvedState}`,
            state: resolvedState,
            pin_code: flowData.pin_code,
            mobile_no: senderPhone,
            land_size: flowData.land_size,
            ownership: resolvedOwnership
          };
          
          await db.from('chatbot_runs').update({
            state: 'AWAITING_TERMS_AGREEMENT',
            collected_data: updatedData,
            updated_at: new Date().toISOString()
          }).eq('id', run.id);

          await sendAndLogInteractiveButtons(conversationId, phoneNumberId, accessToken, senderPhone, surveyMsg, [
            { id: 'yes_terms', title: 'YES' },
            { id: 'no_terms', title: 'NO' }
          ]);
        } else {
          // Send reminder if they just typed text instead of submitting the form
          const reminderMsg = `नमस्ते, आपका फॉर्म अभी पूरा नहीं हुआ है। कृपया "Apply Now" बटन पर क्लिक करके फॉर्म भरें।`;
          await sendAndLogFlowMessage(
            conversationId,
            phoneNumberId,
            accessToken,
            senderPhone,
            reminderMsg,
            'Apply Now',
            config.flow_id,
            'Apply Now'
          );
        }
      } catch (e) {
        // Not a valid JSON, meaning they typed something else instead of submitting the form. Remind them.
        const reminderMsg = `नमस्ते, आपका फॉर्म अभी पूरा नहीं हुआ है। कृपया "Apply Now" बटन पर क्लिक करके फॉर्म भरें।`;
        await sendAndLogFlowMessage(
          conversationId,
          phoneNumberId,
          accessToken,
          senderPhone,
          reminderMsg,
          'Apply Now',
          config.flow_id,
          'Apply Now'
        );
      }
      return true;
    }

    case 'AWAITING_FORM_SUBMISSION': {
      const formUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://whatsapp-crm-fawn.vercel.app'}/apply/${contactId}`;
      const reminderMsg = `नमस्ते, आपका आवेदन अभी पूरा नहीं हुआ है। कृपया नीचे दिए गए "Apply Now" बटन पर क्लिक करके अपना फॉर्म पूरा करें।`;

      await sendAndLogCTAUrlButton(
        conversationId,
        phoneNumberId,
        accessToken,
        senderPhone,
        reminderMsg,
        'Apply Now',
        formUrl
      );
      return true;
    }

    case 'AWAITING_LAND_CONFIRMATION': {
      const isYes = ['yes', 'yes.', 'yes,', 'interested', 'हाँ', 'हाँ।', 'है', 'ha', 'haa', 'han', 'y', 'yes_welcome'].some(k => textLower.includes(k));
      const isNo = ['no', 'no.', 'no,', 'नहीं', 'नही', 'nah', 'n', 'no_welcome'].some(k => textLower.includes(k));

      if (isYes) {
        await db.from('chatbot_runs').update({
          state: 'AWAITING_NAME',
          updated_at: new Date().toISOString()
        }).eq('id', run.id);

        await sendAndLogBotMessage(conversationId, phoneNumberId, accessToken, senderPhone, askNameMsg);
      } else if (isNo) {
        await db.from('chatbot_runs').delete().eq('id', run.id);

        await sendAndLogBotMessage(conversationId, phoneNumberId, accessToken, senderPhone, endNoLandMsg);
      } else {
        const repromptMsg = `कृपया YES या NO में जवाब दें।`;
        await sendAndLogInteractiveButtons(conversationId, phoneNumberId, accessToken, senderPhone, repromptMsg, [
          { id: 'yes_welcome', title: 'YES' },
          { id: 'no_welcome', title: 'NO' }
        ]);
      }
      return true;
    }

    case 'AWAITING_NAME': {
      collectedData.name = textClean;
      await db.from('tower_leads').update({ name: textClean }).eq('contact_id', contactId);

      await db.from('chatbot_runs').update({
        state: 'AWAITING_LOCATION',
        collected_data: collectedData,
        updated_at: new Date().toISOString()
      }).eq('id', run.id);

      await postToGoogleSheets({
        name: collectedData.name || 'Unknown',
        mobile_no: senderPhone,
        location: '',
        state: '',
        pin_code: '',
        land_size: '',
        ownership: '',
        status: 'Pending - Name Collected'
      }).catch(err => console.error('[chatbot] Google Sheets sync error:', err));

      await sendAndLogBotMessage(conversationId, phoneNumberId, accessToken, senderPhone, askLocationMsg);
      return true;
    }

    case 'AWAITING_LOCATION': {
      collectedData.location = textClean;
      await db.from('tower_leads').update({ location: textClean }).eq('contact_id', contactId);

      await db.from('chatbot_runs').update({
        state: 'AWAITING_STATE',
        collected_data: collectedData,
        updated_at: new Date().toISOString()
      }).eq('id', run.id);

      await postToGoogleSheets({
        name: collectedData.name || 'Unknown',
        mobile_no: senderPhone,
        location: collectedData.location,
        state: '',
        pin_code: '',
        land_size: '',
        ownership: '',
        status: 'Pending - Location Collected'
      }).catch(err => console.error('[chatbot] Google Sheets sync error:', err));

      await sendAndLogBotMessage(conversationId, phoneNumberId, accessToken, senderPhone, askStateMsg);
      return true;
    }

    case 'AWAITING_STATE': {
      collectedData.state = textClean;
      await db.from('tower_leads').update({ state: textClean }).eq('contact_id', contactId);

      await db.from('chatbot_runs').update({
        state: 'AWAITING_PINCODE',
        collected_data: collectedData,
        updated_at: new Date().toISOString()
      }).eq('id', run.id);

      await postToGoogleSheets({
        name: collectedData.name || 'Unknown',
        mobile_no: senderPhone,
        location: collectedData.location || '',
        state: collectedData.state,
        pin_code: '',
        land_size: '',
        ownership: '',
        status: 'Pending - State Collected'
      }).catch(err => console.error('[chatbot] Google Sheets sync error:', err));

      await sendAndLogBotMessage(conversationId, phoneNumberId, accessToken, senderPhone, askPinMsg);
      return true;
    }

    case 'AWAITING_PINCODE': {
      collectedData.pin_code = textClean;
      await db.from('tower_leads').update({ pin_code: textClean }).eq('contact_id', contactId);

      await db.from('chatbot_runs').update({
        state: 'AWAITING_MOBILE',
        collected_data: collectedData,
        updated_at: new Date().toISOString()
      }).eq('id', run.id);

      await postToGoogleSheets({
        name: collectedData.name || 'Unknown',
        mobile_no: senderPhone,
        location: collectedData.location || '',
        state: collectedData.state || '',
        pin_code: collectedData.pin_code,
        land_size: '',
        ownership: '',
        status: 'Pending - Pincode Collected'
      }).catch(err => console.error('[chatbot] Google Sheets sync error:', err));

      await sendAndLogInteractiveButtons(conversationId, phoneNumberId, accessToken, senderPhone, askMobileMsg, [
        { id: 'yes_mobile', title: 'YES (Same No)' }
      ]);
      return true;
    }

    case 'AWAITING_MOBILE': {
      const isYes = ['yes', 'yes.', 'हाँ', 'हाँ।', 'ha', 'haa', 'han', 'y', 'yes_mobile', 'yes (same no)'].some(k => textLower === k);
      collectedData.mobile_no = isYes ? senderPhone : textClean;
      await db.from('tower_leads').update({ mobile_no: collectedData.mobile_no }).eq('contact_id', contactId);

      await db.from('chatbot_runs').update({
        state: 'AWAITING_LAND_SIZE',
        collected_data: collectedData,
        updated_at: new Date().toISOString()
      }).eq('id', run.id);

      await postToGoogleSheets({
        name: collectedData.name || 'Unknown',
        mobile_no: collectedData.mobile_no,
        location: collectedData.location || '',
        state: collectedData.state || '',
        pin_code: collectedData.pin_code || '',
        land_size: '',
        ownership: '',
        status: 'Pending - Mobile Collected'
      }).catch(err => console.error('[chatbot] Google Sheets sync error:', err));

      await sendAndLogBotMessage(conversationId, phoneNumberId, accessToken, senderPhone, askSizeMsg);
      return true;
    }

    case 'AWAITING_LAND_SIZE': {
      collectedData.land_size = textClean;
      await db.from('tower_leads').update({ land_size: textClean }).eq('contact_id', contactId);

      await db.from('chatbot_runs').update({
        state: 'AWAITING_OWNERSHIP',
        collected_data: collectedData,
        updated_at: new Date().toISOString()
      }).eq('id', run.id);

      await postToGoogleSheets({
        name: collectedData.name || 'Unknown',
        mobile_no: collectedData.mobile_no || senderPhone,
        location: collectedData.location || '',
        state: collectedData.state || '',
        pin_code: collectedData.pin_code || '',
        land_size: collectedData.land_size,
        ownership: '',
        status: 'Pending - Land Size Collected'
      }).catch(err => console.error('[chatbot] Google Sheets sync error:', err));

      await sendAndLogBotMessage(conversationId, phoneNumberId, accessToken, senderPhone, askOwnershipMsg);
      return true;
    }

    case 'AWAITING_OWNERSHIP': {
      collectedData.is_owned = textClean;
      await db.from('tower_leads').update({ ownership: textClean }).eq('contact_id', contactId);

      await db.from('chatbot_runs').update({
        state: 'AWAITING_TERMS_AGREEMENT',
        collected_data: collectedData,
        updated_at: new Date().toISOString()
      }).eq('id', run.id);

      await postToGoogleSheets({
        name: collectedData.name || 'Unknown',
        mobile_no: collectedData.mobile_no || senderPhone,
        location: collectedData.location || '',
        state: collectedData.state || '',
        pin_code: collectedData.pin_code || '',
        land_size: collectedData.land_size || '',
        ownership: collectedData.is_owned,
        status: 'Pending - Ownership Collected'
      }).catch(err => console.error('[chatbot] Google Sheets sync error:', err));

      await sendAndLogInteractiveButtons(conversationId, phoneNumberId, accessToken, senderPhone, surveyMsg, [
        { id: 'yes_terms', title: 'YES' },
        { id: 'no_terms', title: 'NO' }
      ]);
      return true;
    }

    case 'AWAITING_TERMS_AGREEMENT': {
      const isYes = ['yes', 'yes.', 'yes,', 'interested', 'हाँ', 'हाँ।', 'है', 'ha', 'haa', 'han', 'y', 'yes_terms'].some(k => textLower.includes(k));
      const isNo = ['no', 'no.', 'no,', 'नहीं', 'नही', 'nah', 'n', 'no_terms'].some(k => textLower.includes(k));
      const { data: lead } = await db.from('tower_leads').select('id').eq('contact_id', contactId).maybeSingle();
      const leadId = lead?.id;

      // Schedule Approval PDF generation for next day between 9 AM and 1 PM
      try {
        console.log('[chatbot] Scheduling Approval PDF generation for next day.');
        const scheduledAt = new Date();
        // Set to next day 9:00 AM
        scheduledAt.setDate(scheduledAt.getDate() + 1);
        scheduledAt.setHours(9, 0, 0, 0);

        // Insert a task into a new table `approval_queue`
        await db.from('approval_queue').insert({
          lead_id: leadId || null,
          contact_id: contactId,
          conversation_id: conversationId,
          phone_number_id: phoneNumberId,
          access_token: accessToken,
          recipient_phone: senderPhone,
          collected_data: collectedData,
          scheduled_at: scheduledAt.toISOString(),
          status: 'pending',
        });

        // Update Google Sheet to reflect scheduled approval
        await postToGoogleSheets({
          name: collectedData.name || 'Unknown',
          mobile_no: collectedData.mobile_no || senderPhone,
          location: collectedData.location || 'Not provided',
          state: collectedData.state || '',
          pin_code: collectedData.pin_code || '',
          land_size: collectedData.land_size || '',
          ownership: collectedData.is_owned || '',
          status: 'Approval Scheduled',
        }).catch(err => console.error('[chatbot] Google Sheets sync error:', err));

        // Inform the user that approval will be sent tomorrow
        await sendAndLogBotMessage(
          conversationId,
          phoneNumberId,
          accessToken,
          senderPhone,
          'आपका आवेदन स्वीकृति के लिए शेड्यूल किया गया है। अगली दिन सुबह 9 बजे से 1 बजे के बीच आपको स्वीकृति PDF भेजी जाएगी।'
        );
      } catch (scheduleErr) {
        console.error('[chatbot] Failed to schedule Approval PDF:', scheduleErr);
      }

      if (isYes) {
        if (leadId) {
          await db.from('tower_leads')
            .update({ status: 'Interested – Payment Pending', updated_at: new Date().toISOString() })
            .eq('id', leadId);
        }

        await postToGoogleSheets({
          name: collectedData.name || 'Unknown',
          mobile_no: collectedData.mobile_no || senderPhone,
          location: collectedData.location || 'Not provided',
          state: collectedData.state || '',
          pin_code: collectedData.pin_code || '',
          land_size: collectedData.land_size || '',
          ownership: collectedData.is_owned || '',
          status: 'Interested – Payment Pending'
        }).catch(err => console.error('[chatbot] Google Sheets sync error:', err));

        await db.from('chatbot_runs').delete().eq('id', run.id);

        await sendAndLogBotMessage(conversationId, phoneNumberId, accessToken, senderPhone, paymentMsg);

        // SEND APPROVAL PDF AUTOMATICALLY
        try {
          console.log('[chatbot] Generating and sending Approval PDF automatically...');
          const finalName = collectedData.name || 'Unknown';
          const finalLocation = collectedData.location || 'Unknown Location';
          collectedData.date = new Date().toISOString();
          const pdfBuffer = await generateCongratulationsDoc(collectedData);
          const fileName = `approval_${leadId || contactId}_${Date.now()}.pdf`;
          
          const { error: uploadError } = await db.storage.from('documents').upload(fileName, pdfBuffer, {
            contentType: 'application/pdf',
            upsert: true
          });
          
          if (!uploadError) {
            const { data: { publicUrl } } = db.storage.from('documents').getPublicUrl(fileName);
            const captionText = `Congratulations *${finalName}*! 🎉\n\nYour tower installation application for *${finalLocation}* has been officially QUALIFIED.\n\nPlease find your official Approval Letter attached above.`;
            
            const sentPdf = await sendDocumentMessage({
              phoneNumberId,
              accessToken,
              to: senderPhone,
              documentUrl: publicUrl,
              filename: fileName,
              caption: captionText
            });
            await db.from('messages').insert({
              conversation_id: conversationId,
              sender_type: 'agent',
              content_type: 'document',
              content_text: captionText,
              media_url: publicUrl,
              message_id: sentPdf.messageId,
              status: 'sent',
            });
            
            await db.from('conversations').update({
              last_message_text: "Sent Approval PDF",
              last_message_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }).eq('id', conversationId);
            
            if (leadId) {
              await db.from('tower_leads').update({ status: 'Approval Sent' }).eq('id', leadId);
              await postToGoogleSheets({
                name: collectedData.name || 'Unknown',
                mobile_no: collectedData.mobile_no || senderPhone,
                location: collectedData.location || 'Not provided',
                state: collectedData.state || '',
                pin_code: collectedData.pin_code || '',
                land_size: collectedData.land_size || '',
                ownership: collectedData.is_owned || '',
                status: 'Approval Sent'
              }).catch(err => console.error('[chatbot] Google Sheets sync error:', err));
            }
          } else {
            console.error('[chatbot] Failed to upload generated PDF:', uploadError);
          }
        } catch (pdfErr) {
          console.error('[chatbot] Failed to auto-send Approval PDF:', pdfErr);
        }

        runAutomationsForTrigger({
          userId,
          triggerType: 'tower_chatbot_completed',
          contactId,
          context: { conversation_id: conversationId }
        }).catch(err => console.error('Failed to trigger automation:', err));

      } else if (isNo) {
        if (leadId) {
          await db.from('tower_leads')
            .update({ status: 'Not Interested', updated_at: new Date().toISOString() })
            .eq('id', leadId);
        }

        await postToGoogleSheets({
          name: collectedData.name || 'Unknown',
          mobile_no: collectedData.mobile_no || senderPhone,
          location: collectedData.location || 'Not provided',
          state: collectedData.state || '',
          pin_code: collectedData.pin_code || '',
          land_size: collectedData.land_size || '',
          ownership: collectedData.is_owned || '',
          status: 'Not Interested'
        }).catch(err => console.error('[chatbot] Google Sheets sync error:', err));

        await db.from('chatbot_runs').delete().eq('id', run.id);

        await sendAndLogBotMessage(conversationId, phoneNumberId, accessToken, senderPhone, endNoTermsMsg);
      } else {
        const repromptMsg = `👉 अगर आप इन शर्तों से सहमत हैं और आगे बात करना चाहते हैं, तो कृपया "YES" लिखकर भेजें (सहमत होने के लिए)।\n\n👉 अगर नहीं, तो "NO" लिखकर जवाब दें।`;
        await sendAndLogInteractiveButtons(conversationId, phoneNumberId, accessToken, senderPhone, repromptMsg, [
          { id: 'yes_terms', title: 'YES (सहमत)' },
          { id: 'no_terms', title: 'NO (असहमत)' }
        ]);
      }
      return true;
    }
  }
  return false;
}
