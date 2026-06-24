import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as xlsx from 'xlsx'

/**
 * GET /api/active-numbers/jobs/[jobId]/export
 * Stream all results as an Excel download.
 * Query param: filter — 'all' | 'active' | 'inactive'
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
      .select('phone, whatsapp_active, checked_at')
      .eq('job_id', jobId)
      .order('phone', { ascending: true })

    if (filter === 'active') {
      query = query.eq('whatsapp_active', true)
    } else if (filter === 'inactive') {
      query = query.eq('whatsapp_active', false)
    }

    const { data: results, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 })
    }

    // Build Excel Data
    const excelData = (results ?? []).map((r) => ({
      'Phone Number': r.phone,
      'WhatsApp Active': r.whatsapp_active === null ? 'Pending' : r.whatsapp_active ? 'Yes' : 'No',
      'Checked At': r.checked_at ? new Date(r.checked_at).toLocaleString('en-IN') : 'Pending',
    }))

    // Generate Excel file buffer
    const worksheet = xlsx.utils.json_to_sheet(excelData)
    const workbook = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Results')
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 18 }, // Phone Number
      { wch: 18 }, // WhatsApp Active
      { wch: 25 }, // Checked At
    ]

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    const filename = `active-numbers-${job.name.replace(/\s+/g, '-')}-${filter}.xlsx`

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('GET /api/active-numbers/jobs/[jobId]/export error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
