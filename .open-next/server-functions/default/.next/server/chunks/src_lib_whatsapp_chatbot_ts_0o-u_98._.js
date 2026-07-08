module.exports=[80119,e=>{"use strict";var t=e.i(24389),a=e.i(16807),o=e.i(23943),n=e.i(10886);let i=null;function s(){return i||(i=(0,t.createClient)("https://bwiylhfavbntkickvrdl.supabase.co",process.env.SUPABASE_SERVICE_ROLE_KEY)),i}async function l(e,t,a){let o=s();try{await o.from("messages").insert({conversation_id:e,sender_type:"agent",content_type:"text",content_text:t,message_id:a||null,status:"sent"}),await o.from("conversations").update({last_message_text:t,last_message_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",e)}catch(e){console.error("[chatbot] failed to log outgoing message:",e)}}async function r(e,t,o,n,i){let s=await (0,a.sendTextMessage)({phoneNumberId:t,accessToken:o,to:n,text:i});return await l(e,i,s.messageId),s}async function c(e,t,o,n,i,s){let r=await (0,a.sendInteractiveButtons)({phoneNumberId:t,accessToken:o,to:n,bodyText:i,buttons:s});return await l(e,i,r.messageId),r}async function d(e,t,o,n,i,s,r){let c=await (0,a.sendCTAUrlButton)({phoneNumberId:t,accessToken:o,to:n,bodyText:i,buttonText:s,url:r});return await l(e,i,c.messageId),c}async function _(e,t,o,n,i,s,r,c){let d=await (0,a.sendFlowMessage)({phoneNumberId:t,accessToken:o,to:n,bodyText:i,buttonText:s,flowId:r,flowCta:c});return await l(e,i,d.messageId),d}async function m(e){let t=process.env.GOOGLE_SHEETS_WEBHOOK_URL;if(!t)return void console.log("[chatbot] GOOGLE_SHEETS_WEBHOOK_URL is not configured in environment");try{let a={name:e.name||"",mobile_no:e.mobile_no||"",location:e.location||"",state:e.state||"",pin_code:e.pin_code||"",land_size:e.land_size||"",ownership:e.ownership||"",status:e.status||"Pending",date:new Date().toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})};console.log("[chatbot] Posting to Google Sheets:",a);let o=await fetch(t,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(a)});o.ok?console.log("[chatbot] Successfully posted to Google Sheets"):console.error("[chatbot] Google Sheets post returned non-OK status:",o.status)}catch(e){console.error("[chatbot] Failed to post to Google Sheets:",e)}}async function p(e){let{userId:t,contactId:i,conversationId:p,senderPhone:w,messageText:u,phoneNumberId:I,accessToken:h}=e,A=s(),S=u.trim(),g=S.toLowerCase(),{data:N}=await A.from("message_templates").select("buttons").eq("user_id",t).eq("name","__chatbot_config").maybeSingle(),b=N?.buttons||{};if(!1===b.is_active)return!1;let y=b.welcome_msg||`नमस्ते 😊

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

👉 आवेदन के लिए नीचे दिए गए "Apply Now" बटन पर क्लिक करें।`,f=b.ask_name_msg||`नमस्ते 😊

4G / 5G डिजिटल टावर इंस्टॉलेशन आवेदन के लिए कृपया नीचे दी गई जानकारी एक-एक करके बताएं:

1️⃣ आपका पूरा नाम (Full Name) क्या है?
(पंजीकरण शुल्क: ₹2,550)`,O=b.ask_location_msg||`धन्यवाद।

2️⃣ आपकी जमीन किस स्थान (शहर / गांव / जिला) पर है? कृपया स्थान का नाम लिखकर भेजें:`,T=b.ask_state_msg||"3️⃣ आपकी जमीन किस राज्य (State) में है?",E=b.ask_pincode_msg||"4️⃣ आपके क्षेत्र का पिन कोड (PIN Code) क्या है?",G=b.ask_mobile_msg||`5️⃣ आपका संपर्क मोबाइल नंबर क्या है? 

(यदि आप इसी व्हाट्सएप नंबर का उपयोग करना चाहते हैं, तो "YES" लिखकर भेजें)`,W=b.ask_size_msg||"6️⃣ आपकी जमीन का साइज (Land Size) क्या है? (जैसे: 1500 sq ft, 20x50, 1 बीघा, या 2 कट्ठा):",M=b.ask_ownership_msg||"7️⃣ क्या जमीन आपकी स्वयं की (खुद की) है? (हाँ / नहीं):",D=b.end_no_land_msg||`ठीक है 🙏

कोई बात नहीं। अगर भविष्य में जमीन हो या किसी और को जरूरत हो, तो हमसे जरूर संपर्क करें।

मोबाइल टावर स्थापना – आपकी सेवा में सदैव तत्पर।`,q=b.end_no_terms_msg||`ठीक है 🙏

आपके जवाब के लिए धन्यवाद。

अगर भविष्य में आप इस अवसर का लाभ उठाना चाहें, तो हमसे जरूर संपर्क करें。

मोबाइल टावर स्थापना – आपकी सेवा में हमेशा तत्पर. 😊`,P=b.survey_msg||`मोबाइल टावर स्थापना संबंधी अपडेट

प्रिय महोदय/महोदया,

मोबाइल टावर स्थापना के अवसर में आपकी रुचि के लिए धन्यवाद।

जैसा कि चर्चा हुई थी, हमने आपके विवरण को ऑनलाइन स्थान सर्वेक्षण के लिए हमारी सर्वेक्षण टीम को भेज दिया है। इसके आधार पर, हम पुष्टि करेंगे कि आपके क्षेत्र में टावर स्थापना की आवश्यकता है या नहीं。

📍 यदि आपका स्थान स्वीकृत हो जाता है, तो आपको निम्नलिखित लाभ प्राप्त होंगे:

✅ अग्रिम भुगतान: ₹70,0,000/- (स्थापना से पहले)

✅ मासिक किराया: ₹60,000/-*
   (₹30,000/- सीधे आपके खाते में जमा + ₹30,000/- EMI के रूप में समायोजित)

✅ रोजगार का अवसर:
   टावर रखरखाव अनुबंध के तहत परिवार के एक सदस्य को निश्चित मासिक वेतन पर नौकरी दी जाएगी।

📝 आपके स्थान की स्वीकृति मिलने के बाद, आपको कल सुबह तक WhatsApp पर PDF स्वीकृति रिपोर्ट प्राप्त हो जाएगी SURVEY के बाद।

📌 महत्वपूर्ण नोट:
स्वीकृति मिलने पर, आपको ₹2,550 का एकमुश्त पंजीकरण शुल्क देना होगा, जिससे आपकी भागीदारी और बुकिंग की पुष्टि हो जाएगी

━━━━━━━━━━━━━━━━━━━━━━━━━━

👉 अगर आप इन शर्तों से सहमत हैं और आगे बात करना चाहते हैं, तो कृपया "YES" लिखकर भेजें (सहमत होने के लिए)।

👉 अगर नहीं, तो "NO" लिखकर जवाब दें।

सादर,
Ms. Meena Kumari
ग्राहक संबंध कार्यकारी
📞 9217662196
मोबाइल टावर स्थापना सेवाएं`,v=b.payment_msg||`बहुत अच्छा! 🎉

आपका स्थान हमारी सर्वेक्षण टीम द्वारा जांचा जाएगा。

📋 पंजीकरण की प्रक्रिया:

✅ पंजीकरण शुल्क: ₹2,550/-

यह शुल्क आपकी बुकिंग और भागीदारी की पुष्टि के लिए आवश्यक है。

पंजीकरण शुल्क जमा करने के बाद ही आगे की प्रक्रिया (जैसे NOC और एग्रीमेंट) शुरू होगी। QR कोड / Payment Details आपको जल्द ही भेजी जाएंगी।

कृपया थोड़ा इंतजार करें। 🙏`,{data:C}=await A.from("chatbot_runs").select("*").eq("contact_id",i).maybeSingle(),L=["hi","hello","hey","hlo","namaste","pranam","ram ram","installation","tower","start","apply","sir","ok","help","detail","details","info","information","plz","please","registration","payment","fee","apply now","form","link"].some(e=>g.includes(e));if(L||!C){C&&L?(console.log(`[chatbot] Clearing existing run ${C.id} to restart chatbot for contact: ${i}`),await A.from("chatbot_runs").delete().eq("id",C.id)):console.log(`[chatbot] Starting chatbot for contact: ${i}`);let e=!1!==b.use_web_form,o=!0===b.use_template_welcome,n=b.welcome_template_name||"tower_lead_welcome",s=b.welcome_template_lang||"hi";if(e)if(b.flow_id)await A.from("chatbot_runs").insert({user_id:t,contact_id:i,state:"AWAITING_FLOW_SUBMISSION",collected_data:{}}),await _(p,I,h,w,y,"Apply Now",b.flow_id,"Apply Now");else if(await A.from("chatbot_runs").insert({user_id:t,contact_id:i,state:"AWAITING_FORM_SUBMISSION",collected_data:{}}),o){console.log(`[chatbot] Triggering welcome message via Meta approved template: ${n}`);let e=await (0,a.sendTemplateMessage)({phoneNumberId:I,accessToken:h,to:w,templateName:n,language:s,components:[{type:"button",sub_type:"url",index:0,parameters:[{type:"text",text:i}]}]});await l(p,`[Template Send: ${n}]`,e.messageId)}else{let e=`https://whatsapp-crm-fawn.vercel.app/apply/${i}`;await d(p,I,h,w,y,"Apply Now",e)}else await A.from("chatbot_runs").insert({user_id:t,contact_id:i,state:"AWAITING_LAND_CONFIRMATION",collected_data:{}}),await c(p,I,h,w,y,[{id:"yes_welcome",title:"Apply Now"}]);return!0}if(!C)return!1;let z=C.state,k=C.collected_data||{};if(!["AWAITING_FLOW_SUBMISSION","AWAITING_FORM_SUBMISSION","AWAITING_LAND_CONFIRMATION","AWAITING_NAME","AWAITING_LOCATION","AWAITING_STATE","AWAITING_PINCODE","AWAITING_MOBILE","AWAITING_LAND_SIZE","AWAITING_OWNERSHIP","AWAITING_TERMS_AGREEMENT"].includes(z))return console.log(`[chatbot] Obsolete state "${z}" detected. Deleting chatbot run for contact: ${i}`),await A.from("chatbot_runs").delete().eq("id",C.id),!1;switch(z){case"AWAITING_FLOW_SUBMISSION":try{let e=JSON.parse(u);if(e.name&&e.location&&e.pin_code){let t=(0,o.resolveStateName)(e.state),a=(0,o.resolveOwnershipLabel)(e.ownership),n={name:e.name,location:`${e.location}, ${t}`,state:t,pin_code:e.pin_code,mobile_no:w,land_size:e.land_size,ownership:a};await A.from("chatbot_runs").update({state:"AWAITING_TERMS_AGREEMENT",collected_data:n,updated_at:new Date().toISOString()}).eq("id",C.id),await c(p,I,h,w,P,[{id:"yes_terms",title:"YES"},{id:"no_terms",title:"NO"}])}else await _(p,I,h,w,'नमस्ते, आपका फॉर्म अभी पूरा नहीं हुआ है। कृपया "Apply Now" बटन पर क्लिक करके फॉर्म भरें।',"Apply Now",b.flow_id,"Apply Now")}catch(e){await _(p,I,h,w,'नमस्ते, आपका फॉर्म अभी पूरा नहीं हुआ है। कृपया "Apply Now" बटन पर क्लिक करके फॉर्म भरें।',"Apply Now",b.flow_id,"Apply Now")}return!0;case"AWAITING_FORM_SUBMISSION":{let e=`https://whatsapp-crm-fawn.vercel.app/apply/${i}`;return await d(p,I,h,w,'नमस्ते, आपका आवेदन अभी पूरा नहीं हुआ है। कृपया नीचे दिए गए "Apply Now" बटन पर क्लिक करके अपना फॉर्म पूरा करें।',"Apply Now",e),!0}case"AWAITING_LAND_CONFIRMATION":{let e=["yes","yes.","yes,","interested","हाँ","हाँ।","है","ha","haa","han","y","yes_welcome"].some(e=>g.includes(e)),t=["no","no.","no,","नहीं","नही","nah","n","no_welcome"].some(e=>g.includes(e));return e?(await A.from("chatbot_runs").update({state:"AWAITING_NAME",updated_at:new Date().toISOString()}).eq("id",C.id),await r(p,I,h,w,f)):t?(await A.from("chatbot_runs").delete().eq("id",C.id),await r(p,I,h,w,D)):await c(p,I,h,w,"कृपया YES या NO में जवाब दें।",[{id:"yes_welcome",title:"YES"},{id:"no_welcome",title:"NO"}]),!0}case"AWAITING_NAME":return k.name=S,await A.from("tower_leads").update({name:S}).eq("contact_id",i),await A.from("chatbot_runs").update({state:"AWAITING_LOCATION",collected_data:k,updated_at:new Date().toISOString()}).eq("id",C.id),await m({name:k.name||"Unknown",mobile_no:w,location:"",state:"",pin_code:"",land_size:"",ownership:"",status:"Pending - Name Collected"}).catch(e=>console.error("[chatbot] Google Sheets sync error:",e)),await r(p,I,h,w,O),!0;case"AWAITING_LOCATION":return k.location=S,await A.from("tower_leads").update({location:S}).eq("contact_id",i),await A.from("chatbot_runs").update({state:"AWAITING_STATE",collected_data:k,updated_at:new Date().toISOString()}).eq("id",C.id),await m({name:k.name||"Unknown",mobile_no:w,location:k.location,state:"",pin_code:"",land_size:"",ownership:"",status:"Pending - Location Collected"}).catch(e=>console.error("[chatbot] Google Sheets sync error:",e)),await r(p,I,h,w,T),!0;case"AWAITING_STATE":return k.state=S,await A.from("tower_leads").update({state:S}).eq("contact_id",i),await A.from("chatbot_runs").update({state:"AWAITING_PINCODE",collected_data:k,updated_at:new Date().toISOString()}).eq("id",C.id),await m({name:k.name||"Unknown",mobile_no:w,location:k.location||"",state:k.state,pin_code:"",land_size:"",ownership:"",status:"Pending - State Collected"}).catch(e=>console.error("[chatbot] Google Sheets sync error:",e)),await r(p,I,h,w,E),!0;case"AWAITING_PINCODE":return k.pin_code=S,await A.from("tower_leads").update({pin_code:S}).eq("contact_id",i),await A.from("chatbot_runs").update({state:"AWAITING_MOBILE",collected_data:k,updated_at:new Date().toISOString()}).eq("id",C.id),await m({name:k.name||"Unknown",mobile_no:w,location:k.location||"",state:k.state||"",pin_code:k.pin_code,land_size:"",ownership:"",status:"Pending - Pincode Collected"}).catch(e=>console.error("[chatbot] Google Sheets sync error:",e)),await c(p,I,h,w,G,[{id:"yes_mobile",title:"YES (Same No)"}]),!0;case"AWAITING_MOBILE":return k.mobile_no=["yes","yes.","हाँ","हाँ।","ha","haa","han","y","yes_mobile","yes (same no)"].some(e=>g===e)?w:S,await A.from("tower_leads").update({mobile_no:k.mobile_no}).eq("contact_id",i),await A.from("chatbot_runs").update({state:"AWAITING_LAND_SIZE",collected_data:k,updated_at:new Date().toISOString()}).eq("id",C.id),await m({name:k.name||"Unknown",mobile_no:k.mobile_no,location:k.location||"",state:k.state||"",pin_code:k.pin_code||"",land_size:"",ownership:"",status:"Pending - Mobile Collected"}).catch(e=>console.error("[chatbot] Google Sheets sync error:",e)),await r(p,I,h,w,W),!0;case"AWAITING_LAND_SIZE":return k.land_size=S,await A.from("tower_leads").update({land_size:S}).eq("contact_id",i),await A.from("chatbot_runs").update({state:"AWAITING_OWNERSHIP",collected_data:k,updated_at:new Date().toISOString()}).eq("id",C.id),await m({name:k.name||"Unknown",mobile_no:k.mobile_no||w,location:k.location||"",state:k.state||"",pin_code:k.pin_code||"",land_size:k.land_size,ownership:"",status:"Pending - Land Size Collected"}).catch(e=>console.error("[chatbot] Google Sheets sync error:",e)),await r(p,I,h,w,M),!0;case"AWAITING_OWNERSHIP":return k.is_owned=S,await A.from("tower_leads").update({ownership:S}).eq("contact_id",i),await A.from("chatbot_runs").update({state:"AWAITING_TERMS_AGREEMENT",collected_data:k,updated_at:new Date().toISOString()}).eq("id",C.id),await m({name:k.name||"Unknown",mobile_no:k.mobile_no||w,location:k.location||"",state:k.state||"",pin_code:k.pin_code||"",land_size:k.land_size||"",ownership:k.is_owned,status:"Pending - Ownership Collected"}).catch(e=>console.error("[chatbot] Google Sheets sync error:",e)),await c(p,I,h,w,P,[{id:"yes_terms",title:"YES"},{id:"no_terms",title:"NO"}]),!0;case"AWAITING_TERMS_AGREEMENT":{let e=["yes","yes.","yes,","interested","हाँ","हाँ।","है","ha","haa","han","y","yes_terms"].some(e=>g.includes(e)),a=["no","no.","no,","नहीं","नही","nah","n","no_terms"].some(e=>g.includes(e)),{data:o}=await A.from("tower_leads").select("id").eq("contact_id",i).maybeSingle(),s=o?.id;try{console.log("[chatbot] Scheduling Approval PDF generation for next day.");let e=new Date;e.setDate(e.getDate()+1),e.setUTCHours(3,30,0,0),await A.from("approval_queue").insert({lead_id:s||null,contact_id:i,conversation_id:p,phone_number_id:I,access_token:h,recipient_phone:w,collected_data:k,scheduled_at:e.toISOString(),status:"pending"}),await m({name:k.name||"Unknown",mobile_no:k.mobile_no||w,location:k.location||"Not provided",state:k.state||"",pin_code:k.pin_code||"",land_size:k.land_size||"",ownership:k.is_owned||"",status:"Approval Scheduled"}).catch(e=>console.error("[chatbot] Google Sheets sync error:",e)),await r(p,I,h,w,"आपका आवेदन स्वीकृति के लिए शेड्यूल किया गया है। अगली दिन सुबह 9 बजे से 1 बजे के बीच आपको स्वीकृति PDF भेजी जाएगी।")}catch(e){console.error("[chatbot] Failed to schedule Approval PDF:",e)}if(e)s&&await A.from("tower_leads").update({status:"Interested – Payment Pending",updated_at:new Date().toISOString()}).eq("id",s),await m({name:k.name||"Unknown",mobile_no:k.mobile_no||w,location:k.location||"Not provided",state:k.state||"",pin_code:k.pin_code||"",land_size:k.land_size||"",ownership:k.is_owned||"",status:"Interested – Payment Pending"}).catch(e=>console.error("[chatbot] Google Sheets sync error:",e)),await A.from("chatbot_runs").delete().eq("id",C.id),await r(p,I,h,w,v),(0,n.runAutomationsForTrigger)({userId:t,triggerType:"tower_chatbot_completed",contactId:i,context:{conversation_id:p}}).catch(e=>console.error("Failed to trigger automation:",e));else if(a)s&&await A.from("tower_leads").update({status:"Not Interested",updated_at:new Date().toISOString()}).eq("id",s),await m({name:k.name||"Unknown",mobile_no:k.mobile_no||w,location:k.location||"Not provided",state:k.state||"",pin_code:k.pin_code||"",land_size:k.land_size||"",ownership:k.is_owned||"",status:"Not Interested"}).catch(e=>console.error("[chatbot] Google Sheets sync error:",e)),await A.from("chatbot_runs").delete().eq("id",C.id),await r(p,I,h,w,q);else{let e=`👉 अगर आप इन शर्तों से सहमत हैं और आगे बात करना चाहते हैं, तो कृपया "YES" लिखकर भेजें (सहमत होने के लिए)।

👉 अगर नहीं, तो "NO" लिखकर जवाब दें।`;await c(p,I,h,w,e,[{id:"yes_terms",title:"YES (सहमत)"},{id:"no_terms",title:"NO (असहमत)"}])}return!0}}return!1}e.s(["logBotMessage",0,l,"processChatbot",0,p])}];

//# sourceMappingURL=src_lib_whatsapp_chatbot_ts_0o-u_98._.js.map