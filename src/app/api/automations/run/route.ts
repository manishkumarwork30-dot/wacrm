import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runSpecificAutomation } from '@/lib/automations/engine';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body?.automation_id || !body?.contact_id) {
      return NextResponse.json(
        { error: 'automation_id and contact_id are required' },
        { status: 400 }
      );
    }

    const { automation_id, contact_id } = body;

    // Execute the automation manually for the contact
    await runSpecificAutomation(automation_id, user.id, contact_id);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[automations-run] Internal error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
