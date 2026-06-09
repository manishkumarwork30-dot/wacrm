'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MessageTemplate } from '@/types';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, ArrowRight, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

const categoryColors: Record<string, string> = {
  Marketing: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Utility: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Authentication: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

const statusColors: Record<string, string> = {
  Approved: 'text-green-400',
  Pending: 'text-yellow-400',
  Rejected: 'text-red-400',
  Draft: 'text-slate-400',
};

interface Step1Props {
  selectedTemplate: MessageTemplate | null;
  onSelect: (template: MessageTemplate) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step1ChooseTemplate({ selectedTemplate, onSelect, onNext, onBack }: Step1Props) {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchTemplates() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('message_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setTemplates(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSyncFromMeta() {
    setSyncing(true);
    try {
      const res = await fetch('/api/whatsapp/templates/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Sync failed (HTTP ${res.status})`);
      toast.success(
        `Synced ${data.total} template${data.total === 1 ? '' : 's'} from Meta` +
          (data.inserted || data.updated ? ` (${data.inserted} new, ${data.updated} updated)` : ''),
      );
      await fetchTemplates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to sync templates');
    } finally {
      setSyncing(false);
    }
  }

  // Sort: Approved first, then others
  const approved = templates.filter((t) => t.status === 'Approved');
  const others = templates.filter((t) => t.status !== 'Approved');

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Choose a Template</h2>
          <p className="mt-1 text-sm text-slate-400">
            Select a Meta-approved message template for your broadcast.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSyncFromMeta}
          disabled={syncing}
          className="shrink-0 border-slate-700 text-slate-300 hover:bg-slate-800"
          title="Pull approved templates from your Meta WhatsApp Business Account"
        >
          <RefreshCw className={`size-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing…' : 'Sync from Meta'}
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 text-center px-4">
          <FileText className="h-8 w-8 text-slate-600" />
          <div>
            <p className="text-sm text-slate-400">No templates found.</p>
            <p className="mt-1 text-xs text-slate-500">
              Click <strong className="text-slate-300">Sync from Meta</strong> to pull your approved templates,
              or{' '}
              <Link href="/settings?tab=templates" className="text-primary underline">
                create one in Settings
              </Link>
              .
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Approved templates */}
          {approved.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-green-400" />
                <p className="text-xs font-semibold uppercase tracking-wider text-green-400">
                  Approved — Ready to Send ({approved.length})
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {approved.map((template) => {
                  const isSelected = selectedTemplate?.id === template.id;
                  const catColor = categoryColors[template.category] ?? categoryColors.Utility;
                  return (
                    <button
                      key={template.id}
                      onClick={() => onSelect(template)}
                      className={`flex flex-col gap-3 rounded-xl border p-4 text-left transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                          : 'border-green-900/40 bg-slate-900/50 hover:border-green-700/50 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-medium text-white">{template.name}</h3>
                        <span
                          className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${catColor}`}
                        >
                          {template.category}
                        </span>
                      </div>
                      <p className="line-clamp-3 text-xs text-slate-400">{template.body_text}</p>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="text-slate-500">{template.language ?? 'en_US'}</span>
                        <span className="text-green-400 font-medium">✓ Approved</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Other templates (pending/rejected/draft) */}
          {others.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-3.5 text-slate-500" />
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Other Templates ({others.length})
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 opacity-60">
                {others.map((template) => {
                  const isSelected = selectedTemplate?.id === template.id;
                  const catColor = categoryColors[template.category] ?? categoryColors.Utility;
                  const statusColor = statusColors[template.status ?? 'Draft'];
                  return (
                    <button
                      key={template.id}
                      onClick={() => onSelect(template)}
                      className={`flex flex-col gap-3 rounded-xl border p-4 text-left transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                          : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-medium text-white">{template.name}</h3>
                        <span
                          className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${catColor}`}
                        >
                          {template.category}
                        </span>
                      </div>
                      <p className="line-clamp-3 text-xs text-slate-400">{template.body_text}</p>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="text-slate-500">{template.language ?? 'en_US'}</span>
                        <span className={statusColor}>{template.status ?? 'Draft'}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-slate-800 pt-4">
        <Button variant="outline" onClick={onBack} className="border-slate-700 text-slate-300">
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!selectedTemplate}
          className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Next
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
