import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { decrypt } from '@/lib/whatsapp/encryption'
import { sendTextMessage } from '@/lib/whatsapp/meta-api'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function postToGoogleSheets(leadData: any) {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL
  if (!webhookUrl) return

  try {
    const formattedData = {
      name: leadData.name || '',
      mobile_no: leadData.mobile_no || '',
      location: leadData.location || '',
      state: leadData.state || '',
      pin_code: leadData.pin_code || '',
      land_size: leadData.land_size || '',
      ownership: leadData.ownership || '',
      status: leadData.status || 'Pending',
      date: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    }

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formattedData)
    })
  } catch (err) {
    console.error('[apply-api] Failed to post to Google Sheets:', err)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { contactId, name, phone, state, district, pincode, landSize, ownership } = body

    if (!contactId || !name || !phone || !state || !district || !pincode || !landSize) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const db = getSupabaseAdmin()

    // 1. Fetch contact to get user_id and verify existence
    const { data: contact, error: contactError } = await db
      .from('contacts')
      .select('user_id, phone')
      .eq('id', contactId)
      .maybeSingle()

    if (contactError || !contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    const userId = contact.user_id

    // 2. Fetch whatsapp_config for Meta credentials
    const { data: config, error: configError } = await db
      .from('whatsapp_config')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (configError || !config) {
      return NextResponse.json({ error: 'WhatsApp config not found' }, { status: 400 })
    }

    const decryptedAccessToken = decrypt(config.access_token)
    const phoneNumberId = config.phone_number_id

    // 3. Upsert/Update the tower_leads table
    const { data: existingLead } = await db
      .from('tower_leads')
      .select('id')
      .eq('contact_id', contactId)
      .maybeSingle()

    const locationString = `${district}, ${state}`
    let leadId = existingLead?.id

    if (!existingLead) {
      const { data: newLead, error: insertError } = await db
        .from('tower_leads')
        .insert({
          user_id: userId,
          contact_id: contactId,
          name,
          mobile_no: phone,
          location: locationString,
          state,
          pin_code: pincode,
          land_size: landSize,
          ownership,
          status: 'Interested – Payment Pending',
          welcome_doc_sent: false
        })
        .select('id')
        .single()

      if (insertError) {
        throw new Error(`Failed to insert lead: ${insertError.message}`)
      }
      leadId = newLead.id
    } else {
      const { error: updateError } = await db
        .from('tower_leads')
        .update({
          name,
          mobile_no: phone,
          location: locationString,
          state,
          pin_code: pincode,
          land_size: landSize,
          ownership,
          status: 'Interested – Payment Pending',
          welcome_doc_sent: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLead.id)

      if (updateError) {
        throw new Error(`Failed to update lead: ${updateError.message}`)
      }
    }

    // 4. Calculate Scheduled Time: Next Day at 9:00 AM IST
    // 9:00 AM IST is 3:30 AM UTC
    const scheduledAt = new Date()
    scheduledAt.setDate(scheduledAt.getDate() + 1)
    scheduledAt.setUTCHours(3, 30, 0, 0)

    // Fetch conversation id
    const { data: conv } = await db
      .from('conversations')
      .select('id')
      .eq('user_id', userId)
      .eq('contact_id', contactId)
      .maybeSingle()

    const conversationId = conv?.id || null

    // 5. Insert into approval_queue
    const { error: queueError } = await db
      .from('approval_queue')
      .insert({
        lead_id: leadId,
        contact_id: contactId,
        conversation_id: conversationId,
        phone_number_id: phoneNumberId,
        access_token: decryptedAccessToken,
        recipient_phone: contact.phone,
        collected_data: {
          name,
          phone,
          state,
          district,
          pincode,
          land_size: landSize,
          ownership
        },
        scheduled_at: scheduledAt.toISOString(),
        status: 'pending'
      })

    if (queueError) {
      console.error('[apply-api] Failed to schedule approval:', queueError.message)
    }

    // 6. Delete active chatbot runs for this contact
    await db
      .from('chatbot_runs')
      .delete()
      .eq('contact_id', contactId)

    // 7. Send confirmation WhatsApp message
    const confirmationText = `नमस्ते *${name}*! 😊\n\nआपका आवेदन फॉर्म सफलतापूर्वक जमा हो गया है।\n\nकल सुबह *9:00 AM से 1:00 PM* के बीच आपको WhatsApp पर आपकी स्वीकृति रिपोर्ट (Approval Letter PDF) मिल जाएगी।\n\nधन्यवाद।`
    
    try {
      const sent = await sendTextMessage({
        phoneNumberId,
        accessToken: decryptedAccessToken,
        to: contact.phone,
        text: confirmationText
      })

      // Log outbound message in database
      if (conversationId) {
        await db.from('messages').insert({
          conversation_id: conversationId,
          sender_type: 'agent',
          content_type: 'text',
          content_text: confirmationText,
          message_id: sent.messageId,
          status: 'sent'
        })

        await db.from('conversations').update({
          last_message_text: confirmationText,
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }).eq('id', conversationId)
      }
    } catch (msgErr) {
      console.error('[apply-api] Failed to send WhatsApp confirmation:', msgErr)
    }

    // 8. Post details to Google Sheets
    await postToGoogleSheets({
      name,
      mobile_no: phone,
      location: locationString,
      state,
      pin_code: pincode,
      land_size: landSize,
      ownership,
      status: 'Interested – Payment Pending'
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[apply-api] Error processing application:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
