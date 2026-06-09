const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')
const crypto = require('crypto')

// Load environment variables from the project's .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const encryptionKey = process.env.ENCRYPTION_KEY

console.log('Supabase URL:', supabaseUrl)
console.log('Service Key starts with:', supabaseServiceKey?.substring(0, 10))
console.log('Encryption Key length:', encryptionKey?.length)

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables!')
  process.exit(1)
}

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
  try {
    const { data: configs, error: configErr } = await supabase
      .from('whatsapp_config')
      .select('*')
    
    if (configErr) {
      console.error('Error fetching whatsapp_config:', configErr)
      return
    }

    console.log('Configs count:', configs?.length)
    if (configs && configs.length > 0) {
      for (const config of configs) {
        console.log(`Config ID: ${config.id}, User ID: ${config.user_id}`)
        console.log(`Phone Number ID: ${config.phone_number_id}`)
        console.log(`WABA ID: ${config.waba_id}`)
        console.log(`Status: ${config.status}`)
        try {
          const decryptedToken = decrypt(config.access_token)
          console.log(`Access Token Decrypted successfully! Length: ${decryptedToken.length}`)
          console.log(`Access Token starts with: ${decryptedToken.substring(0, 15)}`)
        } catch (decErr) {
          console.error(`Failed to decrypt access token:`, decErr.message)
        }
      }
    }

    const { data: messages, error: msgErr } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (msgErr) {
      console.error('Error fetching recent messages:', msgErr)
      return
    }

    console.log('Recent messages in DB:', messages)
  } catch (err) {
    console.error('Check failed:', err)
  }
}

check()
