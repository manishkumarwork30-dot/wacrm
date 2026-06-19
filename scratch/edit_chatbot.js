const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, '..', 'src', 'lib', 'whatsapp', 'chatbot.ts');
let content = fs.readFileSync(filepath, 'utf8');

// 1. Define simplified templates
const old_templates_block = `  // Load message templates with fallback to default Hindi values
  const welcomeMsg = config.welcome_msg || \`नमस्ते 😊\\n\\nक्या आपके पास खाली जमीन / प्लॉट है?\\n\\n4G/5G टावर इंस्टॉलेशन के लिए आवेदन आमंत्रित हैं।\\n(पंजीकरण शुल्क: ₹2,550 लागू)\\n\\nकृपया जवाब दें:\\n✅ YES – अगर आपके पास जमीन है\\n❌ NO – अगर नहीं है\`;
  const askNameMsg = config.ask_name_msg || \`नमस्ते 😊\\n\\n4G / 5G डिजिटल टावर इंस्टॉलेशन आवेदन के लिए कृपया नीचे दी गई जानकारी एक-एक करके बताएं:\\n\\n1️⃣ आपका पूरा नाम (Full Name) क्या है?\\n(पंजीकरण शुल्क: ₹2,550)\`;
  const askLocationMsg = config.ask_location_msg || \`धन्यवाद।\\n\\n2️⃣ आपकी जमीन किस स्थान (शहर / गांव / जिला) पर है? कृपया स्थान का नाम लिखकर भेजें:\`;
  const askStateMsg = config.ask_state_msg || \`3️⃣ आपकी जमीन किस राज्य (State) में है?\`;
  const askPinMsg = config.ask_pincode_msg || \`4️⃣ आपके क्षेत्र का पिन कोड (PIN Code) क्या है?\`;
  const askMobileMsg = config.ask_mobile_msg || \`5️⃣ आपका संपर्क मोबाइल नंबर क्या है? \\n\\n(यदि आप इसी व्हाट्सएप नंबर का उपयोग करना चाहते हैं, तो "YES" लिखकर भेजें)\`;
  const askSizeMsg = config.ask_size_msg || \`6️⃣ आपकी जमीन का साइज (Land Size) क्या है? (जैसे: 1500 sq ft, 20x50, 1 बीघा, या 2 कट्ठा):\`;
  const askOwnershipMsg = config.ask_ownership_msg || \`7️⃣ क्या जमीन आपकी स्वयं की (खुद की) है? (हाँ / नहीं):\`;
  const endNoLandMsg = config.end_no_land_msg || \`ठीक है 🙏\\n\\nकोई बात नहीं। अगर भविष्य में जमीन हो या किसी और को जरूरत हो, तो हमसे जरूर संपर्क करें।\\n\\nमोबाइल टावर स्थापना – आपकी सेवा में सदैव तत्पर।\`;
  const endNoTermsMsg = config.end_no_terms_msg || \`ठीक है 🙏\\n\\nआपके जवाब के लिए धन्यवाद。\\n\\nअगर भविष्य में आप इस अवसर का लाभ उठाना चाहें, तो हमसे जरूर संपर्क करें。\\n\\nमोबाइल टावर स्थापना – आपकी सेवा में हमेशा तत्पर. 😊\`;
  const surveyMsg = config.survey_msg || \`मोबाइल टावर स्थापना संबंधी अपडेट\\n\\nप्रिय महोदय/महोदया,\\n\\nमोबाइल टावर स्थापना के अवसर में आपकी रुचि के लिए धन्यवाद।\\n\\nजैसा कि चर्चा हुई थी, हमने आपके विवरण को ऑनलाइन स्थान सर्वेक्षण के लिए हमारी सर्वेक्षण टीम को भेज दिया है। इसके आधार पर, हम पुष्टि करेंगे कि आपके क्षेत्र में टावर स्थापना की आवश्यकता है या नहीं。\\n\\n📍 यदि आपका स्थान स्वीकृत हो जाता है, तो आपको निम्नलिखित लाभ प्राप्त होंगे:\\n\\n✅ अग्रिम भुगतान: ₹70,0,000/- (स्थापना से पहले)\\n\\n✅ मासिक किराया: ₹60,000/-*\\n   (₹30,000/- सीधे आपके खाते में जमा + ₹30,000/- EMI के रूप में समायोजित)\\n\\n✅ रोजगार का अवसर:\\n   टावर रखरखाव अनुबंध के तहत परिवार के एक सदस्य को निश्चित मासिक वेतन पर नौकरी दी जाएगी।\\n\\n📝 आपके स्थान की स्वीकृति मिलने के बाद, आपको कल सुबह तक WhatsApp पर PDF स्वीकृति रिपोर्ट प्राप्त हो जाएगी SURVEY के बाद।\\n\\n📌 महत्वपूर्ण नोट:\\nस्वीकृति मिलने पर, आपको ₹2,550 का एकमुश्त पंजीकरण शुल्क देना होगा, जिससे आपकी भागीदारी और बुकिंग की पुष्टि हो जाएगी\\n\\n━━━━━━━━━━━━━━━━━━━━━━━━━━\\n\\n👉 अगर आप इन शर्तों से सहमत हैं और आगे बात करना चाहते हैं, तो कृपया "YES" लिखकर भेजें (सहमत होने के लिए)।\\n\\n👉 अगर नहीं, तो "NO" लिखकर जवाब दें।\\n\\nसादर,\\nMs. Meena Kumari\\nग्राहक संबंध कार्यकारी\\n📞 9217662196\\nमोबाइल टावर स्थापना सेवाएं\`;
  const paymentMsg = config.payment_msg || \`बहुत अच्छा! 🎉\\n\\nआपका स्थान हमारी सर्वेक्षण टीम द्वारा जांचा जाएगा。\\n\\n📋 पंजीकरण की प्रक्रिया:\\n\\n✅ पंजीकरण शुल्क: ₹2,550/-\\n\\nयह शुल्क आपकी बुकिंग और भागीदारी की पुष्टि के लिए आवश्यक है。\\n\\nपंजीकरण शुल्क जमा करने के बाद ही आगे की प्रक्रिया (जैसे NOC और एग्रीमेंट) शुरू होगी। QR कोड / Payment Details आपको जल्द ही भेजी जाएंगी।\\n\\nकृपया थोड़ा इंतजार करें। 🙏\`;`;

