const fs = require('fs');

const filePath = 'src/components/settings/chatbot-config.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Replace Meena Kumari phone number and Guard Salary in default survey_msg
const oldSurvey = `✅ रोजगार का अवसर:\\n   टावर रखरखाव अनुबंध के तहत परिवार के एक सदस्य को निश्चित मासिक वेतन पर नौकरी दी जाएगीã€‚\\n\\nðŸ“ आपके स्थान की स्वीकृति मिलने के बाद, आपको कल सुबह तक WhatsApp पर PDF स्वीकृति रिपोर्ट प्राप्त हो जाएगी SURVEY के बाद।\\n\\nðŸ“Œ महत्वपूर्ण नोट:\\nस्वीकृति मिलने पर, आपको â‚¹2,550 का एकमुश्त पंजीकरण शुल्क देना होगा, जिससे आपकी भागीदारी और बुकिंग की पुष्टि हो जाएगी\\n\\nâ”—â”—â”—â”—â”—â”—â”—â”—â”—â”—â”—â”—â”—â”—â”—â”—â”—â”—â”—â”—â”—â”—â”—â”—â”—â”—\\n\\n👉 अगर आप इन शर्तों से सहमत हैं और आगे बात करना चाहते हैं, तो कृपया "YES" लिखकर भेजें (सहमत होने के लिए)।\\n\\n👉 अगर नहीं, तो "NO" लिखकर जवाब दें।\\n\\nसादर,\\nMs. Meena Kumari\\nग्राहक संबंध कार्यकारी\\n📞 9217662196\\nमोबाइल टावर स्थापना सेवाएं`;

// Let's use a simpler replace by targetting specific unique substrings in survey_msg:
const oldContact = '📞 9217662196';
const newContact = '📞 8796156214';

const oldSalary = '✅ रोजगार का अवसर:\\n   टावर रखरखाव अनुबंध के तहत परिवार के एक सदस्य को निश्चित मासिक वेतन पर नौकरी दी जाएगी';
const newSalary = '✅ रोजगार का अवसर: 20,000/- \\n   टावर रखरखाव अनुबंध के तहत परिवार के एक सदस्य को निश्चित मासिक वेतन पर नौकरी दी जाएगी';

content = content.replace(oldContact, newContact);
content = content.replace('रोजगार का अवसर:\\n   टावर रखरखाव अनुबंध', 'रोजगार का अवसर: 20,000/- \\n   टावर रखरखाव अनुबंध');

// 2. Replace the Lead Details card to only contain step 1, 2, and 3
// We target the CardContent content between askNameMsg field and askOwnershipMsg field
const oldCardBlock = `{renderField(
                'Step 1: Ask Name',
                'Prompts for user\\\'s full name.',
                askNameMsg,
                setAskNameMsg,
                'ask_name_msg'
              )}
              {renderField(
                'Step 2: Ask Location',
                'Prompts for town, village, or district.',
                askLocationMsg,
                setAskLocationMsg,
                'ask_location_msg'
              )}
              {renderField(
                'Step 3: Ask State',
                'Prompts for the state.',
                askStateMsg,
                setAskStateMsg,
                'ask_state_msg'
              )}
              {renderField(
                'Step 4: Ask PIN Code',
                'Prompts for the area pin code.',
                askPinMsg,
                setAskPinMsg,
                'ask_pincode_msg'
              )}
              {renderField(
                'Step 5: Ask Mobile Number',
                'Prompts for contact number (with option to choose current WhatsApp number).',
                askMobileMsg,
                setAskMobileMsg,
                'ask_mobile_msg'
              )}
              {renderField(
                'Step 6: Ask Land Size',
                'Prompts for property size.',
                askSizeMsg,
                setAskSizeMsg,
                'ask_size_msg'
              )}
              {renderField(
                'Step 7: Ask Land Ownership',
                'Prompts to verify owner occupancy/legal rights.',
                askOwnershipMsg,
                setAskOwnershipMsg,
                'ask_ownership_msg'
              )}`;

const newCardBlock = `{renderField(
                'Step 1: Ask Name',
                'Prompts for user\\\'s full name.',
                askNameMsg,
                setAskNameMsg,
                'ask_name_msg'
              )}
              {renderField(
                'Step 2: Ask State',
                'Prompts for the state.',
                askStateMsg,
                setAskStateMsg,
                'ask_state_msg'
              )}
              {renderField(
                'Step 3: Ask PIN Code',
                'Prompts for the area pin code.',
                askPinMsg,
                setAskPinMsg,
                'ask_pincode_msg'
              )}`;

// We normalize newlines to do the replacement reliably
const normalize = (str) => str.replace(/\r\n/g, '\n');

const normalizedContent = normalize(content);
const normalizedOldCardBlock = normalize(oldCardBlock);
const normalizedNewCardBlock = normalize(newCardBlock);

if (normalizedContent.includes(normalizedOldCardBlock)) {
  const updatedContent = normalizedContent.replace(normalizedOldCardBlock, normalizedNewCardBlock);
  // Restore Windows line endings if the original file had them
  const finalContent = content.includes('\r\n') ? updatedContent.replace(/\n/g, '\r\n') : updatedContent;
  fs.writeFileSync(filePath, finalContent, 'utf8');
  console.log("Successfully updated chatbot-config.tsx UI card and default survey_msg!");
} else {
  console.error("Could not find the target Card block in chatbot-config.tsx. Check spelling/spaces.");
}
