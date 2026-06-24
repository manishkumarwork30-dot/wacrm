import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/active-numbers/jobs
 * Create a new number check job.
 * Body: { name: string, numbers: string[], country_code?: string }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, numbers, country_code = '+91' } = body

    if (!name || !Array.isArray(numbers) || numbers.length === 0) {
      return NextResponse.json(
        { error: 'name and numbers array are required' },
        { status: 400 }
      )
    }

    if (numbers.length > 1_000_000) {
      return NextResponse.json(
        { error: 'Maximum 10 lakh (1,000,000) numbers per job' },
        { status: 400 }
      )
    }

    // Normalise numbers — strip spaces, ensure leading + with country code
    const normalised = numbers
      .map((n: string) => {
        const cleaned = String(n).replace(/[\s\-().]/g, '')
        if (cleaned.startsWith('+')) return cleaned
        if (cleaned.startsWith('0')) return `${country_code}${cleaned.slice(1)}`
        if (cleaned.length === 10) return `${country_code}${cleaned}`
        return cleaned
      })
      .filter((n) => n.length >= 10)

    if (normalised.length === 0) {
      return NextResponse.json(
        { error: 'No valid phone numbers found after normalisation' },
        { status: 400 }
      )
    }

    // Create the job row
    const { data: job, error: jobError } = await supabase
      .from('number_check_jobs')
      .insert({
        user_id: user.id,
        name: name.trim(),
        status: 'pending',
        total_count: normalised.length,
        checked_count: 0,
        active_count: 0,
        dnd_count: 0,
      })
      .select()
      .single()

    if (jobError || !job) {
      console.error('Failed to create job:', jobError)
      return NextResponse.json(
        { error: `Failed to create job: ${jobError?.message ?? 'unknown error'}. Have you run the SQL migration (supabase/migrations/active_numbers.sql) in Supabase?` },
        { status: 500 }
      )
    }

    // Batch-insert number rows (1000 at a time to avoid payload limits)
    const BATCH = 1000
    for (let i = 0; i < normalised.length; i += BATCH) {
      const slice = normalised.slice(i, i + BATCH).map((phone: string) => ({
        job_id: job.id,
        phone,
        whatsapp_active: null,
        dnd_status: null,
      }))
      const { error: insertErr } = await supabase
        .from('number_check_results')
        .insert(slice)
      if (insertErr) {
        console.error('Failed to insert numbers batch:', insertErr)
        // Rollback job
        await supabase.from('number_check_jobs').delete().eq('id', job.id)
        return NextResponse.json(
          { error: `Failed to save numbers: ${insertErr.message}` },
          { status: 500 }
        )
      }
    }

    // Kick off first processing batch asynchronously (fire & forget)
    const processUrl = new URL(
      `/api/active-numbers/jobs/${job.id}/process`,
      request.url
    )
    fetch(processUrl.toString(), { method: 'POST' }).catch(() => {
      // Non-blocking — processor will also be triggered by polling
    })

    return NextResponse.json({ success: true, job })
  } catch (err) {
    console.error('POST /api/active-numbers/jobs error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/active-numbers/jobs
 * List all jobs for the authenticated user.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: jobs, error } = await supabase
      .from('number_check_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
    }

    return NextResponse.json({ jobs: jobs ?? [] })
  } catch (err) {
    console.error('GET /api/active-numbers/jobs error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
