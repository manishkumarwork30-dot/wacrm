'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  MoreVertical,
  ExternalLink,
  Trash2,
  StopCircle,
  BarChart3,
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
}

interface JobCardProps {
  job: NumberCheckJob;
  onDeleted: () => void;
  onCancelled: () => void;
}

const statusConfig = {
  pending: { label: 'Queued', color: 'text-amber-400', bg: 'bg-amber-400/10', icon: Clock },
  running: { label: 'Running', color: 'text-blue-400', bg: 'bg-blue-400/10', icon: Loader2 },
  completed: { label: 'Completed', color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: CheckCircle2 },
  failed: { label: 'Failed', color: 'text-red-400', bg: 'bg-red-400/10', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'text-slate-500', bg: 'bg-slate-500/10', icon: StopCircle },
};

export function JobCard({ job, onDeleted, onCancelled }: JobCardProps) {
  const [deleting, setDeleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

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

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/active-numbers/jobs/${job.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Job deleted');
      onDeleted();
    } catch {
      toast.error('Failed to delete job');
    } finally {
      setDeleting(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      const res = await fetch(`/api/active-numbers/jobs/${job.id}/cancel`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to cancel');
      toast.success('Job cancelled');
      onCancelled();
    } catch {
      toast.error('Failed to cancel job');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4 hover:border-slate-700 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-white truncate">{job.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {new Date(job.created_at).toLocaleString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.color}`}>
            <StatusIcon className={`h-3 w-3 ${job.status === 'running' ? 'animate-spin' : ''}`} />
            {cfg.label}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-slate-400 hover:text-white h-7 w-7"
              />
            }
          >
            <MoreVertical className="h-4 w-4" />
          </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-900 border-slate-700">
              <DropdownMenuItem
                render={
                  <Link
                    href={`/active-numbers/${job.id}`}
                    className="flex items-center gap-2 text-slate-300 focus:bg-slate-800 focus:text-white"
                  />
                }
              >
                <ExternalLink className="h-4 w-4" />
                View Details
              </DropdownMenuItem>
              {(job.status === 'pending' || job.status === 'running') && (
                <>
                  <DropdownMenuSeparator className="bg-slate-700" />
                  <DropdownMenuItem
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="text-amber-400 focus:bg-slate-800 focus:text-amber-300"
                  >
                    {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <StopCircle className="h-4 w-4" />}
                    Cancel Job
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem
                onClick={handleDelete}
                disabled={deleting}
                variant="destructive"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Progress bar */}
      {job.status !== 'pending' && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{job.checked_count.toLocaleString('en-IN')} / {job.total_count.toLocaleString('en-IN')} checked</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-slate-800/60 px-3 py-2 text-center">
          <p className="text-lg font-bold text-white">
            {job.total_count.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total</p>
        </div>
        <div className="rounded-lg bg-emerald-500/10 px-3 py-2 text-center">
          <p className="text-lg font-bold text-emerald-400">
            {job.active_count.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-emerald-600 uppercase tracking-wider">
            Active {activePercent > 0 && `(${activePercent}%)`}
          </p>
        </div>
        <div className="rounded-lg bg-slate-800/60 px-3 py-2 text-center">
          <p className="text-lg font-bold text-slate-400">
            {(job.checked_count - job.active_count).toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Inactive</p>
        </div>
      </div>

      {/* View link */}
      <Link
        href={`/active-numbers/${job.id}`}
        className="flex items-center justify-center gap-2 w-full rounded-lg border border-slate-700 bg-slate-800/50 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
      >
        <BarChart3 className="h-4 w-4" />
        View Results
      </Link>
    </div>
  );
}
