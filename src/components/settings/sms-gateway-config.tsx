'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Signal, Smartphone, Save, Play, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SmsGatewayConfig() {
  const [gatewayUrl, setGatewayUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [deviceName, setDeviceName] = useState('Android Device');
  const [status, setStatus] = useState('disconnected');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch('/api/settings/sms-gateway');
        if (!res.ok) throw new Error('Failed to load configuration');
        const data = await res.json();
        if (data.config) {
          setGatewayUrl(data.config.gateway_url || '');
          setApiKey(data.config.api_key || '');
          setDeviceName(data.config.device_name || 'Android Device');
          setStatus(data.config.status || 'disconnected');
        }
      } catch (err) {
        console.error(err);
        toast.error('Could not load SMS Gateway configuration');
      } finally {
        setIsLoading(false);
      }
    }
    fetchConfig();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!gatewayUrl) {
      toast.error('Gateway URL is required');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/settings/sms-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gateway_url: gatewayUrl,
          api_key: apiKey,
          device_name: deviceName,
          status,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save configuration');
      }

      toast.success('SMS Gateway configuration saved successfully');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Error: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTest() {
    if (!gatewayUrl) {
      toast.error('Save a Gateway URL before testing');
      return;
    }

    setIsTesting(true);
    try {
      const res = await fetch('/api/settings/sms-gateway/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gateway_url: gatewayUrl,
          api_key: apiKey,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatus('connected');
        toast.success(data.message || 'SMS Gateway connected successfully!');
      } else {
        setStatus('disconnected');
        toast.error(data.error || 'Could not connect to SMS Gateway');
      }
    } catch (err) {
      setStatus('disconnected');
      toast.error('Connection test failed. Verify URL and try again.');
    } finally {
      setIsTesting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 bg-slate-900 border border-slate-800 rounded-lg">
        <Loader2 className="size-6 animate-spin text-primary mr-2" />
        <span className="text-slate-400">Loading SMS Gateway settings...</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <Smartphone className="size-5 text-primary" />
              <h2 className="text-lg font-semibold text-white">Android Gateway Settings</h2>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border",
                  status === 'connected'
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                )}
              >
                {status === 'connected' ? (
                  <>
                    <CheckCircle2 className="size-3" />
                    Connected
                  </>
                ) : (
                  <>
                    <AlertTriangle className="size-3" />
                    Disconnected
                  </>
                )}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="deviceName" className="block text-sm font-medium text-slate-300">
                Device Name
              </label>
              <input
                id="deviceName"
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="My Android Phone"
                className="mt-1 block w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="gatewayUrl" className="block text-sm font-medium text-slate-300">
                Gateway URL
              </label>
              <input
                id="gatewayUrl"
                type="url"
                value={gatewayUrl}
                onChange={(e) => setGatewayUrl(e.target.value)}
                placeholder="e.g., http://192.168.1.5:8080 or https://xyz.ngrok-free.app"
                required
                className="mt-1 block w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
              />
              <p className="mt-1 text-xs text-slate-500">
                Enter your Android Gateway app URL (Local Wi-Fi IP + Port OR public ngrok/tunnel URL).
              </p>
            </div>

            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-slate-300">
                API Key / Auth Token (Optional)
              </label>
              <input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Leave blank if not configured on app"
                className="mt-1 block w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 border-t border-slate-800 pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save Configuration
            </button>

            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting || !gatewayUrl}
              className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-850 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 hover:border-slate-650 focus:outline-none focus:ring-2 focus:ring-slate-700 disabled:opacity-50"
            >
              {isTesting ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              Test Connection
            </button>
          </div>
        </form>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4 h-fit">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Signal className="size-5 text-primary" />
          <h3 className="font-semibold text-white">How does it work?</h3>
        </div>
        <div className="text-sm text-slate-400 space-y-4 leading-relaxed">
          <p>
            An Android SMS Gateway lets you route bulk SMS campaigns through your own smartphone, utilizing your carrier's free or unlimited SMS package.
          </p>
          <div className="space-y-3">
            <div className="flex gap-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-bold text-primary">1</span>
              <span>Install a free SMS gateway app on your Android device (e.g. searching for <b>"SMS Gateway API"</b> on Play Store, or using Termux).</span>
            </div>
            <div className="flex gap-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-bold text-primary">2</span>
              <span>Connect both your computer and phone to the same Wi-Fi network, and check the URL displayed on the app.</span>
            </div>
            <div className="flex gap-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-bold text-primary">3</span>
              <span>Paste that URL here, optionally configure an API key on the app for security, and click save.</span>
            </div>
          </div>
          <div className="bg-slate-950 border border-slate-850 rounded p-3 text-xs text-amber-400/90 flex gap-2">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <span>
              If accessing WaCRM outside your home Wi-Fi network, use a tunnel service (like <b>Ngrok</b> or <b>Localtunnel</b>) to forward the Android app's local port to a public HTTPS URL.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
