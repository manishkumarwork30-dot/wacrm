import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function supabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * POST /api/active-numbers/jobs/[jobId]/cancel
 * Cancel a running or pending job.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: job, error: jobErr } = await supabase
      .from('number_check_jobs')
      .select('id, status')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single()

    if (jobErr || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.status === 'completed' || job.status === 'cancelled') {
      return NextResponse.json(
        { error: `Job is already ${job.status}` },
        { status: 400 }
      )
    }

    const admin = supabaseAdmin()
    await admin
      .from('number_check_jobs')
      .update({ status: 'cancelled', completed_at: new Date().toISOString() })
      .eq('id', jobId)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST /api/active-numbers/jobs/[jobId]/cancel error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
