const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, '..', 'src', 'lib', 'whatsapp', 'chatbot.ts');
let fileContent = fs.readFileSync(filepath, 'utf8');

// Split file by lines
const lines = fileContent.split(/\r?\n/);

// 1. Replace default message templates dynamically
const templateStart = lines.findIndex(line => line.includes("const welcomeMsg ="));
const templateEnd = lines.findIndex(line => line.includes("const paymentMsg ="));

console.log(`Template start line index: ${templateStart}, end line index: ${templateEnd}`);

if (templateStart !== -1 && templateEnd !== -1 && templateEnd > templateStart) {
  const newTemplates = `  const welcomeMsg = config.welcome_msg || \`नमस्ते 😊\\n\\nक्या आपके पास खाली जमीन/प्लॉट है?\\n4G/5G टावर लगाने के लिए आवेदन करें।\\n(पंजीकरण शुल्क: ₹2,550)\\n\\nजवाब दें: YES या NO\`;
  const askNameMsg = config.ask_name_msg || \`धन्यवाद! टावर आवेदन के लिए कृपया जानकारी दें:\\n\\n1️⃣ आपका पूरा नाम (Full Name) क्या है?\\n(पंजीकरण शुल्क: ₹2,550)\`;
  const askLocationMsg = config.ask_location_msg || \`2️⃣ आपकी जमीन का पूरा पता (शहर/गांव, राज्य और पिन कोड) क्या है?\\n(पंजीकरण शुल्क: ₹2,550)\`;
  const askMobileMsg = config.ask_mobile_msg || \`3️⃣ आपका मोबाइल नंबर क्या है?\\n(यदि यही व्हाट्सएप नंबर है, तो YES दबाएं)\\n(पंजीकरण शुल्क: ₹2,550)\`;
  const askSizeMsg = config.ask_size_msg || \`4️⃣ आपकी जमीन का साइज (Land Size) क्या है? (जैसे: 1500 sq ft या 1 बीघा)\\n(पंजीकरण शुल्क: ₹2,550)\`;
  const askOwnershipMsg = config.ask_ownership_msg || \`5️⃣ क्या यह जमीन आपकी खुद की है?\\n(पंजीकरण शुल्क: ₹2,550)\\n\\nजवाब दें: YES या NO\`;
  const endNoLandMsg = config.end_no_land_msg || \`ठीक है। कोई बात नहीं, धन्यवाद! 🙏\`;
  const endNoTermsMsg = config.end_no_terms_msg || \`ठीक है। धन्यवाद! 🙏\`;
  const surveyMsg = config.survey_msg || \`आवेदन जमा करने के लिए धन्यवाद।\\n\\n📍 स्वीकृत होने पर आपको मिलेगा:\\n- एडवांस: ₹70,0,000/-\\n- किराया: ₹60,000/- महीना\\n- परिवार के एक सदस्य को नौकरी\\n\\nपंजीकरण शुल्क: ₹2,550 (स्वीकृति के बाद देय)\\n\\n👉 क्या आप इन शर्तों से सहमत हैं?\\n\\nजवाब दें: YES (सहमत) या NO\`;
  const paymentMsg = config.payment_msg || \`बहुत बढ़िया! 🎉\\n\\nआपका आवेदन ऑनलाइन सर्वे के लिए भेज दिया गया है।\\n\\n(पंजीकरण शुल्क: ₹2,550)\\n\\nस्वीकृति मिलने पर कुछ ही घंटों में (बिजनेस आवर्स में) आपको व्हाट्सएप पर PDF एग्रीमेंट भेज दिया जाएगा। कृपया प्रतीक्षा करें। 🙏\`;`;

  lines.splice(templateStart, templateEnd - templateStart + 1, newTemplates);
  console.log('Replaced templates block successfully.');
} else {
  console.error('Error: Template start or end index not found.');
}

// Join and split to get clean indices for next edits
fileContent = lines.join('\n');
const lines2 = fileContent.split('\n');

// 2. Replace the trigger greeting
const triggerIndex = lines2.findIndex(line => line.includes('await sendAndLogBotMessage(conversationId, phoneNumberId, accessToken, senderPhone, welcomeMsg);'));
if (triggerIndex !== -1) {
  lines2[triggerIndex] = `      // Send greeting with buttons
      await sendAndLogInteractiveButtons(conversationId, phoneNumberId, accessToken, senderPhone, welcomeMsg, [
        { id: 'yes_welcome', title: 'YES' },
        { id: 'no_welcome', title: 'NO' }
      ]);`;
  console.log('Replaced greeting trigger.');
} else {
  console.error('Trigger greeting not found.');
}

// 3. Replace the switch case block.
const switchStartIndex = lines2.findIndex(line => line.includes("case 'AWAITING_LAND_CONFIRMATION': {"));
const returnFalseIndex = lines2.lastIndexOf("  return false;");
const switchEndIndex = returnFalseIndex - 1;

console.log(`switchStartIndex: ${switchStartIndex}, returnFalseIndex: ${returnFalseIndex}, switchEndIndex: ${switchEndIndex}`);

if (switchStartIndex !== -1 && switchEndIndex !== -1 && switchEndIndex > switchStartIndex) {
  const newSwitchBody = `    case 'AWAITING_LAND_CONFIRMATION': {
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

  lines2.splice(switchStartIndex, switchEndIndex - switchStartIndex + 1, newSwitchBody);
  console.log('Replaced switch body successfully.');
} else {
  console.error('Switch start or end index not found.');
}

fs.writeFileSync(filepath, lines2.join('\n'), 'utf8');
console.log('File successfully updated!');
