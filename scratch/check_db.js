const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Parse .env.local manually
const envLocalPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envLocalPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
  if (match) {
    const key = match[1].trim();
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  console.log("Checking DB status...");
  
  // Check whatsapp_config
  const { data: configs, error: configErr } = await supabase
    .from('whatsapp_config')
    .select('*');
  
  if (configErr) {
    console.error("Error fetching configs:", configErr);
  } else {
    console.log("whatsapp_config rows:", configs.length);
    configs.forEach(c => {
      console.log(`- ID: ${c.id}, Phone ID: ${c.phone_number_id}, User ID: ${c.user_id}, Status: ${c.status}`);
    });
  }

  // Check conversations
  const { data: convs, error: convsErr } = await supabase
    .from('conversations')
    .select('*, contacts(name, phone)')
    .order('last_message_at', { ascending: false })
    .limit(5);

  if (convsErr) {
    console.error("Error fetching conversations:", convsErr);
  } else {
    console.log("\nRecent conversations:", convs.length);
    convs.forEach(c => {
      console.log(`- Conv ID: ${c.id}, Contact: ${c.contacts?.name} (${c.contacts?.phone}), Last Msg At: ${c.last_message_at}, Unread: ${c.unread_count}`);
    });
  }

  // Check messages
  const { data: msgs, error: msgsErr } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (msgsErr) {
    console.error("Error fetching messages:", msgsErr);
  } else {
    console.log("\nRecent messages:", msgs.length);
    msgs.forEach(m => {
      console.log(`- Msg ID: ${m.id}, Conv ID: ${m.conversation_id}, Sender: ${m.sender_type}, Type: ${m.content_type}, Text: ${m.content_text}, Status: ${m.status}, Created At: ${m.created_at}`);
    });
  }
}

check();
