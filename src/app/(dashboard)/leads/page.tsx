"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { 
  Download, 
  Search, 
  Filter, 
  Database, 
  HelpCircle,
  FileSpreadsheet,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  UserCheck,
  Send,
  Loader2
} from "lucide-react";
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

interface Lead {
  id: string;
  name: string;
  mobile_no: string;
  location: string;
  state: string;
  pin_code: string;
  land_size: string;
  ownership?: string;
  status: string;
  created_at: string;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showGuide, setShowGuide] = useState(false);
  
  // Modal State for Manual Send Approval
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [isSending, setIsSending] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function fetchLeads() {
      try {
        const { data, error } = await supabase
          .from("tower_leads")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setLeads(data || []);
      } catch (err: any) {
        console.error("Error loading leads:", err.message);
        toast.error("Failed to load leads from database");
      } finally {
        setLoading(false);
      }
    }

    fetchLeads();

    window.addEventListener("refresh-data", fetchLeads);
    return () => {
      window.removeEventListener("refresh-data", fetchLeads);
    };
  }, [supabase]);

  // Compute metrics
  const metrics = useMemo(() => {
    const total = leads.length;
    const pending = leads.filter(l => l.status === "Pending").length;
    const interested = leads.filter(l => l.status === "Interested – Payment Pending").length;
    const converted = leads.filter(l => l.status === "Converted").length;
    const rejected = leads.filter(l => l.status === "Not Interested").length;

    return { total, pending, interested, converted, rejected };
  }, [leads]);

  // Filtered leads list
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = 
        (lead.name?.toLowerCase() || "").includes(search.toLowerCase()) ||
        (lead.mobile_no || "").includes(search) ||
        (lead.location?.toLowerCase() || "").includes(search.toLowerCase()) ||
        (lead.state?.toLowerCase() || "").includes(search.toLowerCase()) ||
        (lead.pin_code || "").includes(search);

      const matchesStatus = statusFilter === "all" || lead.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [leads, search, statusFilter]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredLeads.length === 0) {
      toast.warning("No leads to export");
      return;
    }

    try {
      const headers = ["S.No", "Name", "Mobile No", "Location", "State", "Pin Code", "Land Size (sq.ft)", "Ownership", "Status", "Date & Time"];
      const rows = filteredLeads.map((l, index) => [
        index + 1,
        l.name || "",
        l.mobile_no ? `\t${l.mobile_no}` : "",
        l.location || "",
        l.state || "",
        l.pin_code ? `\t${l.pin_code}` : "",
        l.land_size || "",
        l.ownership || "",
        l.status || "",
        new Date(l.created_at).toLocaleString("en-IN")
      ]);

      const csvContent = [
        "sep=,",
        headers.join(","),
        ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
      ].join("\n");

      // Use Blob with UTF-8 BOM so Excel opens it in separate columns automatically
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Mobile_Tower_Leads_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Leads exported successfully!");
    } catch (err: any) {
      console.error("Export failed:", err.message);
      toast.error("Failed to export leads");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2 py-1 text-xs font-medium text-slate-400 border border-slate-500/20"><Clock className="size-3" /> Pending</span>;
      case "Interested – Payment Pending":
        return <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-400 border border-amber-500/20"><AlertCircle className="size-3" /> Interested - Pending Pay</span>;
      case "Converted":
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20"><CheckCircle className="size-3" /> Converted</span>;
      case "Not Interested":
        return <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-1 text-xs font-medium text-red-400 border border-red-500/20"><XCircle className="size-3" /> Not Interested</span>;
      default:
        return <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2 py-1 text-xs font-medium text-slate-400 border border-slate-500/20">{status}</span>;
    }
  };

  const handleSendApprovalClick = (lead: Lead) => {
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, location: editLocation }),
      });
      
      const data = await response.json();

      // 202 = outside working hours (9 AM – 9 PM IST)
      if (response.status === 202 && data.outsideWorkingHours) {
        toast.error(`⏰ ${data.message}`, { duration: 6000 });
        setIsModalOpen(false);
        return;
      }
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send approval');
      }
      
      toast.success("Approval PDF sent successfully!");
      setIsModalOpen(false);
      
      // Update local state to reflect the change
      setLeads(leads.map(l => {
        if (l.id === selectedLead.id) {
          return { ...l, name: editName, location: editLocation, status: 'Approval Sent' };
        }
        return l;
      }));
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to send approval");
    } finally {
      setIsSending(false);
    }
  };


  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Database className="size-6 text-primary" /> Mobile Tower Lead Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track and export tower installation applications received through WhatsApp Chatbot.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setShowGuide(!showGuide)}
            className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <HelpCircle className="mr-2 size-4" /> Sheets Setup Guide
          </Button>
          <Button
            onClick={handleExportCSV}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Download className="mr-2 size-4" /> Export Excel/CSV
          </Button>
        </div>
      </div>

      {/* Guide section */}
      {showGuide && (
        <Card className="border-slate-800 bg-slate-900 text-slate-300">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <FileSpreadsheet className="size-5 text-emerald-400" /> Google Sheets Automatic Integration Guide
            </CardTitle>
            <CardDescription className="text-slate-400">
              Follow these simple steps to save leads automatically in Google Sheets in real-time.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed">
            <div>
              <strong className="text-white">Step 1: Create a Google Sheet</strong>
              <p className="text-slate-400">Create a new Google Sheet and add these columns in row 1:</p>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto mt-1">
                Name | Mobile No | Location | State | Pin Code | Land Size | Status | Date
              </div>
            </div>
            <div>
              <strong className="text-white">Step 2: Add Apps Script</strong>
              <p className="text-slate-400">Open <strong>Extensions</strong> &gt; <strong>Apps Script</strong>. Clear any existing code and paste this script:</p>
              <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto max-h-48 mt-1">
{`function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  try {
    var data = JSON.parse(e.postData.contents);
    sheet.appendRow([
      data.name,
      data.mobile_no,
      data.location,
      data.state,
      data.pin_code,
      data.land_size,
      data.status,
      data.date
    ]);
    return ContentService.createTextOutput(JSON.stringify({"status": "success"})).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": err.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}`}
              </pre>
            </div>
            <div>
              <strong className="text-white">Step 3: Deploy as Web App</strong>
              <p className="text-slate-400">
                Click <strong>Deploy</strong> &gt; <strong>New Deployment</strong>. Select type <strong>Web App</strong>. Set "Execute as" to <strong>Me</strong> and "Who has access" to <strong>Anyone</strong>. Click Deploy and copy the Web App URL.
              </p>
            </div>
            <div>
              <strong className="text-white">Step 4: Configure environment variable</strong>
              <p className="text-slate-400">Add the copied URL in your Vercel settings or `.env.local` as:</p>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto mt-1">
                GOOGLE_SHEETS_WEBHOOK_URL="https://script.google.com/macros/s/.../exec"
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-400">Total Leads</span>
              <Database className="size-4 text-primary" />
            </div>
            <div className="mt-2 text-3xl font-bold text-white">{metrics.total}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-400">New Applications</span>
              <Clock className="size-4 text-slate-400" />
            </div>
            <div className="mt-2 text-3xl font-bold text-white">{metrics.pending}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-400">Interested (Pending Pay)</span>
              <AlertCircle className="size-4 text-amber-400" />
            </div>
            <div className="mt-2 text-3xl font-bold text-amber-400">{metrics.interested}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-400">Converted</span>
              <UserCheck className="size-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-3xl font-bold text-emerald-400">{metrics.converted}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-400">Not Interested</span>
              <XCircle className="size-4 text-red-400" />
            </div>
            <div className="mt-2 text-3xl font-bold text-red-400">{metrics.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card className="border-slate-800 bg-slate-900">
        <CardContent className="p-0">
          {/* Controls */}
          <div className="flex flex-col gap-4 p-4 border-b border-slate-800 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 size-4 text-slate-500" />
              <Input
                placeholder="Search leads by name, phone, location..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 border-slate-800 bg-slate-950 text-white placeholder:text-slate-500 focus-visible:ring-primary/20"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-slate-500 shrink-0" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="h-10 rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Interested – Payment Pending">Interested – Payment Pending</option>
                <option value="Converted">Converted</option>
                <option value="Not Interested">Not Interested</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-slate-400 gap-2">
              <Database className="size-8 text-slate-600" />
              <p className="text-sm font-medium">No leads found</p>
              <p className="text-xs text-slate-500">Applications will appear here automatically when users complete the bot flow.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Mobile No</th>
                    <th className="px-6 py-4">Location</th>
                    <th className="px-6 py-4">State</th>
                    <th className="px-6 py-4">Pin Code</th>
                    <th className="px-6 py-4">Land Size (sq.ft)</th>
                    <th className="px-6 py-4">Ownership</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Date & Time</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredLeads.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-800/40">
                      <td className="px-6 py-4 font-medium text-white">{l.name}</td>
                      <td className="px-6 py-4">{l.mobile_no}</td>
                      <td className="px-6 py-4">{l.location}</td>
                      <td className="px-6 py-4">{l.state || "-"}</td>
                      <td className="px-6 py-4">{l.pin_code || "-"}</td>
                      <td className="px-6 py-4">{l.land_size || "-"}</td>
                      <td className="px-6 py-4">{l.ownership || "-"}</td>
                      <td className="px-6 py-4">{getStatusBadge(l.status)}</td>
                      <td className="px-6 py-4 text-right text-slate-400">
                        {new Date(l.created_at).toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleSendApprovalClick(l)}
                          className="border-primary/20 hover:bg-primary hover:text-primary-foreground text-primary h-8"
                          disabled={l.status === 'Approval Sent'}
                        >
                          <Send className="w-3 h-3 mr-1" />
                          {l.status === 'Approval Sent' ? 'Sent' : 'Send Approval'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Missing Details / Confirmation Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-slate-950 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>Send Approval PDF</DialogTitle>
            <DialogDescription className="text-slate-400">
              {(!selectedLead?.name || !selectedLead?.location) 
                ? "This lead is missing some details. Please provide them to generate the PDF." 
                : "Confirm the details below before generating and sending the approval PDF."}
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
              {isSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {isSending ? "Sending..." : "Send PDF Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
