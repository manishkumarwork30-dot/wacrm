const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function check() {
  const { data: contacts, error: contactErr } = await supabase
    .from('contacts')
    .select('*')
  
  if (contactErr) {
    console.error('Error fetching contacts:', contactErr)
    return
  }
  console.log('Contacts:', contacts)

  const { data: conversations, error: convErr } = await supabase
    .from('conversations')
    .select('*, contact:contacts(*)')
  
  if (convErr) {
    console.error('Error fetching conversations:', convErr)
    return
  }
  console.log('Conversations:', conversations)
}

check()
