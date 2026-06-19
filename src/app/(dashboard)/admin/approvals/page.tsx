"use client";

import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
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
  const [editDate, setEditDate] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Bulk Excel → ZIP state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ count: number; errors: number } | null>(null);
  const [bulkMode, setBulkMode] = useState<"excel" | "text">("excel");
  const [rawTextData, setRawTextData] = useState("");
  const [textBulkDate, setTextBulkDate] = useState("");

  const parseTextData = (text: string) => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const parsed: { name: string; district: string }[] = [];
    let lastPotentialName = '';

    for (const line of lines) {
      const isDistrict = /^(district|location|city|area|state)\b/i.test(line) || /district/i.test(line);
      if (isDistrict) {
        const cleanDistrict = line.replace(/^(district|location|city|area|state)[\s:-]+/i, '').trim();
        if (lastPotentialName && cleanDistrict) {
          parsed.push({ name: lastPotentialName, district: cleanDistrict });
          lastPotentialName = '';
        }
      } else {
        const cleanName = line.replace(/^(mr|ms|mrs|shri|smt)\.?\s+/i, '').trim();
        lastPotentialName = cleanName;
      }
    }

    if (parsed.length === 0 && lines.length >= 2) {
      for (let i = 0; i < lines.length - 1; i += 2) {
        const name = lines[i].replace(/^(mr|ms|mrs|shri|smt)\.?\s+/i, '').trim();
        const district = lines[i+1].replace(/^(district|location|city|area|state)[\s:-]+/i, '').trim();
        if (name && district) {
          parsed.push({ name, district });
        }
      }
    }

    return parsed;
  };

  const downloadTemplate = () => {
    try {
      const data = [
        { Name: "Ramesh Kumar", District: "Lucknow", Date: "17/06/2026" },
        { Name: "Suresh Sharma", District: "Jaipur", Date: "18/06/2026" },
        { Name: "Priya Singh", District: "Patna", Date: "19/06/2026" }
      ];
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Approvals");
      const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "HTL_Bulk_Approval_Template.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Template downloaded!");
    } catch (err: any) {
      toast.error("Failed to download template: " + err.message);
    }
  };

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
    const today = new Date().toISOString().split("T")[0];
    setEditDate(lead.approval_date || today);
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
        body: JSON.stringify({ name: editName, location: editLocation, date: editDate }),
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
          ? { ...l, name: editName, location: editLocation, approval_date: editDate, status: "Approval Sent", updated_at: new Date().toISOString() }
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
    let parsedRows: { name: string; district: string }[] = [];

    if (bulkMode === "excel") {
      if (!bulkFile) return;
    } else {
      parsedRows = parseTextData(rawTextData);
      if (parsedRows.length === 0) {
        toast.error("No valid names/districts parsed from the pasted text.");
        return;
      }
    }

    setIsBulkGenerating(true);
    setBulkResult(null);

    try {
      let response;
      if (bulkMode === "excel") {
        const form = new FormData();
        form.append("file", bulkFile!);
        response = await fetch("/api/bulk-approval", {
          method: "POST",
          body: form,
        });
      } else {
        const rowsWithDate = parsedRows.map((r) => ({
          ...r,
          date: textBulkDate || undefined,
        }));
        response = await fetch("/api/bulk-approval", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: rowsWithDate }),
        });
      }

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
              <FileSpreadsheet className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Bulk Approval Generator</h2>
              <p className="text-xs text-slate-400">
                Generate PDFs in bulk using an Excel file or by pasting raw applicant text.
              </p>
            </div>
          </div>
          <div className="flex rounded-lg bg-slate-900 p-1 border border-slate-800">
            <button
              onClick={() => { setBulkMode("excel"); setBulkResult(null); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                bulkMode === "excel"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Excel File
            </button>
            <button
              onClick={() => { setBulkMode("text"); setBulkResult(null); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                bulkMode === "text"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Copy-Paste Text
            </button>
          </div>
        </div>

        {bulkMode === "excel" ? (
          <div className="flex flex-col sm:flex-row gap-3 items-start">
            {/* File picker */}
            <div className="relative flex-1 w-full">
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
              className="bg-blue-600 hover:bg-blue-500 text-white shrink-0 gap-2 w-full sm:w-auto"
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
        ) : (
          <div className="flex flex-col gap-3">
            <textarea
              value={rawTextData}
              onChange={(e) => { setRawTextData(e.target.value); setBulkResult(null); }}
              placeholder={`Paste applicant names and locations here. Example:\n\nMr Roop Chandr\nDistrict Bijnor\n\nMr Sunil Kumar\nDistrict Nawada`}
              className="w-full min-h-[120px] rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-blue-500/50 focus:outline-none transition-colors font-mono"
            />
            <div className="flex flex-col gap-1.5 max-w-[220px]">
              <label className="text-xs text-slate-400 font-medium">Select Custom Date (Optional)</label>
              <input
                type="date"
                value={textBulkDate}
                onChange={(e) => setTextBulkDate(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 focus:border-blue-500/50 focus:outline-none transition-colors h-9"
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs text-slate-400">
                {rawTextData.trim() ? (
                  <span className="text-blue-400 font-semibold">
                    ✓ {parseTextData(rawTextData).length} applicants parsed.
                  </span>
                ) : (
                  "Paste applicant details. Each pair should have name on one line and district on another line."
                )}
              </span>

              <Button
                onClick={handleBulkGenerate}
                disabled={parseTextData(rawTextData).length === 0 || isBulkGenerating}
                className="bg-blue-600 hover:bg-blue-500 text-white shrink-0 gap-2 w-full sm:w-auto self-end"
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
          </div>
        )}

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

        {/* Format hint & Template download */}
        {bulkMode === "excel" && (
          <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-xs text-slate-500">
              💡 Max 100 rows per upload. Required columns:{" "}
              <code className="bg-slate-800 px-1 rounded text-slate-300">Name</code>,{" "}
              <code className="bg-slate-800 px-1 rounded text-slate-300">District</code>{" "}
              (also accepts <code className="bg-slate-800 px-1 rounded text-slate-300">Location</code>), and optional{" "}
              <code className="bg-slate-800 px-1 rounded text-slate-300">Date</code>
            </p>
            <button
              onClick={downloadTemplate}
              className="text-xs text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1.5 self-start sm:self-auto font-medium"
            >
              <Download className="h-3 w-3" />
              Download Example Template
            </button>
          </div>
        )}
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
                <th className="px-4 py-3 font-medium">Approval Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Sent At</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-slate-600" />
                    Loading approvals…
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No leads found.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="transition-colors hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-medium text-white">{lead.name || "Unknown"}</td>
                    <td className="px-4 py-3 text-slate-400">+{lead.contacts?.phone || "Unknown"}</td>
                    <td className="px-4 py-3 text-slate-400">{lead.location || "N/A"}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {lead.approval_date ? (() => {
                        const parsed = new Date(lead.approval_date);
                        return isNaN(parsed.getTime()) ? lead.approval_date : format(parsed, "MMM d, yyyy");
                      })() : "—"}
                    </td>
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
                        onClick={() => handleSendApprovalClick(lead)}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-900/20 border-0 h-8 font-medium transition-all"
                      >
                        <Send className="w-3.5 h-3.5 mr-1.5" />
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
            <div className="grid gap-2">
              <Label htmlFor="approval_date" className="text-slate-300">Approval Date</Label>
              <Input
                id="approval_date"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
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
              disabled={isSending || !editName.trim() || !editLocation.trim() || !editDate}
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
