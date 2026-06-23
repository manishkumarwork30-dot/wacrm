'use client';

import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Upload,
  FileText,
  Loader2,
  X,
  Phone,
  Info,
  CheckCircle2,
} from 'lucide-react';

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJobCreated: (jobId: string) => void;
}

function parseNumbers(text: string): string[] {
  return text
    .split(/[\n,;\r\t ]+/)
    .map((n) => n.trim().replace(/[^+0-9]/g, ''))
    .filter((n) => n.length >= 10);
}

function estimateTime(count: number): string {
  // ~1000 numbers/batch, each batch ~3s
  const seconds = Math.ceil(count / 1000) * 3;
  if (seconds < 60) return `~${seconds} seconds`;
  if (seconds < 3600) return `~${Math.ceil(seconds / 60)} minutes`;
  return `~${(seconds / 3600).toFixed(1)} hours`;
}

export function UploadModal({ open, onOpenChange, onJobCreated }: UploadModalProps) {
  const [jobName, setJobName] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [parsedNumbers, setParsedNumbers] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePasteChange = useCallback((text: string) => {
    setPasteText(text);
    const nums = parseNumbers(text);
    setParsedNumbers(nums);
  }, []);

  const handleFile = useCallback(async (file: File) => {
    const text = await file.text();
    setFileName(file.name);
    setPasteText(text);
    const nums = parseNumbers(text);
    setParsedNumbers(nums);
    toast.success(`Parsed ${nums.length.toLocaleString('en-IN')} numbers from ${file.name}`);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  async function handleSubmit() {
    if (!jobName.trim()) {
      toast.error('Please enter a job name');
      return;
    }
    if (parsedNumbers.length === 0) {
      toast.error('Please add at least one phone number');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/active-numbers/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: jobName.trim(),
          numbers: parsedNumbers,
          country_code: countryCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create job');

      toast.success(`✅ Job created! Checking ${parsedNumbers.length.toLocaleString('en-IN')} numbers...`);
      onJobCreated(data.job.id);
      onOpenChange(false);
      // Reset
      setJobName('');
      setPasteText('');
      setParsedNumbers([]);
      setFileName('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create job');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-200 sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Phone className="h-4 w-4" />
            </div>
            New Number Check
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Upload a list of phone numbers to check their WhatsApp status in bulk.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Job Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Job Name</label>
            <Input
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              placeholder="e.g. June Campaign Numbers"
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>

          {/* Country Code */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">
              Default Country Code
              <span className="ml-2 text-xs text-slate-500">(applied to numbers without + prefix)</span>
            </label>
            <div className="flex gap-2">
              {['+91', '+1', '+44', '+971'].map((code) => (
                <button
                  key={code}
                  onClick={() => setCountryCode(code)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    countryCode === code
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {code}
                </button>
              ))}
              <Input
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                placeholder="+XX"
                className="w-24 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Upload File</label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-all ${
                dragOver
                  ? 'border-emerald-500/70 bg-emerald-500/5'
                  : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/50'
              }`}
            >
              {fileName ? (
                <div className="flex items-center gap-2 text-emerald-400">
                  <FileText className="h-5 w-5" />
                  <span className="text-sm font-medium">{fileName}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFileName('');
                      setPasteText('');
                      setParsedNumbers([]);
                    }}
                    className="ml-1 text-slate-500 hover:text-slate-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-slate-500" />
                  <div className="text-center">
                    <p className="text-sm text-slate-300">Drag & drop or click to upload</p>
                    <p className="text-xs text-slate-500 mt-1">CSV, TXT — one number per line</p>
                  </div>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>
          </div>

          {/* Paste Area */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">
              Or Paste Numbers
              <span className="ml-2 text-xs text-slate-500">(one per line, or comma-separated)</span>
            </label>
            <textarea
              value={pasteText}
              onChange={(e) => handlePasteChange(e.target.value)}
              placeholder="919876543210&#10;919999888877&#10;+91 98765 43210"
              rows={6}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 text-sm px-3 py-2 font-mono resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
          </div>

          {/* Preview / Stats */}
          {parsedNumbers.length > 0 && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span className="text-sm font-semibold">
                  {parsedNumbers.length.toLocaleString('en-IN')} valid numbers found
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
                <div>
                  <span className="text-slate-500">Estimated time:</span>{' '}
                  <span className="text-white">{estimateTime(parsedNumbers.length)}</span>
                </div>
                <div>
                  <span className="text-slate-500">Batch size:</span>{' '}
                  <span className="text-white">1,000 / batch</span>
                </div>
              </div>
              <div className="text-xs text-slate-500 font-mono max-h-20 overflow-y-auto space-y-0.5">
                {parsedNumbers.slice(0, 5).map((n, i) => (
                  <div key={i} className="text-slate-400">{n}</div>
                ))}
                {parsedNumbers.length > 5 && (
                  <div className="text-slate-600">+{parsedNumbers.length - 5} more...</div>
                )}
              </div>
            </div>
          )}

          {/* Info note */}
          <div className="flex gap-2 rounded-lg bg-blue-500/5 border border-blue-500/20 p-3">
            <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400 leading-relaxed">
              WhatsApp status is checked via Meta's official Contacts API — no messages are sent to the numbers.
              Processing runs in the background and you can track progress in real time.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || parsedNumbers.length === 0 || !jobName.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Phone className="h-4 w-4" />
                Start Check ({parsedNumbers.length.toLocaleString('en-IN')})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
