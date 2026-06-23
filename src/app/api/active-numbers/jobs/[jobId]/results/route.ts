import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PAGE_SIZE = 100

/**
 * GET /api/active-numbers/jobs/[jobId]/results
 * Query params:
 *   page    — 0-indexed (default 0)
 *   filter  — 'all' | 'active' | 'inactive' | 'dnd' (default 'all')
 *   search  — partial phone match
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

    // Verify the job belongs to the user
    const { data: job, error: jobErr } = await supabase
      .from('number_check_jobs')
      .select('id')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single()

    if (jobErr || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') ?? '0', 10)
    const filter = url.searchParams.get('filter') ?? 'all'
    const search = url.searchParams.get('search') ?? ''

    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    let query = supabase
      .from('number_check_results')
      .select('*', { count: 'exact' })
      .eq('job_id', jobId)
      .order('id', { ascending: true })
      .range(from, to)

    if (filter === 'active') {
      query = query.eq('whatsapp_active', true)
    } else if (filter === 'inactive') {
      query = query.eq('whatsapp_active', false)
    } else if (filter === 'dnd') {
      query = query.eq('dnd_status', true)
    }

    if (search.trim()) {
      query = query.ilike('phone', `%${search.trim()}%`)
    }

    const { data, count, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 })
    }

    return NextResponse.json({
      results: data ?? [],
      total: count ?? 0,
      page,
      pageSize: PAGE_SIZE,
    })
  } catch (err) {
    console.error('GET /api/active-numbers/jobs/[jobId]/results error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
