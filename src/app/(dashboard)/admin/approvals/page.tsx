"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2 } from "lucide-react";
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

  // Modal State for Manual Send Approval
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    async function fetchApprovals() {
      const supabase = createClient();
      const { data } = await supabase
        .from("tower_leads")
        .select("*, contacts(phone)")
        .order("updated_at", { ascending: false });

      if (data) {
        setLeads(data);
      }
      setIsLoading(false);
    }
    fetchApprovals();
  }, []);

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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, location: editLocation }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send approval');
      }
      
      toast.success("Approval PDF re-sent successfully!");
      setIsModalOpen(false);
      
      // Update local state timestamp and status
      setLeads(leads.map(l => {
        if (l.id === selectedLead.id) {
          return { ...l, name: editName, location: editLocation, status: 'Approval Sent', updated_at: new Date().toISOString() };
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
    <div className="flex h-full flex-col p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Approvals Management
          </h1>
          <p className="text-sm text-slate-400">
            Manage and send final PDF approval documents to all your leads.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-1">
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
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    Loading approvals...
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
                  <tr
                    key={lead.id}
                    className="transition-colors hover:bg-slate-800/30"
                  >
                    <td className="px-4 py-3 font-medium text-white">
                      {lead.name || "Unknown"}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      +{lead.contacts?.phone || "Unknown"}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {lead.location || "N/A"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        lead.status === 'Approval Sent' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                      }`}>
                        {lead.status === 'Approval Sent' ? 'Sent' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {lead.status === 'Approval Sent' && lead.updated_at
                        ? format(new Date(lead.updated_at), "MMM d, yyyy h:mm a")
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleSendApprovalClick(lead)}
                        className="border-primary/20 hover:bg-primary hover:text-primary-foreground text-primary h-8"
                      >
                        <Send className="w-3 h-3 mr-1" />
                        {lead.status === 'Approval Sent' ? 'Resend' : 'Send'}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Missing Details / Confirmation Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-slate-950 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>{selectedLead?.status === 'Approval Sent' ? 'Resend' : 'Send'} Approval PDF</DialogTitle>
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
              {isSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {isSending ? "Sending..." : (selectedLead?.status === 'Approval Sent' ? "Resend PDF Now" : "Send PDF Now")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
