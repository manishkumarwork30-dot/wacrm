'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Phone,
} from 'lucide-react';

interface CheckResult {
  id: string;
  phone: string;
  whatsapp_active: boolean | null;
  dnd_status: boolean | null;
  checked_at: string | null;
}

interface ResultsTableProps {
  jobId: string;
  jobStatus: string;
}

type FilterType = 'all' | 'active' | 'inactive' | 'dnd';

const FILTER_OPTIONS: { value: FilterType; label: string; color: string }[] = [
  { value: 'all', label: 'All', color: 'text-slate-300' },
  { value: 'active', label: 'Active ✓', color: 'text-emerald-400' },
  { value: 'inactive', label: 'Inactive ✗', color: 'text-red-400' },
  { value: 'dnd', label: 'DND', color: 'text-amber-400' },
];

export function ResultsTable({ jobId, jobStatus }: ResultsTableProps) {
  const [results, setResults] = useState<CheckResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        filter,
        search,
      });
      const res = await fetch(`/api/active-numbers/jobs/${jobId}/results?${params}`);
      const data = await res.json();
      setResults(data.results ?? []);
      setTotal(data.total ?? 0);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [jobId, page, filter, search]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Auto-refresh while job is running
  useEffect(() => {
    if (jobStatus !== 'running' && jobStatus !== 'pending') return;
    const t = setInterval(fetchResults, 4000);
    return () => clearInterval(t);
  }, [fetchResults, jobStatus]);

  async function handleExport() {
    setExporting(true);
    try {
      const url = `/api/active-numbers/jobs/${jobId}/export?filter=${filter}`;
      const link = document.createElement('a');
      link.href = url;
      link.click();
    } finally {
      setTimeout(() => setExporting(false), 2000);
    }
  }

  const totalPages = Math.ceil(total / 100);
  const hasPrev = page > 0;
  const hasNext = page < totalPages - 1;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        {/* Filters */}
        <div className="flex items-center gap-1 flex-wrap">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setFilter(f.value); setPage(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                filter === f.value
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search number..."
              className="pl-8 h-8 text-xs bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 w-44"
            />
          </div>

          {/* Export */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting || total === 0}
            className="border-slate-700 text-slate-300 hover:bg-slate-800 h-8 text-xs"
          >
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Export CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400 text-xs">Phone Number</TableHead>
              <TableHead className="text-slate-400 text-xs text-center">WhatsApp</TableHead>
              <TableHead className="text-slate-400 text-xs text-center hidden sm:table-cell">DND</TableHead>
              <TableHead className="text-slate-400 text-xs hidden md:table-cell">Checked At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-slate-800">
                <TableCell colSpan={4} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                    <p className="text-sm text-slate-500">Loading results...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : results.length === 0 ? (
              <TableRow className="border-slate-800">
                <TableCell colSpan={4} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Phone className="h-8 w-8 text-slate-700" />
                    <p className="text-sm text-slate-500">
                      {search ? 'No numbers match your search.' : 'No results yet — check is in progress.'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              results.map((r) => (
                <TableRow key={r.id} className="border-slate-800 hover:bg-slate-900/50">
                  <TableCell className="font-mono text-sm text-slate-200">
                    {r.phone}
                  </TableCell>
                  <TableCell className="text-center">
                    {r.whatsapp_active === null ? (
                      <Clock className="h-4 w-4 text-slate-600 mx-auto" />
                    ) : r.whatsapp_active ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400">
                        <XCircle className="h-4 w-4" />
                        Inactive
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center hidden sm:table-cell">
                    {r.dnd_status === null ? (
                      <span className="text-xs text-slate-600">—</span>
                    ) : r.dnd_status ? (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-400">
                        DND
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600">Clear</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 hidden md:table-cell">
                    {r.checked_at
                      ? new Date(r.checked_at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : <span className="text-slate-700">Pending</span>}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            {total.toLocaleString('en-IN')} results · Page {page + 1} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={!hasPrev}
              onClick={() => setPage((p) => p - 1)}
              className="border-slate-700 text-slate-400 hover:bg-slate-800 disabled:opacity-30 h-7 w-7"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={!hasNext}
              onClick={() => setPage((p) => p + 1)}
              className="border-slate-700 text-slate-400 hover:bg-slate-800 disabled:opacity-30 h-7 w-7"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
