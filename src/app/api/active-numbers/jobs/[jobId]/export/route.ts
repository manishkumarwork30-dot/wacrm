import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/active-numbers/jobs/[jobId]/export
 * Stream all results as a CSV download.
 * Query param: filter — 'all' | 'active' | 'inactive' | 'dnd'
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify job ownership
    const { data: job, error: jobErr } = await supabase
      .from('number_check_jobs')
      .select('id, name')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single()

    if (jobErr || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const url = new URL(request.url)
    const filter = url.searchParams.get('filter') ?? 'all'

    // Fetch all results (no pagination for export)
    let query = supabase
      .from('number_check_results')
      .select('phone, whatsapp_active, dnd_status, checked_at')
      .eq('job_id', jobId)
      .order('phone', { ascending: true })

    if (filter === 'active') {
      query = query.eq('whatsapp_active', true)
    } else if (filter === 'inactive') {
      query = query.eq('whatsapp_active', false)
    } else if (filter === 'dnd') {
      query = query.eq('dnd_status', true)
    }

    const { data: results, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 })
    }

    // Build CSV
    const header = 'Phone,WhatsApp Active,DND,Checked At\n'
    const rows = (results ?? [])
      .map((r) =>
        [
          r.phone,
          r.whatsapp_active === null ? 'Pending' : r.whatsapp_active ? 'Yes' : 'No',
          r.dnd_status === null ? '-' : r.dnd_status ? 'Yes' : 'No',
          r.checked_at ? new Date(r.checked_at).toLocaleString('en-IN') : '-',
        ].join(',')
      )
      .join('\n')

    const csv = header + rows
    const filename = `active-numbers-${job.name.replace(/\s+/g, '-')}-${filter}.csv`

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('GET /api/active-numbers/jobs/[jobId]/export error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
