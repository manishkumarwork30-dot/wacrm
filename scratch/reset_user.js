const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

async function run() {
  const targetPhone = '918796443057';
  console.log(`Searching for contact with phone: ${targetPhone}...`);
  
  const { data: contacts, error: contactErr } = await supabase
    .from('contacts')
    .select('id, name')
    .eq('phone', targetPhone);
    
  if (contactErr || !contacts || contacts.length === 0) {
    console.error('Contact not found or error:', contactErr);
    return;
  }

  const contactId = contacts[0].id;
  console.log(`Found Contact: ${contacts[0].name} (${contactId})`);

  console.log('Deleting chatbot runs...');
  const { data: deletedRuns, error: runErr } = await supabase
    .from('chatbot_runs')
    .delete()
    .eq('contact_id', contactId);
  if (runErr) console.error('Error deleting runs:', runErr);
  else console.log('Deleted chatbot runs successfully.');

  console.log('Deleting tower leads...');
  const { data: deletedLeads, error: leadErr } = await supabase
    .from('tower_leads')
    .delete()
    .eq('contact_id', contactId);
  if (leadErr) console.error('Error deleting leads:', leadErr);
  else console.log('Deleted tower leads successfully.');

  console.log('Done reset!');
}

run();
