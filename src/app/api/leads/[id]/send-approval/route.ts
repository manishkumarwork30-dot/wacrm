import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateCongratulationsDoc } from '@/lib/document-generator'
import { sendDocumentMessage } from '@/lib/whatsapp/meta-api'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import { decrypt } from '@/lib/whatsapp/encryption'

// Working hours: 9:00 AM – 9:00 PM IST (UTC+5:30)
const WORK_START_HOUR = 9   // 9 AM IST
const WORK_END_HOUR   = 21  // 9 PM IST (21:00)
const IST_OFFSET_MS   = 5.5 * 60 * 60 * 1000 // +05:30

/**
 * Returns true if the current IST time is within working hours (9 AM – 9 PM).
 * Also returns the next available send time if outside working hours.
 */
function getWorkingHoursStatus(): { isWorkingHours: boolean; nextWindowIST: string } {
  const nowUTC = Date.now()
  const nowIST = new Date(nowUTC + IST_OFFSET_MS)
  const hour   = nowIST.getUTCHours()   // IST hour (0-23)

  if (hour >= WORK_START_HOUR && hour < WORK_END_HOUR) {
    return { isWorkingHours: true, nextWindowIST: '' }
  }

  // Calculate next 9 AM IST
  const nextIST = new Date(nowIST)
  nextIST.setUTCHours(WORK_START_HOUR, 0, 0, 0)
  if (hour >= WORK_END_HOUR) {
    // After 9 PM — push to next calendar day
    nextIST.setUTCDate(nextIST.getUTCDate() + 1)
  }
  // Format as readable IST string
  const formatted = nextIST.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
  return { isWorkingHours: false, nextWindowIST: formatted }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const leadId = resolvedParams.id
    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID required' }, { status: 400 })
    }

    const { name, location, date } = await request.json()

    // 1. Fetch lead and get contact details
    const { data: lead, error: leadError } = await supabaseAdmin()
      .from('tower_leads')
      .select('*, contacts(id, phone)')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const phone = lead.contacts?.phone
    if (!phone) {
      return NextResponse.json({ error: 'Lead has no associated phone number' }, { status: 400 })
    }

    // 2. Determine final name and location
    const finalName = name || lead.name
    const finalLocation = location || lead.location
    const finalDate = date || lead.approval_date || new Date().toISOString()

    if (!finalName || !finalLocation) {
      return NextResponse.json({ error: 'Name and Location are required to generate PDF' }, { status: 400 })
    }

    // ── Working Hours Guard (9 AM – 9 PM IST) ──────────────────────────────
    const { isWorkingHours, nextWindowIST } = getWorkingHoursStatus()
    if (!isWorkingHours) {
      return NextResponse.json(
        {
          success: false,
          outsideWorkingHours: true,
          message: `Approvals are sent between 9 AM and 9 PM IST only. Your approval for ${finalName} will be sent on ${nextWindowIST}.`,
        },
        { status: 202 }
      )
    }
    // ──────────────────────────────────────────────────────────────────────

    // 3. Update the lead if the details were missing/changed
    if (finalName !== lead.name || finalLocation !== lead.location || date !== lead.approval_date) {
      await supabaseAdmin()
        .from('tower_leads')
        .update({ name: finalName, location: finalLocation, approval_date: finalDate })
        .eq('id', leadId)
    }

    // Fetch custom document template config
    const { data: docTemplate } = await supabaseAdmin()
      .from('message_templates')
      .select('buttons')
      .eq('user_id', lead.user_id)
      .eq('name', '__document_config')
      .maybeSingle();

    const docConfig = docTemplate?.buttons || undefined;

    // 4. Generate the PDF Document
    const pdfBuffer = await generateCongratulationsDoc({
      name: finalName,
      location: finalLocation,
      mobile_no: phone,
      state: lead.state,
      pin_code: lead.pin_code,
      land_size: lead.land_size,
      ownership: lead.ownership,
      date: finalDate
    }, docConfig);

    // 5. Upload to Supabase Storage
    const fileName = `approval_${leadId}_${Date.now()}.pdf`
    const { error: uploadError } = await supabaseAdmin()
      .storage
      .from('documents')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      })

    if (uploadError) {
      console.error('Failed to upload PDF:', uploadError)
      return NextResponse.json({ error: 'Failed to upload PDF' }, { status: 500 })
    }

    // 6. Get public URL
    const { data: { publicUrl } } = supabaseAdmin()
      .storage
      .from('documents')
      .getPublicUrl(fileName)

    // 7. Get WhatsApp config for sending
    const { data: config, error: configError } = await supabaseAdmin()
      .from('whatsapp_config')
      .select('phone_number_id, access_token')
      .eq('user_id', lead.user_id)
      .eq('status', 'connected')
      .single()

    if (configError || !config) {
      return NextResponse.json({ error: 'WhatsApp config not found' }, { status: 400 })
    }

    // 8. Send WhatsApp Message
    const captionText = `Congratulations *${finalName}*! 🎉\n\nYour tower installation application for *${finalLocation}* has been officially QUALIFIED.\n\nPlease find your official Approval Letter attached above.`
    const sentPdf = await sendDocumentMessage({
      phoneNumberId: config.phone_number_id,
      accessToken: decrypt(config.access_token),
      to: phone,
      documentUrl: publicUrl,
      filename: fileName,
      caption: captionText
    })

    // Find or create conversation to log message into CRM Inbox
    let conversationId = null
    const { data: conversation } = await supabaseAdmin()
      .from('conversations')
      .select('id')
      .eq('contact_id', lead.contacts.id)
      .maybeSingle()

    if (conversation) {
      conversationId = conversation.id
    } else {
      const { data: newConv, error: createError } = await supabaseAdmin()
        .from('conversations')
        .insert({
          user_id: lead.user_id,
          contact_id: lead.contacts.id,
        })
        .select('id')
        .single()
      if (!createError && newConv) {
        conversationId = newConv.id
      }
    }

    if (conversationId) {
      await supabaseAdmin().from('messages').insert({
        conversation_id: conversationId,
        sender_type: 'agent',
        content_type: 'document',
        content_text: captionText,
        media_url: publicUrl,
        message_id: sentPdf.messageId,
        status: 'sent',
      })
      await supabaseAdmin().from('conversations').update({
        last_message_text: "Sent Approval PDF",
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', conversationId)
    }

    // 9. Update lead status to "Approval Sent"
    await supabaseAdmin()
      .from('tower_leads')
      .update({ status: 'Approval Sent' })
      .eq('id', leadId)

    return NextResponse.json({ success: true, url: publicUrl })
  } catch (error: any) {
    console.error('Error in send-approval endpoint:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
