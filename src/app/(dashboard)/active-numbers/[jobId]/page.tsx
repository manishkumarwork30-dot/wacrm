'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ResultsTable } from '@/components/active-numbers/results-table';
import {
  ArrowLeft,
  Phone,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  StopCircle,
  Download,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

interface NumberCheckJob {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  total_count: number;
  checked_count: number;
  active_count: number;
  dnd_count: number;
  created_at: string;
  completed_at: string | null;
  error_message?: string;
}

const statusConfig = {
  pending: { label: 'Queued', color: 'text-amber-400', bg: 'bg-amber-400/10', icon: Clock },
  running: { label: 'Checking...', color: 'text-blue-400', bg: 'bg-blue-400/10', icon: Loader2 },
  completed: { label: 'Completed', color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: CheckCircle2 },
  failed: { label: 'Failed', color: 'text-red-400', bg: 'bg-red-400/10', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'text-slate-500', bg: 'bg-slate-500/10', icon: StopCircle },
};

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.jobId as string;

  const [job, setJob] = useState<NumberCheckJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch(`/api/active-numbers/jobs/${jobId}`);
      if (!res.ok) {
        toast.error('Job not found');
        router.push('/active-numbers');
        return;
      }
      const data = await res.json();
      setJob(data.job);
    } finally {
      setLoading(false);
    }
  }, [jobId, router]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  // Auto-refresh while running
  useEffect(() => {
    if (!job || (job.status !== 'running' && job.status !== 'pending')) return;
    const t = setInterval(fetchJob, 3000);
    return () => clearInterval(t);
  }, [job, fetchJob]);

  async function handleCancel() {
    setCancelling(true);
    try {
      const res = await fetch(`/api/active-numbers/jobs/${jobId}/cancel`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to cancel');
      toast.success('Job cancelled');
      fetchJob();
    } catch {
      toast.error('Failed to cancel job');
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!job) return null;

  const cfg = statusConfig[job.status] ?? statusConfig.pending;
  const StatusIcon = cfg.icon;
  const progress =
    job.total_count > 0
      ? Math.round((job.checked_count / job.total_count) * 100)
      : 0;
  const activePercent =
    job.checked_count > 0
      ? Math.round((job.active_count / job.checked_count) * 100)
      : 0;
  const inactiveCount = Math.max(0, job.checked_count - job.active_count);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          href="/active-numbers"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-white truncate">{job.name}</h1>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium shrink-0 ${cfg.bg} ${cfg.color}`}
            >
              <StatusIcon className={`h-3 w-3 ${job.status === 'running' ? 'animate-spin' : ''}`} />
              {cfg.label}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Created{' '}
            {new Date(job.created_at).toLocaleString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
            {job.completed_at && (
              <> · Completed {new Date(job.completed_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit' })}</>
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchJob}
            className="border-slate-700 text-slate-400 hover:bg-slate-800 h-8"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/api/active-numbers/jobs/${jobId}/export?filter=all`, '_blank')}
            className="border-slate-700 text-slate-300 hover:bg-slate-800 h-8"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
          {(job.status === 'running' || job.status === 'pending') && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={cancelling}
              className="border-red-800/50 text-red-400 hover:bg-red-900/20 h-8"
            >
              {cancelling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <StopCircle className="h-3.5 w-3.5" />
              )}
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Progress Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-300 font-medium">
              {job.checked_count.toLocaleString('en-IN')} / {job.total_count.toLocaleString('en-IN')} numbers checked
            </span>
            <span className="text-emerald-400 font-semibold">{progress}%</span>
          </div>
          <div className="relative h-3 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #10b981, #34d399)',
              }}
            />
            {(job.status === 'running') && (
              <div
                className="absolute inset-y-0 w-16 animate-pulse"
                style={{
                  left: `${progress}%`,
                  background: 'linear-gradient(90deg, rgba(52,211,153,0.4), transparent)',
                }}
              />
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: 'Total Numbers',
              value: job.total_count.toLocaleString('en-IN'),
              icon: Phone,
              color: 'text-slate-300',
              bg: 'bg-slate-700/50',
            },
            {
              label: 'WA Active',
              value: job.active_count.toLocaleString('en-IN'),
              sublabel: activePercent > 0 ? `${activePercent}% of checked` : undefined,
              icon: CheckCircle2,
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10',
            },
            {
              label: 'Inactive',
              value: inactiveCount.toLocaleString('en-IN'),
              icon: XCircle,
              color: 'text-red-400',
              bg: 'bg-red-500/10',
            },
            {
              label: 'Active Rate',
              value: `${activePercent}%`,
              icon: TrendingUp,
              color: 'text-amber-400',
              bg: 'bg-amber-500/10',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`rounded-xl ${stat.bg} px-4 py-3 flex items-center gap-3`}
            >
              <stat.icon className={`h-5 w-5 shrink-0 ${stat.color}`} />
              <div>
                <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-[10px] text-slate-500 leading-tight">{stat.label}</p>
                {stat.sublabel && (
                  <p className="text-[10px] text-slate-600 leading-tight">{stat.sublabel}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Results table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">Results</h2>
        <ResultsTable jobId={jobId} jobStatus={job.status} />
      </div>
    </div>
  );
}
