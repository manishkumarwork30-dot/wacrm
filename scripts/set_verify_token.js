const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')
const crypto = require('crypto')

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const encryptionKey = process.env.ENCRYPTION_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const GCM_IV_LENGTH = 12

function encrypt(text) {
  const iv = crypto.randomBytes(GCM_IV_LENGTH)
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    Buffer.from(encryptionKey, 'hex'),
    iv
  )
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`
}

async function setToken() {
  const tokenValue = 'wacrm_verify_token_' + crypto.randomBytes(4).toString('hex')
  const encryptedToken = encrypt(tokenValue)

  const { data: configs, error: fetchErr } = await supabase
    .from('whatsapp_config')
    .select('id')
    .limit(1)

  if (fetchErr || !configs || configs.length === 0) {
    console.error('Failed to find whatsapp_config row:', fetchErr)
    return
  }

  const configId = configs[0].id
  const { error: updateErr } = await supabase
    .from('whatsapp_config')
    .update({ verify_token: encryptedToken })
    .eq('id', configId)

  if (updateErr) {
    console.error('Failed to update verify_token:', updateErr)
  } else {
    console.log('Successfully set verify_token in DB!')
    console.log('Plaintext Verify Token:', tokenValue)
  }
}

setToken()
