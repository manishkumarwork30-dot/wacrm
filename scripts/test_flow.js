const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function test() {
  try {
    // 1. Get or create contact
    const { data: contacts, error: contactErr } = await supabase
      .from('contacts')
      .select('*')
      .limit(1)
    
    if (contactErr || !contacts || contacts.length === 0) {
      console.error('No contacts to test with!', contactErr)
      return
    }
    const contact = contacts[0]
    console.log('Testing with contact:', contact.id, 'user_id:', contact.user_id)

    // 2. Create conversation
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .insert({
        user_id: contact.user_id,
        contact_id: contact.id,
        status: 'open',
      })
      .select()
      .single()

    if (convErr) {
      console.error('Error creating conversation:', convErr)
      return
    }
    console.log('Created conversation:', conv.id)

    // 3. Try to insert message into messages table
    const { data: message, error: msgErr } = await supabase
      .from('messages')
      .insert({
        conversation_id: conv.id,
        sender_type: 'agent',
        content_type: 'text',
        content_text: 'Test message from script',
        status: 'sent',
        message_id: 'test-wamid-' + Date.now(),
      })
      .select()
      .single()

    if (msgErr) {
      console.error('Error inserting message:', msgErr)
    } else {
      console.log('Successfully inserted message:', message)
    }

    // Clean up if successful
    if (!msgErr && message) {
      await supabase.from('messages').delete().eq('id', message.id)
      console.log('Cleaned up message')
    }
    await supabase.from('conversations').delete().eq('id', conv.id)
    console.log('Cleaned up conversation')

  } catch (err) {
    console.error('Test run failed:', err)
  }
}

test()
