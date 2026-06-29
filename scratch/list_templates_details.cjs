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
    for (const t of templates) {
      if (t.name === '__chatbot_config' || t.name === '__document_config') continue
      console.log(`=============================`)
      console.log(`Name: ${t.name}`)
      console.log(`Category: ${t.category}`)
      console.log(`Language: ${t.language}`)
      console.log(`Status: ${t.status}`)
      console.log(`Body: ${t.body_text}`)
      console.log(`Buttons:`, JSON.stringify(t.buttons, null, 2))
    }
  } catch (e) {
    console.error(e)
  }
}

list()
