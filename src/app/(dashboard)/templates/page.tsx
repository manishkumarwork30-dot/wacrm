'use client';

import { TemplateManager } from '@/components/settings/template-manager';

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Templates</h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage your WhatsApp® message templates, sync from Meta, and create new drafts.
        </p>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-6">
        <TemplateManager />
      </div>
    </div>
  );
}
