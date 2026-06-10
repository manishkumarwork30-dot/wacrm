import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateCongratulationsDoc } from '@/lib/document-generator'
import { sendDocumentMessage } from '@/lib/whatsapp/meta-api'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import { decrypt } from '@/lib/whatsapp/encryption'

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

    const { name, location } = await request.json()

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

    if (!finalName || !finalLocation) {
      return NextResponse.json({ error: 'Name and Location are required to generate PDF' }, { status: 400 })
    }

    // 3. Update the lead if the details were missing/changed
    if (finalName !== lead.name || finalLocation !== lead.location) {
      await supabaseAdmin()
        .from('tower_leads')
        .update({ name: finalName, location: finalLocation })
        .eq('id', leadId)
    }

    // 4. Generate the PDF Document
    const pdfBuffer = await generateCongratulationsDoc(finalName, finalLocation)

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

    // Find conversation to log message into CRM Inbox
    const { data: conversation } = await supabaseAdmin()
      .from('conversations')
      .select('id')
      .eq('contact_id', lead.contacts.id)
      .maybeSingle()

    if (conversation) {
      await supabaseAdmin().from('messages').insert({
        conversation_id: conversation.id,
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
      }).eq('id', conversation.id)
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