const new_templates_block = `  // Load message templates with fallback to default Hindi values
  const welcomeMsg = config.welcome_msg || \`नमस्ते 😊\\n\\nक्या आपके पास खाली जमीन/प्लॉट है?\\n4G/5G टावर लगाने के लिए आवेदन करें।\\n(पंजीकरण शुल्क: ₹2,550)\\n\\nजवाब दें: YES या NO\`;
  const askNameMsg = config.ask_name_msg || \`धन्यवाद! टावर आवेदन के लिए कृपया जानकारी दें:\\n\\n1️⃣ आपका पूरा नाम (Full Name) क्या है?\\n(पंजीकरण शुल्क: ₹2,550)\`;
  const askLocationMsg = config.ask_location_msg || \`2️⃣ आपकी जमीन का पूरा पता (शहर/गांव, राज्य और पिन कोड) क्या है?\\n(पंजीकरण शुल्क: ₹2,550)\`;
  const askMobileMsg = config.ask_mobile_msg || \`3️⃣ आपका मोबाइल नंबर क्या है?\\n(यदि यही व्हाट्सएप नंबर है, तो YES दबाएं)\\n(पंजीकरण शुल्क: ₹2,550)\`;
  const askSizeMsg = config.ask_size_msg || \`4️⃣ आपकी जमीन का साइज (Land Size) क्या है? (जैसे: 1500 sq ft या 1 बीघा)\\n(पंजीकरण शुल्क: ₹2,550)\`;
  const askOwnershipMsg = config.ask_ownership_msg || \`5️⃣ क्या यह जमीन आपकी खुद की है?\\n(पंजीकरण शुल्क: ₹2,550)\\n\\nजवाब दें: YES या NO\`;
  const endNoLandMsg = config.end_no_land_msg || \`ठीक है। कोई बात नहीं, धन्यवाद! 🙏\`;
  const endNoTermsMsg = config.end_no_terms_msg || \`ठीक है। धन्यवाद! 🙏\`;
  const surveyMsg = config.survey_msg || \`आवेदन जमा करने के लिए धन्यवाद।\\n\\n📍 स्वीकृत होने पर आपको मिलेगा:\\n- एडवांस: ₹70,00,000/-\\n- किराया: ₹60,000/- महीना\\n- परिवार के एक सदस्य को नौकरी\\n\\nपंजीकरण शुल्क: ₹2,550 (स्वीकृति के बाद देय)\\n\\n👉 क्या आप इन शर्तों से सहमत हैं?\\n\\nजवाब दें: YES (सहमत) या NO\`;
  const paymentMsg = config.payment_msg || \`बहुत बढ़िया! 🎉\\n\\nआपका आवेदन ऑनलाइन सर्वे के लिए भेज दिया गया है।\\n\\n(पंजीकरण शुल्क: ₹2,550)\\n\\nस्वीकृति मिलने पर कुछ ही घंटों में (बिजनेस आवर्स में) आपको व्हाट्सएप पर PDF एग्रीमेंट भेज दिया जाएगा। कृपया प्रतीक्षा करें। 🙏\`;`;

