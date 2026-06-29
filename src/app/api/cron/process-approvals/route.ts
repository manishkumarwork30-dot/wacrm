import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateCongratulationsDoc } from '@/lib/document-generator'
import { sendDocumentMessage, sendTemplateMessage } from '@/lib/whatsapp/meta-api'

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
    console.error('[cron-approvals] Failed to post to Google Sheets:', err)
  }
}

export async function GET(request: Request) {
  // 1. Authorize cron request
  const expected = process.env.AUTOMATION_CRON_SECRET
  if (!expected) {
    return NextResponse.json({ error: 'cron not configured' }, { status: 503 })
  }

  const supplied = request.headers.get('x-cron-secret') ?? ''
  if (supplied !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getSupabaseAdmin()

  try {
    // 2. Validate IST sending window (9:00 AM to 1:00 PM IST)
    const istHours = parseInt(
      new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        hour12: false,
      }),
      10
    )

    if (istHours < 9 || istHours >= 13) {
      console.log('[cron-approvals] Outside approval sending window (9 AM - 1 PM IST). Current IST Hour:', istHours)
      return NextResponse.json({ message: 'Outside window' }, { status: 200 })
    }

    // 3. Query all pending approvals scheduled in the past
    const { data: queueItems, error: queueError } = await db
      .from('approval_queue')
      .select('*, tower_leads!inner(user_id)')
      .eq('status', 'pending')
      .lte('scheduled_at', now.toISOString())

    if (queueError) {
      console.error('[cron-approvals] Failed to fetch queue:', queueError.message)
      return NextResponse.json({ error: queueError.message }, { status: 500 })
    }

    if (!queueItems || queueItems.length === 0) {
      return NextResponse.json({ message: 'No approvals in queue to process.' }, { status: 200 })
    }

    console.log(`[cron-approvals] Processing ${queueItems.length} pending approvals...`)
    let processedCount = 0

    for (const item of queueItems) {
      try {
        const leadUserId = item.tower_leads.user_id
        const collected = item.collected_data || {}
        const finalName = collected.name || 'Applicant'
        const finalLocation = `${collected.district || ''}, ${collected.state || ''}`

        // Fetch custom document template config for owner
        const { data: docTemplate } = await db
          .from('message_templates')
          .select('buttons')
          .eq('user_id', leadUserId)
          .eq('name', '__document_config')
          .maybeSingle()

        const docConfig = docTemplate?.buttons || undefined

        // Fetch chatbot config to get fallback approval template settings
        const { data: chatbotTemplate } = await db
          .from('message_templates')
          .select('buttons')
          .eq('user_id', leadUserId)
          .eq('name', '__chatbot_config')
          .maybeSingle()

        const chatbotConfig = (chatbotTemplate?.buttons as any) || {}

        // Generate approval PDF
        const pdfBytes = await generateCongratulationsDoc({
          name: finalName,
          location: finalLocation,
          mobile_no: collected.phone || item.recipient_phone,
          state: collected.state,
          pin_code: collected.pincode,
          land_size: collected.land_size,
          ownership: collected.ownership,
          date: new Date().toISOString()
        }, docConfig)

        const filename = `approval_${item.lead_id}_${Date.now()}.pdf`

        // Upload PDF to storage documents bucket
        const { data: uploadData, error: uploadError } = await db.storage
          .from('documents')
          .upload(`approvals/${filename}`, Buffer.from(pdfBytes), {
            contentType: 'application/pdf',
            upsert: true
          })

        if (uploadError) {
          throw new Error(`PDF upload failed: ${uploadError.message}`)
        }

        // Get public URL
        const { data: publicUrlData } = db.storage
          .from('documents')
          .getPublicUrl(uploadData.path)

        const publicUrl = publicUrlData.publicUrl
        const captionText = `Congratulations *${finalName}*! 🎉\n\nYour tower installation application for *${finalLocation}* has been officially QUALIFIED.\n\nPlease find your official Approval Letter attached above.`

        let sentMessageId: string
        let logContentText = captionText
        let logContentType = 'document'
        let logMediaUrl: string | null = publicUrl

        try {
          // Send PDF document message on WhatsApp
          const sentPdf = await sendDocumentMessage({
            phoneNumberId: item.phone_number_id,
            accessToken: item.access_token,
            to: item.recipient_phone,
            documentUrl: publicUrl,
            filename: `Approval_Letter_${finalName}.pdf`,
            caption: captionText
          })
          sentMessageId = sentPdf.messageId
        } catch (sendErr: any) {
          const errMsg = sendErr?.message || String(sendErr)
          const isWindowClosed = errMsg.includes('24 hours') || errMsg.includes('window') || errMsg.includes('131047')

          if (isWindowClosed && chatbotConfig.approval_template_name) {
            console.log(`[cron-approvals] 24-hour window closed for ${item.recipient_phone}. Falling back to template: ${chatbotConfig.approval_template_name}`)

            const templateLang = chatbotConfig.approval_template_lang || 'hi'
            let components: any[] = []

            if (chatbotConfig.approval_template_has_doc_header) {
              components.push({
                type: 'header',
                parameters: [
                  {
                    type: 'document',
                    document: {
                      link: publicUrl,
                      filename: `Approval_Letter_${finalName}.pdf`
                    }
                  }
                ]
              })
            }

            const sentTemplate = await sendTemplateMessage({
              phoneNumberId: item.phone_number_id,
              accessToken: item.access_token,
              to: item.recipient_phone,
              templateName: chatbotConfig.approval_template_name,
              language: templateLang,
              components: components.length > 0 ? components : undefined
            })

            sentMessageId = sentTemplate.messageId
            logContentText = `[Template Fallback: ${chatbotConfig.approval_template_name}] Approval Letter`
            logContentType = chatbotConfig.approval_template_has_doc_header ? 'document' : 'text'
            if (!chatbotConfig.approval_template_has_doc_header) {
              logMediaUrl = null
            }
          } else {
            throw sendErr
          }
        }

        // Insert document message log
        if (item.conversation_id) {
          await db.from('messages').insert({
            conversation_id: item.conversation_id,
            sender_type: 'agent',
            content_type: logContentType,
            content_text: logContentText,
            media_url: logMediaUrl,
            message_id: sentMessageId,
            status: 'sent'
          })

          await db.from('conversations').update({
            last_message_text: logContentType === 'document' ? "Sent Approval PDF" : "Sent Approval Template",
            last_message_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }).eq('id', item.conversation_id)
        }

        // Update lead status
        await db.from('tower_leads')
          .update({
            status: 'Approval Sent',
            welcome_doc_sent: true,
            approval_date: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', item.lead_id)

        // Mark queue item as processed
        await db.from('approval_queue')
          .update({
            status: 'processed',
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id)

        // Post status to Google Sheets
        await postToGoogleSheets({
          name: finalName,
          mobile_no: collected.phone || item.recipient_phone,
          location: finalLocation,
          state: collected.state,
          pin_code: collected.pincode,
          land_size: collected.land_size,
          ownership: collected.ownership,
          status: 'Approval Sent'
        })

        processedCount++
      } catch (itemErr: any) {
        console.error(`[cron-approvals] Failed to process queue item ${item.id}:`, itemErr)
        await db.from('approval_queue')
          .update({
            status: 'failed',
            error_message: itemErr.message || String(itemErr),
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id)
      }
    }

    return NextResponse.json({ success: true, processed: processedCount })
  } catch (err: any) {
    console.error('[cron-approvals] Internal error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
