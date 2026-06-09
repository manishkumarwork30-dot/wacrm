const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')
const crypto = require('crypto')

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const encryptionKey = process.env.ENCRYPTION_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

function decrypt(encryptedText) {
  const parts = encryptedText.split(':')
  if (parts.length === 3) {
    const [ivHex, ctHex, tagHex] = parts
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(tagHex, 'hex')
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(encryptionKey, 'hex'),
      iv
    )
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(ctHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }
  if (parts.length === 2) {
    const [ivHex, ctHex] = parts
    const iv = Buffer.from(ivHex, 'hex')
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(encryptionKey, 'hex'),
      iv
    )
    let decrypted = decipher.update(ctHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }
  throw new Error('Unrecognized format')
}

async function check() {
  const { data: configs } = await supabase.from('whatsapp_config').select('*')
  if (configs && configs.length > 0) {
    for (const c of configs) {
      console.log('Phone Number ID:', c.phone_number_id)
      console.log('Verify Token:', c.verify_token ? decrypt(c.verify_token) : 'Not set')
    }
  } else {
    console.log('No configurations found!')
  }
}

check()
