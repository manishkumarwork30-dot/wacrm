'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { JobCard } from '@/components/active-numbers/job-card';
import { UploadModal } from '@/components/active-numbers/upload-modal';
import {
  Plus,
  Phone,
  Loader2,
  CheckCircle2,
  TrendingUp,
  Activity,
} from 'lucide-react';

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

export default function ActiveNumbersPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<NumberCheckJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/active-numbers/jobs');
      const data = await res.json();
      setJobs(data.jobs ?? []);
    } catch {
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Auto-refresh if any job is running
  useEffect(() => {
    const hasActive = jobs.some((j) => j.status === 'running' || j.status === 'pending');
    if (!hasActive) return;
    const t = setInterval(fetchJobs, 5000);
    return () => clearInterval(t);
  }, [jobs, fetchJobs]);

  // Aggregate stats across all jobs
  const totalChecked = jobs.reduce((s, j) => s + (j.checked_count ?? 0), 0);
  const totalActive = jobs.reduce((s, j) => s + (j.active_count ?? 0), 0);
  const completedJobs = jobs.filter((j) => j.status === 'completed').length;
  const activeRate = totalChecked > 0 ? Math.round((totalActive / totalChecked) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <Phone className="h-5 w-5" />
            </div>
            Active Numbers
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Check WhatsApp status &amp; DND for bulk phone numbers
          </p>
        </div>
        <Button
          onClick={() => setUploadOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30"
        >
          <Plus className="h-4 w-4" />
          New Check
        </Button>
      </div>

      {/* Summary stats */}
      {jobs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: 'Total Jobs',
              value: jobs.length,
              icon: Activity,
              color: 'text-blue-400',
              bg: 'bg-blue-400/10',
            },
            {
              label: 'Completed',
              value: completedJobs,
              icon: CheckCircle2,
              color: 'text-emerald-400',
              bg: 'bg-emerald-400/10',
            },
            {
              label: 'Numbers Checked',
              value: totalChecked.toLocaleString('en-IN'),
              icon: Phone,
              color: 'text-purple-400',
              bg: 'bg-purple-400/10',
            },
            {
              label: 'Active Rate',
              value: `${activeRate}%`,
              icon: TrendingUp,
              color: 'text-amber-400',
              bg: 'bg-amber-400/10',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex items-center gap-3"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Jobs list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-sm text-slate-500">Loading jobs...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-6">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
              <Phone className="h-10 w-10" />
            </div>
            <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 ring-2 ring-slate-800">
              <Plus className="h-3.5 w-3.5 text-emerald-400" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white">No checks yet</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-xs">
              Upload a list of phone numbers to check which ones are active on WhatsApp.
            </p>
          </div>
          <Button
            onClick={() => setUploadOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            <Plus className="h-4 w-4" />
            Start your first check
          </Button>
        </div>
      ) : (
        <div>
          <h2 className="text-sm font-medium text-slate-400 mb-4">
            Recent Jobs ({jobs.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onDeleted={fetchJobs}
                onCancelled={fetchJobs}
              />
            ))}
          </div>
        </div>
      )}

      <UploadModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onJobCreated={(jobId) => {
          fetchJobs();
          router.push(`/active-numbers/${jobId}`);
        }}
      />
    </div>
  );
}
