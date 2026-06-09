const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const userId = '8782904e-82a9-4dd7-b59b-84f1f97ef2f3'
const phone = '+919315970774'
const name = 'Sandbox Connected No.'

async function run() {
  try {
    // 1. Create or get contact
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('*')
      .eq('phone', phone)
      .eq('user_id', userId)
      .maybeSingle()

    let contact = existingContact
    if (!contact) {
      const { data: newContact, error: contactErr } = await supabase
        .from('contacts')
        .insert({
          user_id: userId,
          phone,
          name,
        })
        .select()
        .single()

      if (contactErr) {
        console.error('Error creating contact:', contactErr)
        return
      }
      contact = newContact
      console.log('Created contact:', contact.id)
    } else {
      console.log('Contact already exists:', contact.id)
    }

    // 2. Create or get conversation
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('contact_id', contact.id)
      .maybeSingle()

    if (!existingConv) {
      const { data: newConv, error: convErr } = await supabase
        .from('conversations')
        .insert({
          user_id: userId,
          contact_id: contact.id,
          status: 'open',
          last_message_text: 'Click here to start chat',
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (convErr) {
        console.error('Error creating conversation:', convErr)
        return
      }
      console.log('Created conversation:', newConv.id)
    } else {
      console.log('Conversation already exists:', existingConv.id)
    }

    console.log('All set! Refresh your inbox page and you will see the contact.')

  } catch (err) {
    console.error('Error:', err)
  }
}

run()
