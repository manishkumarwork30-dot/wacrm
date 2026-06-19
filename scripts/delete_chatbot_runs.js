const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function cleanup() {
  try {
    const { data: deleted, error } = await supabase
      .from('chatbot_runs')
      .delete()
      .not('state', 'in', '("AWAITING_LAND_CONFIRMATION","AWAITING_NAME","AWAITING_STATE","AWAITING_PINCODE")')
      .select('*');
      
    if (error) {
      console.error('Error deleting obsolete runs:', error);
    } else {
      console.log('Successfully deleted obsolete runs:', deleted);
    }
  } catch (e) {
    console.error(e);
  }
}

cleanup();