// Normalize content line endings for match
let normContent = content.replace(/\\r\\n/g, '\\n');
const normOldTemplates = old_templates_block.replace(/\\r\\n/g, '\\n');
const normNewTemplates = new_templates_block.replace(/\\r\\n/g, '\\n');

if (normContent.includes(normOldTemplates)) {
  normContent = normContent.replace(normOldTemplates, normNewTemplates);
  console.log('Replaced templates block.');
} else {
  // If the previous turn's changes are still present, try to match without fee additions
  const old_templates_no_fee = old_templates_block.replace(/\\(पंजीकरण शुल्क: ₹2,550 लागू\\)\\n/g, '').replace(/\\(पंजीकरण शुल्क: ₹2,550\\)\\n/g, '');
  const normOldNoFee = old_templates_no_fee.replace(/\\r\\n/g, '\\n');
  if (normContent.includes(normOldNoFee)) {
    normContent = normContent.replace(normOldNoFee, normNewTemplates);
    console.log('Replaced templates block (no-fee fallback).');
  } else {
    // Let's print the actual lines to debug
    console.error('Error: templates block not found.');
  }
}

// 2. Modify Trigger state (welcomeMsg with buttons)
const old_trigger = `      // Send greeting
      await sendAndLogBotMessage(conversationId, phoneNumberId, accessToken, senderPhone, welcomeMsg);
      return true; // consumed`;

const new_trigger = `      // Send greeting with buttons
      await sendAndLogInteractiveButtons(conversationId, phoneNumberId, accessToken, senderPhone, welcomeMsg, [
        { id: 'yes_welcome', title: 'YES' },
        { id: 'no_welcome', title: 'NO' }
      ]);
      return true; // consumed`;

const normOldTrigger = old_trigger.replace(/\\r\\n/g, '\\n');
const normNewTrigger = new_trigger.replace(/\\r\\n/g, '\\n');

if (normContent.includes(normOldTrigger)) {
  normContent = normContent.replace(normOldTrigger, normNewTrigger);
  console.log('Replaced trigger.');
} else {
  console.error('Error: trigger block not found.');
}

