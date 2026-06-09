'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface WhatsAppStatus {
  connected: boolean;
  phoneNumber?: string;
  verifiedName?: string;
  loading: boolean;
}

/**
 * Reads WhatsApp config directly from Supabase (no Meta ping — instant).
 * Shows a "connected" badge if the config row exists and status = 'connected'.
 */
export function useWhatsAppStatus(): WhatsAppStatus {
  const [status, setStatus] = useState<WhatsAppStatus>({
    connected: false,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          if (!cancelled) setStatus({ connected: false, loading: false });
          return;
        }

        // Use select(*) so we get all columns including display_phone_number
        // if it exists (gracefully ignores it if column not yet migrated)
        const { data } = await supabase
          .from('whatsapp_config')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (!cancelled) {
          if (data) {
            setStatus({
              connected: data.status === 'connected',
              // Try display_phone_number first (human-readable like +91 98765 43210)
              // Fall back to phone_number_id (Meta numeric ID)
              phoneNumber:
                (data.display_phone_number as string | undefined) ??
                (data.phone_number_id as string | undefined),
              loading: false,
            });
          } else {
            setStatus({ connected: false, loading: false });
          }
        }
      } catch {
        if (!cancelled) setStatus({ connected: false, loading: false });
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}
