'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { MessageSquare, ArrowRight, ArrowLeft, Loader2, Sparkles, User, Mail, Building, Phone } from 'lucide-react';
import { toast } from 'sonner';

interface CustomField {
  id: string;
  field_name: string;
}

interface StepSmsComposeProps {
  smsBody: string;
  onBodyChange: (body: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepSmsCompose({ smsBody, onBodyChange, onNext, onBack }: StepSmsComposeProps) {
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loadingCustomFields, setLoadingCustomFields] = useState(false);

  useEffect(() => {
    async function fetchCustomFields() {
      setLoadingCustomFields(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('custom_fields')
          .select('id, field_name')
          .order('field_name');

        if (error) throw error;
        setCustomFields(data || []);
      } catch (err) {
        console.error('Error fetching custom fields:', err);
      } finally {
        setLoadingCustomFields(false);
      }
    }

    fetchCustomFields();
  }, []);

  const insertVariable = (variable: string) => {
    onBodyChange(smsBody + `{{${variable}}}`);
  };

  // Calculate length and segments
  // Standard SMS has 160 characters per segment.
  // If unicode characters are present (which we can assume might happen but let's stick to standard 160 count for simplicity, or 70 for unicode).
  const charCount = smsBody.length;
  const isUnicode = /[^\x00-\x7F]/.test(smsBody);
  const segmentLimit = isUnicode ? 70 : 160;
  const segments = charCount === 0 ? 0 : Math.ceil(charCount / segmentLimit);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-6">
      <div className="flex items-center gap-2 border-b border-slate-850 pb-4">
        <MessageSquare className="size-5 text-primary" />
        <h2 className="text-lg font-semibold text-white">Compose SMS Message</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="sms-body" className="block text-sm font-medium text-slate-350 mb-2">
            Message Content
          </label>
          <textarea
            id="sms-body"
            rows={6}
            value={smsBody}
            onChange={(e) => onBodyChange(e.target.value)}
            placeholder="Type your SMS message here. Use double curly braces for placeholders, e.g. Hello {{name}}!"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm resize-y"
          />
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
            <span>
              Characters: <b className="text-white">{charCount}</b> {isUnicode && <span className="text-blue-400 font-medium">(Unicode)</span>}
            </span>
            <span>
              Segments: <b className={charCount > segmentLimit ? "text-amber-400" : "text-white"}>{segments}</b> ({segmentLimit} chars/segment)
            </span>
          </div>
        </div>

        {/* Dynamic variables selection */}
        <div className="space-y-3">
          <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Insert Placeholders
          </span>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => insertVariable('name')}
              className="border-slate-800 hover:bg-slate-800 text-xs gap-1.5"
            >
              <User className="size-3" />
              Name
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => insertVariable('phone')}
              className="border-slate-800 hover:bg-slate-800 text-xs gap-1.5"
            >
              <Phone className="size-3" />
              Phone
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => insertVariable('email')}
              className="border-slate-800 hover:bg-slate-800 text-xs gap-1.5"
            >
              <Mail className="size-3" />
              Email
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => insertVariable('company')}
              className="border-slate-800 hover:bg-slate-800 text-xs gap-1.5"
            >
              <Building className="size-3" />
              Company
            </Button>
          </div>

          {customFields.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-850">
              <span className="block text-xs text-slate-400">Custom Fields</span>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-1">
                {customFields.map((cf) => (
                  <Button
                    key={cf.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => insertVariable(cf.field_name)}
                    className="border-slate-800 hover:bg-slate-800 text-xs text-primary/80 gap-1.5"
                  >
                    <Sparkles className="size-3" />
                    {cf.field_name}
                  </Button>
                ))}
              </div>
            </div>
          )}
          
          {loadingCustomFields && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Loader2 className="size-3 animate-spin" />
              Loading custom fields...
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-850 pt-4 mt-6">
        <Button type="button" variant="ghost" onClick={onBack} className="text-slate-400 hover:text-white">
          <ArrowLeft className="size-4 mr-2" />
          Back
        </Button>
        <Button
          type="button"
          onClick={() => {
            if (!smsBody.trim()) {
              toast.error('Write a message before proceeding');
              return;
            }
            onNext();
          }}
          className="bg-primary text-slate-950 hover:bg-primary/90"
        >
          Next
          <ArrowRight className="size-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
