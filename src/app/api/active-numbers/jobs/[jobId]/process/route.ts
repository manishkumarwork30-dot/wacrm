import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { decrypt } from '@/lib/whatsapp/encryption'

const META_API_VERSION = 'v21.0'
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`

/** How many numbers to check per invocation */
const BATCH_SIZE = 50

function supabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Check a batch of phone numbers against Meta WhatsApp Contacts API.
 * Returns a map of phone → { whatsapp_active: boolean }
 */
async function checkWhatsAppNumbers(
  phones: string[],
  validatorProvider: string,
  validatorApiKey: string
): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>()

  if (!validatorApiKey) {
    throw new Error('Validator API key not configured. Go to Settings -> WhatsApp Config to add a 3rd party validator key.')
  }

  if (validatorProvider === 'wassenger') {
    // Wassenger rate limit is typically 600 req/min for paid plans.
    // We check sequentially or in small batches. Here we do it with a small concurrency of 5.
    const concurrency = 5;
    for (let i = 0; i < phones.length; i += concurrency) {
      const chunk = phones.slice(i, i + concurrency);
      await Promise.all(
        chunk.map(async (phone) => {
          try {
            // Ensure phone is just numbers for Wassenger
            const phoneStr = phone.replace(/\D/g, '')
            const res = await fetch(`https://api.wassenger.com/v1/numbers/${phoneStr}/exists`, {
              headers: {
                Token: validatorApiKey,
              },
            })
            if (res.ok) {
              const data = await res.json()
              // Wassenger returns { exists: true/false } or { status: "valid", exists: true }
              result.set(phone, data.exists === true || data.status === 'valid')
            } else {
              result.set(phone, false)
            }
          } catch (e) {
            result.set(phone, false)
          }
        })
      )
    }
  } else {
    throw new Error(`Unsupported validator provider: ${validatorProvider}`)
  }

  return result
}

/**
 * POST /api/active-numbers/jobs/[jobId]/process
 * Process the next batch of unchecked numbers.
 * Can be called repeatedly until job is complete.
 * Returns: { processed: number, remaining: number, status: string }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const admin = supabaseAdmin()

    // 1. Load the job (no auth — this can be called by internal cron)
    const { data: job, error: jobErr } = await admin
      .from('number_check_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (jobErr || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.status === 'cancelled' || job.status === 'completed') {
      return NextResponse.json({ status: job.status, processed: 0, remaining: 0 })
    }

    // 2. Mark job as running
    await admin
      .from('number_check_jobs')
      .update({ status: 'running' })
      .eq('id', jobId)

    // 3. Fetch user's WhatsApp config for API credentials
    const { data: config, error: configErr } = await admin
      .from('whatsapp_config')
      .select('phone_number_id, access_token, validator_provider, validator_api_key')
      .eq('user_id', job.user_id)
      .maybeSingle()

    if (configErr || !config) {
      await admin
        .from('number_check_jobs')
        .update({ status: 'failed', error_message: 'No WhatsApp configuration found' })
        .eq('id', jobId)
      return NextResponse.json(
        { error: 'No WhatsApp configuration found for this user' },
        { status: 400 }
      )
    }

    let validatorApiKey: string | null = null
    try {
      accessToken = decrypt(config.access_token)
      if (config.validator_api_key) {
        validatorApiKey = decrypt(config.validator_api_key)
      }
    } catch {
      await admin
        .from('number_check_jobs')
        .update({ status: 'failed', error_message: 'Token decryption failed' })
        .eq('id', jobId)
      return NextResponse.json({ error: 'Token decryption failed' }, { status: 500 })
    }

    if (!validatorApiKey) {
      await admin
        .from('number_check_jobs')
        .update({ status: 'failed', error_message: 'Validator API key not configured' })
        .eq('id', jobId)
      return NextResponse.json({ error: 'Validator API key not configured' }, { status: 400 })
    }

    // 4. Fetch the next batch of unchecked numbers
    const { data: pending, error: pendingErr } = await admin
      .from('number_check_results')
      .select('id, phone')
      .eq('job_id', jobId)
      .is('checked_at', null)
      .limit(BATCH_SIZE)

    if (pendingErr) {
      return NextResponse.json({ error: 'Failed to fetch pending numbers' }, { status: 500 })
    }

    if (!pending || pending.length === 0) {
      // All done
      const { data: finalJob } = await admin
        .from('number_check_jobs')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', jobId)
        .select()
        .single()
      return NextResponse.json({ status: 'completed', processed: 0, remaining: 0, job: finalJob })
    }

    // 5. Check WhatsApp status via Validator API
    const phones = pending.map((r) => r.phone)
    const waResults = await checkWhatsAppNumbers(
      phones,
      config.validator_provider || 'wassenger',
      validatorApiKey
    )

    // 6. Update each result row
    const now = new Date().toISOString()
    let activeCount = 0
    const updates = pending.map((row) => {
      const isActive = waResults.has(row.phone) ? waResults.get(row.phone)! : false
      if (isActive) activeCount++
      return {
        id: row.id,
        whatsapp_active: waResults.has(row.phone) ? isActive : false,
        checked_at: now,
      }
    })

    // Batch update
    for (const upd of updates) {
      await admin
        .from('number_check_results')
        .update({ whatsapp_active: upd.whatsapp_active, checked_at: upd.checked_at })
        .eq('id', upd.id)
    }

    // 7. Update job aggregate counters
    const { data: updatedJob } = await admin
      .from('number_check_jobs')
      .update({
        checked_count: (job.checked_count ?? 0) + pending.length,
        active_count: (job.active_count ?? 0) + activeCount,
      })
      .eq('id', jobId)
      .select()
      .single()

    const remaining = (job.total_count ?? 0) - ((job.checked_count ?? 0) + pending.length)

    // 8. If more numbers remain, fire next batch (non-blocking)
    if (remaining > 0) {
      const processUrl = new URL(
        `/api/active-numbers/jobs/${jobId}/process`,
        request.url
      )
      fetch(processUrl.toString(), { method: 'POST' }).catch(() => {})
    } else {
      // Mark complete
      await admin
        .from('number_check_jobs')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', jobId)
    }

    return NextResponse.json({
      status: remaining > 0 ? 'running' : 'completed',
      processed: pending.length,
      remaining,
      activeInBatch: activeCount,
      job: updatedJob,
    })
  } catch (err: any) {
    console.error('POST /api/active-numbers/jobs/[jobId]/process error:', err)
    
    // Attempt to mark job as failed
    try {
      const admin = supabaseAdmin()
      const { params: resolvedParams } = await params as any;
      await admin
        .from('number_check_jobs')
        .update({ status: 'failed', error_message: err.message })
        .eq('id', resolvedParams?.jobId || '')
    } catch (e) {}

    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
