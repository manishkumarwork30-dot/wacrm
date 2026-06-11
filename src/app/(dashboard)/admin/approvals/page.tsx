"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Upload, FileSpreadsheet, Download, X, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function ApprovalsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Single-send modal state
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Bulk Excel → ZIP state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ count: number; errors: number } | null>(null);

  useEffect(() => {
    async function fetchApprovals() {
      const supabase = createClient();
      const { data } = await supabase
        .from("tower_leads")
        .select("*, contacts(phone)")
        .order("updated_at", { ascending: false });

      if (data) setLeads(data);
      setIsLoading(false);
    }
    fetchApprovals();
  }, []);

  // ── Single send ──────────────────────────────────────────────────────────────

  const handleSendApprovalClick = (lead: any) => {
    setSelectedLead(lead);
    setEditName(lead.name || "");
    setEditLocation(lead.location || "");
    setIsModalOpen(true);
  };

  const submitSendApproval = async () => {
    if (!selectedLead) return;
    if (!editName.trim() || !editLocation.trim()) {
      toast.error("Name and Location are required to generate the PDF.");
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch(`/api/leads/${selectedLead.id}/send-approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, location: editLocation }),
      });

      const data = await response.json();

      if (response.status === 202 && data.outsideWorkingHours) {
        toast.error(`⏰ ${data.message}`, { duration: 6000 });
        setIsModalOpen(false);
        return;
      }

      if (!response.ok) throw new Error(data.error || "Failed to send approval");

      toast.success("Approval PDF sent successfully!");
      setIsModalOpen(false);
      setLeads(leads.map((l) =>
        l.id === selectedLead.id
          ? { ...l, name: editName, location: editLocation, status: "Approval Sent", updated_at: new Date().toISOString() }
          : l
      ));
    } catch (err: any) {
      toast.error(err.message || "Failed to send approval");
    } finally {
      setIsSending(false);
    }
  };

  // ── Bulk Excel → ZIP ─────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setBulkFile(f);
    setBulkResult(null);
  };

  const handleBulkGenerate = async () => {
    if (!bulkFile) return;
    setIsBulkGenerating(true);
    setBulkResult(null);

    try {
      const form = new FormData();
      form.append("file", bulkFile);

      const response = await fetch("/api/bulk-approval", {
        method: "POST",
        body: form,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to generate approvals");
      }

      // Grab metadata from headers
      const count  = parseInt(response.headers.get("X-Generated-Count") ?? "0", 10);
      const errors = parseInt(response.headers.get("X-Error-Count")    ?? "0", 10);

      // Download the ZIP
      const blob     = await response.blob();
      const today    = new Date();
      const dateStr  = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
      const url      = URL.createObjectURL(blob);
      const anchor   = document.createElement("a");
      anchor.href    = url;
      anchor.download = `HTL_Approvals_${dateStr}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      setBulkResult({ count, errors });
      toast.success(`✅ ${count} approval PDF${count !== 1 ? "s" : ""} downloaded as ZIP!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate bulk approvals");
    } finally {
      setIsBulkGenerating(false);
    }
  };

  const clearBulkFile = () => {
    setBulkFile(null);
    setBulkResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col p-6 gap-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Approvals Management</h1>
          <p className="text-sm text-slate-400 mt-1">
            Send individual approvals or bulk-generate PDFs from an Excel sheet.
          </p>
        </div>
      </div>

      {/* ── Bulk Generator Card ────────────────────────────────────────────── */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
            <FileSpreadsheet className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Bulk Approval Generator</h2>
            <p className="text-xs text-slate-400">
              Upload an Excel file with <span className="text-blue-400 font-medium">Name</span> and{" "}
              <span className="text-blue-400 font-medium">District</span> columns → download ZIP of all PDFs
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start">
          {/* File picker */}
          <div className="relative flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="bulk-excel-input"
            />
            <label
              htmlFor="bulk-excel-input"
              className="flex items-center gap-2 w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-300 hover:border-blue-500/50 hover:text-white transition-colors"
            >
              <Upload className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="truncate">
                {bulkFile ? bulkFile.name : "Choose Excel file (.xlsx / .xls)"}
              </span>
            </label>
          </div>

          {/* Clear button */}
          {bulkFile && !isBulkGenerating && (
            <button
              onClick={clearBulkFile}
              className="flex items-center justify-center h-10 w-10 rounded-lg border border-slate-700 bg-slate-900 text-slate-400 hover:text-white transition-colors shrink-0"
              title="Clear file"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Generate button */}
          <Button
            onClick={handleBulkGenerate}
            disabled={!bulkFile || isBulkGenerating}
            className="bg-blue-600 hover:bg-blue-500 text-white shrink-0 gap-2"
          >
            {isBulkGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating PDFs…
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Generate &amp; Download ZIP
              </>
            )}
          </Button>
        </div>

        {/* Result badge */}
        {bulkResult && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
            <span className="text-green-400 font-medium">{bulkResult.count} PDF{bulkResult.count !== 1 ? "s" : ""} generated</span>
            {bulkResult.errors > 0 && (
              <span className="text-yellow-400 ml-2">· {bulkResult.errors} row{bulkResult.errors !== 1 ? "s" : ""} skipped (see _errors.txt in ZIP)</span>
            )}
          </div>
        )}

        {/* Format hint */}
        <p className="mt-3 text-xs text-slate-500">
          💡 Max 100 rows per upload. Required columns:{" "}
          <code className="bg-slate-800 px-1 rounded text-slate-300">Name</code>,{" "}
          <code className="bg-slate-800 px-1 rounded text-slate-300">District</code>{" "}
          (also accepts <code className="bg-slate-800 px-1 rounded text-slate-300">Location</code>)
        </p>
      </div>

      {/* ── Leads Table ────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-1 flex-1">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/50 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">District</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Sent At</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-slate-600" />
                    Loading approvals…
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No leads found.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="transition-colors hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-medium text-white">{lead.name || "Unknown"}</td>
                    <td className="px-4 py-3 text-slate-400">+{lead.contacts?.phone || "Unknown"}</td>
                    <td className="px-4 py-3 text-slate-400">{lead.location || "N/A"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        lead.status === "Approval Sent"
                          ? "bg-green-500/10 text-green-400"
                          : "bg-yellow-500/10 text-yellow-400"
                      }`}>
                        {lead.status === "Approval Sent" ? "✓ Sent" : "Pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {lead.status === "Approval Sent" && lead.updated_at
                        ? format(new Date(lead.updated_at), "MMM d, yyyy h:mm a")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendApprovalClick(lead)}
                        className="border-primary/20 hover:bg-primary hover:text-primary-foreground text-primary h-8"
                      >
                        <Send className="w-3 h-3 mr-1" />
                        {lead.status === "Approval Sent" ? "Resend" : "Send"}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Send Approval Modal ─────────────────────────────────────────────── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-slate-950 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>
              {selectedLead?.status === "Approval Sent" ? "Resend" : "Send"} Approval PDF
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Confirm or update the details below before generating and sending the approval PDF.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-slate-300">Name on Document</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Applicant Name"
                className="bg-slate-900 border-slate-800 text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location" className="text-slate-300">Location / District</Label>
              <Input
                id="location"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                placeholder="District or Location"
                className="bg-slate-900 border-slate-800 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="border-slate-800 bg-transparent hover:bg-slate-800 text-slate-300"
              disabled={isSending}
            >
              Cancel
            </Button>
            <Button
              onClick={submitSendApproval}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={isSending || !editName.trim() || !editLocation.trim()}
            >
              {isSending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</>
                : <><Send className="w-4 h-4 mr-2" />{selectedLead?.status === "Approval Sent" ? "Resend PDF Now" : "Send PDF Now"}</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
