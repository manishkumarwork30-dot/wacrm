import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: config, error: configError } = await supabase
      .from('sms_gateway_config')
      .select('gateway_url, api_key, device_name, status')
      .eq('user_id', user.id)
      .maybeSingle();

    if (configError) {
      console.error('Error fetching sms_gateway_config:', configError);
      return NextResponse.json(
        { error: 'Failed to fetch configuration' },
        { status: 500 }
      );
    }

    return NextResponse.json({ config: config || null });
  } catch (error) {
    console.error('Error in SMS config GET:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { gateway_url, api_key, device_name, status } = body;

    if (!gateway_url) {
      return NextResponse.json(
        { error: 'Gateway URL is required' },
        { status: 400 }
      );
    }

    const { data: config, error: saveError } = await supabase
      .from('sms_gateway_config')
      .upsert({
        user_id: user.id,
        gateway_url,
        api_key: api_key || null,
        device_name: device_name || 'Android Device',
        status: status || 'disconnected',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving sms_gateway_config:', saveError);
      return NextResponse.json(
        { error: 'Failed to save configuration' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Error in SMS config POST:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error: deleteError } = await supabase
      .from('sms_gateway_config')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting sms_gateway_config:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete configuration' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in SMS config DELETE:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