// 3. Replace state switch case logic
const old_switch_body = `  switch (currentState) {
    case 'AWAITING_LAND_CONFIRMATION': {
      const isYes = ['yes', 'yes.', 'yes,', 'interested', 'हाँ', 'हाँ।', 'है', 'ha', 'haa', 'han', 'y'].some(k => textLower.includes(k));
      const isNo = ['no', 'no.', 'no,', 'नहीं', 'नही', 'nah', 'n'].some(k => textLower.includes(k));

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
        const repromptMsg = \`कृपया YES या NO में जवाब दें:\\n\\n✅ YES – अगर आपके पास जमीन है\\n❌ NO – अगर नहीं है\`;
        await sendAndLogBotMessage(conversationId, phoneNumberId, accessToken, senderPhone, repromptMsg);
      }
      return true;
    }

    case 'AWAITING_NAME': {
      collectedData.name = textClean;
      await db.from('tower_leads').update({ name: textClean }).eq('contact_id', contactId);
      // using scope askLocationMsg

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
      });

      await sendAndLogBotMessage(conversationId, phoneNumberId, accessToken, senderPhone, askLocationMsg);
      return true;
    }

    case 'AWAITING_LOCATION': {
      collectedData.location = textClean;
      await db.from('tower_leads').update({ location: textClean }).eq('contact_id', contactId);
      // using scope askStateMsg

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
      });

      await sendAndLogBotMessage(conversationId, phoneNumberId, accessToken, senderPhone, askStateMsg);
      return true;
    }

    case 'AWAITING_STATE': {
      collectedData.state = textClean;
      await db.from('tower_leads').update({ state: textClean }).eq('contact_id', contactId);
      // using scope askPinMsg

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
      });

      await sendAndLogBotMessage(conversationId, phoneNumberId, accessToken, senderPhone, askPinMsg);
      return true;
    }

    case 'AWAITING_PINCODE': {
      collectedData.pin_code = textClean;
      await db.from('tower_leads').update({ pin_code: textClean }).eq('contact_id', contactId);
      // using scope askMobileMsg

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
      });

      await sendAndLogBotMessage(conversationId, phoneNumberId, accessToken, senderPhone, askMobileMsg);
      return true;
    }

    case 'AWAITING_MOBILE': {
      const isYes = ['yes', 'yes.', 'हाँ', 'हाँ।', 'ha', 'haa', 'han', 'y'].some(k => textLower === k);
      collectedData.mobile_no = isYes ? senderPhone : textClean;
      await db.from('tower_leads').update({ mobile_no: collectedData.mobile_no }).eq('contact_id', contactId);
      // using scope askSizeMsg

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
      });

      await sendAndLogBotMessage(conversationId, phoneNumberId, accessToken, senderPhone, askSizeMsg);
      return true;
    }

    case 'AWAITING_LAND_SIZE': {
      collectedData.land_size = textClean;
      await db.from('tower_leads').update({ land_size: textClean }).eq('contact_id', contactId);
      // using scope askOwnershipMsg

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
        status: 'Pending - Size Collected'
      });

      await sendAndLogBotMessage(conversationId, phoneNumberId, accessToken, senderPhone, askOwnershipMsg);
      return true;
    }

    case 'AWAITING_OWNERSHIP': {
      collectedData.is_owned = textClean;

      // Update lead ownership in tower_leads
      await db.from('tower_leads').update({ ownership: textClean }).eq('contact_id', contactId);

      // Get lead ID
      const { data: lead } = await db.from('tower_leads').select('id').eq('contact_id', contactId).maybeSingle();
      collectedData.lead_id = lead?.id;

      // Save to Google Sheets
      await postToGoogleSheets({
        name: collectedData.name || 'Unknown',
        mobile_no: collectedData.mobile_no || senderPhone,
        location: collectedData.location || 'Not provided',
        state: collectedData.state || '',
        pin_code: collectedData.pin_code || '',
        land_size: collectedData.land_size || '',
        ownership: textClean,
        status: 'Pending'
      });

      // using scope surveyMsg

      await db.from('chatbot_runs').update({
        state: 'AWAITING_TERMS_AGREEMENT',
        collected_data: collectedData,
        updated_at: new Date().toISOString()
      }).eq('id', run.id);

      await sendAndLogBotMessage(conversationId, phoneNumberId, accessToken, senderPhone, surveyMsg);
      return true;
    }

    case 'AWAITING_TERMS_AGREEMENT': {
      const isYes = ['yes', 'yes.', 'yes,', 'हाँ', 'हाँ।', 'ha', 'haa', 'han', 'agree', 'y'].some(k => textLower.includes(k));
      const isNo = ['no', 'no.', 'no,', 'नहीं', 'नही', 'not interested', 'n'].some(k => textLower.includes(k));

      const leadId = collectedData.lead_id;

      if (isYes) {
        // using scope paymentMsg

        // Update lead in local DB
        if (leadId) {
          await db.from('tower_leads')
            .update({ status: 'Interested – Payment Pending', updated_at: new Date().toISOString() })
            .eq('id', leadId);
        }

        // Post update to Google Sheets
        await postToGoogleSheets({
          name: collectedData.name || 'Unknown',
          mobile_no: collectedData.mobile_no || senderPhone,
          location: collectedData.location || 'Not provided',
          state: collectedData.state || '',
          pin_code: collectedData.pin_code || '',
          land_size: collectedData.land_size || '',
          ownership: collectedData.is_owned || '',
          status: 'Interested – Payment Pending'
        });

        // Clear chatbot run
        await db.from('chatbot_runs').delete().eq('id', run.id);

        await sendAndLogBotMessage(conversationId, phoneNumberId, accessToken, senderPhone, paymentMsg);

        // SEND APPROVAL PDF AUTOMATICALLY
        try {
          console.log('[chatbot] Generating and sending Approval PDF automatically...');
          const finalName = collectedData.name || 'Unknown';
          const finalLocation = collectedData.location || 'Unknown Location';
          collectedData.date = new Date().toISOString();
          const pdfBuffer = await generateCongratulationsDoc(collectedData);
          const fileName = \`approval_\${leadId || contactId}_\${Date.now()}.pdf\`;
          
          const { error: uploadError } = await db.storage.from('documents').upload(fileName, pdfBuffer, {
            contentType: 'application/pdf',
            upsert: true
          });
          
          if (!uploadError) {
            const { data: { publicUrl } } = db.storage.from('documents').getPublicUrl(fileName);
            const captionText = \`Congratulations *\${finalName}*! 🎉\\n\\nYour tower installation application for *\${finalLocation}* has been officially QUALIFIED.\\n\\nPlease find your official Approval Letter attached above.\`;
            
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
            
            // Mark as Approval Sent
            if (leadId) {
              await db.from('tower_leads').update({ status: 'Approval Sent' }).eq('id', leadId);
              // Also update sheet to reflect the approval was sent!
              await postToGoogleSheets({
                name: collectedData.name || 'Unknown',
                mobile_no: collectedData.mobile_no || senderPhone,
                location: collectedData.location || 'Not provided',
                state: collectedData.state || '',
                pin_code: collectedData.pin_code || '',
                land_size: collectedData.land_size || '',
                ownership: collectedData.is_owned || '',
                status: 'Approval Sent'
              });
            }
          } else {
            console.error('[chatbot] Failed to upload generated PDF:', uploadError);
          }
        } catch (pdfErr) {
          console.error('[chatbot] Failed to auto-send Approval PDF:', pdfErr);
        }

        // Trigger visual automations waiting for tower completion
        runAutomationsForTrigger({
          userId,
          triggerType: 'tower_chatbot_completed' as any,
          contactId,
          context: { conversation_id: conversationId }
        }).catch(err => console.error('Failed to trigger automation:', err));

      } else if (isNo) {
        // Update lead in local DB
        if (leadId) {
          await db.from('tower_leads')
            .update({ status: 'Not Interested', updated_at: new Date().toISOString() })
            .eq('id', leadId);
        }

        // Post update to Google Sheets
        await postToGoogleSheets({
          name: collectedData.name || 'Unknown',
          mobile_no: collectedData.mobile_no || senderPhone,
          location: collectedData.location || 'Not provided',
          state: collectedData.state || '',
          pin_code: collectedData.pin_code || '',
          land_size: collectedData.land_size || '',
          ownership: collectedData.is_owned || '',
          status: 'Not Interested'
        });

        // Clear chatbot run
        await db.from('chatbot_runs').delete().eq('id', run.id);

        await sendAndLogBotMessage(conversationId, phoneNumberId, accessToken, senderPhone, endNoTermsMsg);
      } else {
        const repromptMsg = \`👉 अगर आप इन शर्तों से सहमत हैं और आगे बात करना चाहते हैं, तो कृपया "YES" लिखकर भेजें (सहमत होने के लिए)।\\n\\n👉 अगर नहीं, तो "NO" लिखकर जवाब दें।\`;
        await sendAndLogBotMessage(conversationId, phoneNumberId, accessToken, senderPhone, repromptMsg);
      }
      return true;
    }
  }`;

