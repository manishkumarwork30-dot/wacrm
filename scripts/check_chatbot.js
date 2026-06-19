const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function check() {
  try {
    const { data: runs, error: runErr } = await supabase.from('chatbot_runs').select('*')
    console.log('--- Chatbot Runs ---', runs)

    const { data: leads, error: leadErr } = await supabase.from('tower_leads').select('*').order('created_at', { ascending: false }).limit(5)
    console.log('--- Tower Leads ---', leads)

    const { data: logs, error: logErr } = await supabase.from('automation_logs').select('*').order('created_at', { ascending: false }).limit(5)
    console.log('--- Automation Logs ---', logs)
  } catch (e) {
    console.error(e)
  }
}

check()
