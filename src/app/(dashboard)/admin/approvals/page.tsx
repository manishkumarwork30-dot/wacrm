"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";

export default function ApprovalsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchApprovals() {
      const supabase = createClient();
      const { data } = await supabase
        .from("tower_leads")
        .select("*, contacts(phone)")
        .eq("status", "Approval Sent")
        .order("updated_at", { ascending: false });

      if (data) {
        setLeads(data);
      }
      setIsLoading(false);
    }
    fetchApprovals();
  }, []);

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Sent Approvals
          </h1>
          <p className="text-sm text-slate-400">
            Leads who have successfully received the final PDF approval document.
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
                <th className="px-4 py-3 font-medium">Sent At</th>
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
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    No approvals have been sent yet.
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
                    <td className="px-4 py-3 text-slate-400">
                      {lead.updated_at
                        ? format(new Date(lead.updated_at), "MMM d, yyyy h:mm a")
                        : "Unknown"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
