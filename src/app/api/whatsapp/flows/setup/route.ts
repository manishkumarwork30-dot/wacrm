import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { decrypt } from '@/lib/whatsapp/encryption'
import { getTowerApplicationFlowJSON } from '@/lib/whatsapp/tower-flow-json'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const META_API_VERSION = 'v21.0'
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 })
    }

    const db = getSupabaseAdmin()

    // 1. Fetch config for WABA_ID and token
    const { data: config, error: configError } = await db
      .from('whatsapp_config')
      .select('waba_id, access_token')
      .eq('user_id', userId)
      .maybeSingle()

    if (configError || !config) {
      return NextResponse.json({ error: 'Config not found for user' }, { status: 404 })
    }

    if (!config.waba_id) {
      return NextResponse.json({ error: 'WhatsApp Business Account ID (waba_id) is missing in config' }, { status: 400 })
    }

    const accessToken = decrypt(config.access_token)
    const wabaId = config.waba_id

    // 2. Create the Flow
    console.log('[flows-setup] Creating flow for WABA:', wabaId)
    const createRes = await fetch(`${META_API_BASE}/${wabaId}/flows`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'tower_application_' + Date.now(), // unique name
        categories: ['LEAD_GENERATION']
      })
    })

    if (!createRes.ok) {
      const err = await createRes.json()
      console.error('[flows-setup] Create failed:', err)
      return NextResponse.json({ error: 'Failed to create flow', details: err }, { status: 500 })
    }

    const createData = await createRes.json()
    const flowId = createData.id
    console.log('[flows-setup] Flow created with ID:', flowId)

    // 3. Upload Flow JSON
    console.log('[flows-setup] Uploading flow JSON...')
    const flowJson = getTowerApplicationFlowJSON()
    
    const formData = new FormData()
    formData.append('file', new Blob([JSON.stringify(flowJson)], { type: 'application/json' }), 'flow.json')
    formData.append('name', 'flow.json')
    formData.append('asset_type', 'FLOW_JSON')

    const uploadRes = await fetch(`${META_API_BASE}/${flowId}/assets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: formData
    })

    if (!uploadRes.ok) {
      const err = await uploadRes.json()
      console.error('[flows-setup] Upload failed:', err)
      return NextResponse.json({ error: 'Failed to upload flow JSON', details: err }, { status: 500 })
    }

    // 4. Publish the Flow
    console.log('[flows-setup] Publishing flow...')
    const publishRes = await fetch(`${META_API_BASE}/${flowId}/publish`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    })

    if (!publishRes.ok) {
      const err = await publishRes.json()
      console.error('[flows-setup] Publish failed:', err)
      return NextResponse.json({ error: 'Failed to publish flow', details: err }, { status: 500 })
    }

    console.log('[flows-setup] Flow published successfully!')

    // Optional: save this flow ID to the message_templates or config table
    // For now, we return it to the client so they can configure the chatbot with it.

    return NextResponse.json({ 
      success: true, 
      flow_id: flowId,
      message: 'Flow created and published successfully!' 
    })

  } catch (error: any) {
    console.error('[flows-setup] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