const new_switch_body = `  switch (currentState) {
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
        const repromptMsg = \`कृपया YES या NO में जवाब दें:\\n\\n✅ YES – अगर आपके पास जमीन है\\n❌ NO – अगर नहीं है\`;
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
      });

      await sendAndLogBotMessage(conversationId, phoneNumberId, accessToken, senderPhone, askLocationMsg);
      return true;
    }

    case 'AWAITING_LOCATION': {
      collectedData.location = textClean;
      await db.from('tower_leads').update({ location: textClean }).eq('contact_id', contactId);

      await db.from('chatbot_runs').update({
        state: 'AWAITING_MOBILE',
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
        status: 'Pending - Full Address Collected'
      });

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
      });

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
        status: 'Pending - Size Collected'
      });

      await sendAndLogInteractiveButtons(conversationId, phoneNumberId, accessToken, senderPhone, askOwnershipMsg, [
        { id: 'yes_owner', title: 'हाँ (Yes)' },
        { id: 'no_owner', title: 'नहीं (No)' }
      ]);
      return true;
    }

    case 'AWAITING_OWNERSHIP': {
      collectedData.is_owned = textClean;

      await db.from('tower_leads').update({ ownership: textClean }).eq('contact_id', contactId);

      const { data: lead } = await db.from('tower_leads').select('id').eq('contact_id', contactId).maybeSingle();
      collectedData.lead_id = lead?.id;

      await postToGoogleSheets({
        name: collectedData.name || 'Unknown',
        mobile_no: collectedData.mobile_no || senderPhone,
        location: collectedData.location || 'Not provided',
        state: collectedData.state || '',
        pin_code: collectedData.pin_code || '',
        land_size: collectedData.land_size || '',
        ownership: textClean,
        status: 'Pending'
      });

      await db.from('chatbot_runs').update({
        state: 'AWAITING_TERMS_AGREEMENT',
        collected_data: collectedData,
        updated_at: new Date().toISOString()
      }).eq('id', run.id);

      await sendAndLogInteractiveButtons(conversationId, phoneNumberId, accessToken, senderPhone, surveyMsg, [
        { id: 'yes_terms', title: 'YES (सहमत)' },
        { id: 'no_terms', title: 'NO (असहमत)' }
      ]);
      return true;
    }

    case 'AWAITING_TERMS_AGREEMENT': {
      const isYes = ['yes', 'yes.', 'yes,', 'हाँ', 'हाँ।', 'ha', 'haa', 'han', 'agree', 'y', 'yes_terms', 'yes (सहमत)'].some(k => textLower.includes(k));
      const isNo = ['no', 'no.', 'no,', 'नहीं', 'नही', 'not interested', 'n', 'no_terms', 'no (असहमत)'].some(k => textLower.includes(k));

      const leadId = collectedData.lead_id;

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
        });

        await db.from('chatbot_runs').delete().eq('id', run.id);

        await sendAndLogBotMessage(conversationId, phoneNumberId, accessToken, senderPhone, paymentMsg);

        runAutomationsForTrigger({
          userId,
          triggerType: 'tower_chatbot_completed' as any,
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
        });

        await db.from('chatbot_runs').delete().eq('id', run.id);

        await sendAndLogBotMessage(conversationId, phoneNumberId, accessToken, senderPhone, endNoTermsMsg);
      } else {
        const repromptMsg = \`👉 अगर आप इन शर्तों से सहमत हैं और आगे बात करना चाहते हैं, तो कृपया "YES" लिखकर भेजें (सहमत होने के लिए)।\\n\\n👉 अगर नहीं, तो "NO" लिखकर जवाब दें।\`;
        await sendAndLogInteractiveButtons(conversationId, phoneNumberId, accessToken, senderPhone, repromptMsg, [
          { id: 'yes_terms', title: 'YES (सहमत)' },
          { id: 'no_terms', title: 'NO (असहमत)' }
        ]);
      }
      return true;
    }
  }`;

const normOldSwitch = old_switch_body.replace(/\\r\\n/g, '\\n');
const normNewSwitch = new_switch_body.replace(/\\r\\n/g, '\\n');

if (normContent.includes(normOldSwitch)) {
  normContent = normContent.replace(normOldSwitch, normNewSwitch);
  console.log('Replaced switch body.');
} else {
  console.error('Error: switch body not found.');
}

// Convert back to CRLF (standard on Windows for these files)
const finalContent = normContent.replace(/\\n/g, '\\r\\n');
fs.writeFileSync(filepath, finalContent, 'utf8');
console.log('Done!');
