require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testLogic() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Get any lead
  const { data: lead, error: leadError } = await supabase
    .from('tower_leads')
    .select('*, contacts(id, phone)')
    .limit(1)
    .single();

  if (leadError) {
    console.log("Lead Error:", leadError);
    return;
  }

  console.log("Found lead:", lead.id, lead.name, "user_id:", lead.user_id);

  // Get config
  const { data: config, error: configError } = await supabase
    .from('whatsapp_config')
    .select('phone_number_id, access_token')
    .eq('user_id', lead.user_id)
    .eq('status', 'connected')
    .single();

  if (configError) {
    console.log("Config error:", configError);
    return;
  }
  console.log("Found config!");
  
  // Try calling Meta API with a dummy number to see the error message
  const url = `https://graph.facebook.com/v21.0/${config.phone_number_id}/messages`;
  console.log("Posting to:", url);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.access_token}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: lead.contacts.phone || "1234567890",
      type: 'text',
      text: { body: "Test" }
    }),
  });

  const data = await response.json();
  console.log("Meta API response:", JSON.stringify(data, null, 2));
}

testLogic().catch(console.error);
