import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface SmsRecipient {
  phone: string;
  body: string;
}

interface BroadcastResult {
  phone: string;
  status: 'sent' | 'failed';
  error?: string;
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
    const { recipients } = body as { recipients: SmsRecipient[] };

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: 'Provide `recipients` as a non-empty array' },
        { status: 400 }
      );
    }

    // 1. Fetch Android SMS Gateway configuration
    const { data: config, error: configError } = await supabase
      .from('sms_gateway_config')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (configError || !config) {
      return NextResponse.json(
        {
          error:
            'Android SMS Gateway not configured. Please set up your SMS integration in Settings first.',
        },
        { status: 400 }
      );
    }

    const { gateway_url, api_key } = config;

    // Determine target URL for sending
    let targetUrl = gateway_url.trim();
    if (!targetUrl.endsWith('/send') && !targetUrl.includes('/send?')) {
      targetUrl = targetUrl.endsWith('/') ? `${targetUrl}send` : `${targetUrl}/send`;
    }

    // 2. Fetch opted_out status of contacts to respect DND
    const phones = recipients.map((r) => r.phone);
    const { data: contactsData } = await supabase
      .from('contacts')
      .select('phone, opted_out')
      .in('phone', phones);

    const optedOutMap = new Map<string, boolean>();
    if (contactsData) {
      for (const c of contactsData) {
        if (c.phone) {
          optedOutMap.set(c.phone, !!c.opted_out);
        }
      }
    }

    const results: BroadcastResult[] = [];
    let sentCount = 0;
    let failedCount = 0;

    // Send SMS headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (api_key) {
      headers['X-API-Key'] = api_key;
      headers['Authorization'] = `Bearer ${api_key}`;
    }

    // Send loop
    for (const recipient of recipients) {
      const isOptedOut = optedOutMap.get(recipient.phone) || false;

      if (isOptedOut) {
        results.push({
          phone: recipient.phone,
          status: 'failed',
          error: 'Contact opted out (DND active)',
        });
        failedCount++;
        continue;
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout per SMS

        // Send to Android SMS gateway app
        // We supply both 'to' and 'number' for wide compatibility with different Gateway apps.
        const response = await fetch(targetUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            to: recipient.phone,
            number: recipient.phone,
            message: recipient.body,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          results.push({
            phone: recipient.phone,
            status: 'sent',
          });
          sentCount++;
        } else {
          const text = await response.text().catch(() => '');
          results.push({
            phone: recipient.phone,
            status: 'failed',
            error: `Gateway returned status ${response.status}: ${text || 'Unknown Error'}`,
          });
          failedCount++;
        }
      } catch (err) {
        const errMessage = err instanceof Error ? err.message : String(err);
        results.push({
          phone: recipient.phone,
          status: 'failed',
          error: `Connection to Gateway failed: ${errMessage}`,
        });
        failedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      total: recipients.length,
      sent: sentCount,
      failed: failedCount,
      results,
    });
  } catch (error) {
    console.error('Error in SMS broadcast POST:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to process SMS broadcast';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
