import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    const { gateway_url, api_key } = body;

    if (!gateway_url) {
      return NextResponse.json(
        { error: 'Gateway URL is required' },
        { status: 400 }
      );
    }

    // Try to contact the gateway
    // We send a ping/status check. We'll try to fetch the base URL or standard endpoints
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (api_key) {
      headers['X-API-Key'] = api_key;
      headers['Authorization'] = `Bearer ${api_key}`;
    }

    let reachable = false;
    let errorMessage = '';

    try {
      // Create a controller to timeout after 5 seconds
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(gateway_url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      reachable = true;
    } catch (err) {
      // If base URL failed, let's try checking if it's just a network error or method not allowed
      const errorStr = err instanceof Error ? err.message : String(err);
      console.log('Base URL test result:', errorStr);
      
      // If it aborted due to timeout
      if (errorStr.includes('abort') || errorStr.includes('timeout')) {
        errorMessage = 'Connection timed out. Check if your phone is on the same network or if your tunnel is running.';
      } else {
        errorMessage = `Failed to connect: ${errorStr}`;
      }
    }

    // Update status in the database
    const status = reachable ? 'connected' : 'disconnected';
    await supabase
      .from('sms_gateway_config')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);

    if (!reachable) {
      return NextResponse.json({
        success: false,
        status,
        error: errorMessage,
      });
    }

    return NextResponse.json({
      success: true,
      status,
      message: 'Successfully connected to the Android SMS Gateway!',
    });
  } catch (error) {
    console.error('Error in SMS test POST:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
