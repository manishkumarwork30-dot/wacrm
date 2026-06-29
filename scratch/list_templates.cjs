const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function list() {
  try {
    const { data: templates, error } = await supabase.from('message_templates').select('*')
    if (error) throw error
    console.log('--- Message Templates ---')
    for (const t of templates) {
      console.log(`Name: ${t.name}, Category: ${t.category}, Language: ${t.language}, Status: ${t.status}`)
      if (t.name === '__chatbot_config') {
        console.log('  Config buttons:', JSON.stringify(t.buttons, null, 2))
      }
    }
  } catch (e) {
    console.error(e)
  }
}

list()
