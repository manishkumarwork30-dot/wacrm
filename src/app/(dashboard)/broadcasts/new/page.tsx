'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { MessageTemplate } from '@/types';
import { Step1ChooseTemplate } from '@/components/broadcasts/step1-choose-template';
import { Step2SelectAudience } from '@/components/broadcasts/step2-select-audience';
import { Step3Personalize } from '@/components/broadcasts/step3-personalize';
import { Step4ScheduleSend } from '@/components/broadcasts/step4-schedule-send';
import { StepSmsCompose } from '@/components/broadcasts/step-sms-compose';
import { useBroadcastSending } from '@/hooks/use-broadcast-sending';
import { Check, Smartphone, MessageCircle } from 'lucide-react';

export default function NewBroadcastPage() {
  const router = useRouter();
  const { createAndSendBroadcast, isProcessing, progress } = useBroadcastSending();

  const [channel, setChannel] = useState<'whatsapp' | 'sms' | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [template, setTemplate] = useState<MessageTemplate | null>(null);
  const [smsBody, setSmsBody] = useState('');
  const [audience, setAudience] = useState<{
    type: 'all' | 'tags' | 'custom_field' | 'csv';
    tagIds?: string[];
    customField?: {
      fieldId: string;
      operator: 'is' | 'is_not' | 'contains';
      value: string;
    };
    csvContacts?: { phone: string; name?: string }[];
    excludeTagIds?: string[];
  }>({ type: 'all' });
  const [variables, setVariables] = useState<
    Record<string, { type: 'static' | 'field' | 'custom_field'; value: string }>
  >({});
  const [name, setName] = useState('');

  // Define steps dynamically based on selected channel
  const steps = channel === 'sms'
    ? ([
        { label: 'Compose', key: 'compose' },
        { label: 'Audience', key: 'audience' },
        { label: 'Send', key: 'send' },
      ] as const)
    : ([
        { label: 'Template', key: 'template' },
        { label: 'Audience', key: 'audience' },
        { label: 'Personalize', key: 'personalize' },
        { label: 'Send', key: 'send' },
      ] as const);

  async function handleSend() {
    if (channel === 'whatsapp' && !template) return;
    if (channel === 'sms' && !smsBody.trim()) {
      toast.error('Write a message before sending');
      return;
    }

    try {
      const broadcastId = await createAndSendBroadcast({
        name: name.trim(),
        template: channel === 'whatsapp' ? template : null,
        audience: {
          type: audience.type,
          tagIds: audience.tagIds,
          customField: audience.customField,
          csvContacts: audience.csvContacts,
          excludeTagIds: audience.excludeTagIds,
        },
        variables: channel === 'whatsapp' ? variables : {},
        channel: channel || 'whatsapp',
        sms_body: channel === 'sms' ? smsBody : undefined,
      });
      router.push(`/broadcasts/${broadcastId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Broadcast failed';
      console.error('Broadcast failed:', err);
      toast.error(message);
    }
  }

  async function handleSaveDraft() {
    if (!name.trim()) {
      toast.error('Give the broadcast a name before saving a draft.');
      return;
    }
    if (channel === 'whatsapp' && !template) {
      toast.error('Choose a template before saving a WhatsApp draft.');
      return;
    }
    
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      toast.error('Not signed in.');
      return;
    }

    const { error } = await supabase.from('broadcasts').insert({
      user_id: user.id,
      name: name.trim(),
      channel: channel || 'whatsapp',
      sms_body: channel === 'sms' ? smsBody : null,
      template_name: channel === 'whatsapp' ? template?.name : null,
      template_language: channel === 'whatsapp' ? template?.language ?? 'en_US' : null,
      template_variables: channel === 'whatsapp' ? variables : null,
      audience_filter: {
        type: audience.type,
        tagIds: audience.tagIds,
      },
      status: 'draft',
      total_recipients: 0,
      sent_count: 0,
      delivered_count: 0,
      read_count: 0,
      replied_count: 0,
      failed_count: 0,
    });

    if (error) {
      toast.error(`Failed to save draft: ${error.message}`);
      return;
    }
    toast.success('Draft saved');
    router.push('/broadcasts');
  }

  // Render channel selection if not chosen yet
  if (channel === null) {
    return (
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white">New Broadcast</h1>
          <p className="mt-1 text-sm text-slate-400">
            Choose how you want to send your broadcast campaign.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            type="button"
            onClick={() => {
              setChannel('whatsapp');
              setCurrentStep(0);
            }}
            className="flex flex-col gap-4 text-left p-6 bg-slate-900 border border-slate-800 rounded-lg hover:border-primary/50 hover:bg-slate-850 transition-all group"
          >
            <div className="size-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:bg-primary/10 group-hover:border-primary/30 transition-all">
              <MessageCircle className="size-5 text-emerald-400 group-hover:text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-white group-hover:text-primary transition-colors">WhatsApp Broadcast</h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                Send approved Meta templates with dynamic variables to your WhatsApp contacts. Uses official WhatsApp Cloud API.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setChannel('sms');
              setCurrentStep(0);
            }}
            className="flex flex-col gap-4 text-left p-6 bg-slate-900 border border-slate-800 rounded-lg hover:border-primary/50 hover:bg-slate-850 transition-all group"
          >
            <div className="size-10 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:bg-primary/10 group-hover:border-primary/30 transition-all">
              <Smartphone className="size-5 text-blue-400 group-hover:text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-white group-hover:text-primary transition-colors">Android SMS Broadcast</h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                Compose custom messages and broadcast them for free using your Android Phone carrier network via local Gateway URL.
              </p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            New {channel === 'sms' ? 'Android SMS' : 'WhatsApp'} Broadcast
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Create and send a broadcast campaign to your contacts.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setChannel(null)}
          className="text-xs text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 bg-slate-900 px-3 py-1.5 rounded-md"
        >
          Change Channel
        </button>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;

          return (
            <div key={step.key} className="flex flex-1 items-center">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-all ${
                    isCompleted
                      ? 'bg-primary text-primary-foreground'
                      : isActive
                        ? 'border-2 border-primary bg-primary/10 text-primary'
                        : 'border border-slate-700 bg-slate-800 text-slate-500'
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                <span
                  className={`hidden text-sm font-medium sm:block ${
                    isActive ? 'text-white' : isCompleted ? 'text-primary' : 'text-slate-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`mx-3 h-px flex-1 ${
                    index < currentStep ? 'bg-primary' : 'bg-slate-800'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="relative min-h-[400px]">
        <div
          className="transition-all duration-300 ease-in-out"
          style={{
            opacity: isProcessing ? 0.6 : 1,
            pointerEvents: isProcessing ? 'none' : 'auto',
          }}
        >
          {channel === 'whatsapp' ? (
            <>
              {currentStep === 0 && (
                <Step1ChooseTemplate
                  selectedTemplate={template}
                  onSelect={setTemplate}
                  onNext={() => setCurrentStep(1)}
                  onBack={() => setChannel(null)}
                />
              )}
              {currentStep === 1 && (
                <Step2SelectAudience
                  audience={audience}
                  onUpdate={setAudience}
                  onNext={() => setCurrentStep(2)}
                  onBack={() => setCurrentStep(0)}
                />
              )}
              {currentStep === 2 && template && (
                <Step3Personalize
                  template={template}
                  variables={variables}
                  onUpdate={setVariables}
                  onNext={() => setCurrentStep(3)}
                  onBack={() => setCurrentStep(1)}
                />
              )}
              {currentStep === 3 && template && (
                <Step4ScheduleSend
                  name={name}
                  onNameChange={setName}
                  template={template}
                  audience={audience}
                  onSend={handleSend}
                  onSaveDraft={handleSaveDraft}
                  onBack={() => setCurrentStep(2)}
                  isProcessing={isProcessing}
                  progress={progress}
                  channel="whatsapp"
                />
              )}
            </>
          ) : (
            <>
              {currentStep === 0 && (
                <StepSmsCompose
                  smsBody={smsBody}
                  onBodyChange={setSmsBody}
                  onNext={() => setCurrentStep(1)}
                  onBack={() => setChannel(null)}
                />
              )}
              {currentStep === 1 && (
                <Step2SelectAudience
                  audience={audience}
                  onUpdate={setAudience}
                  onNext={() => setCurrentStep(2)}
                  onBack={() => setCurrentStep(0)}
                />
              )}
              {currentStep === 2 && (
                <Step4ScheduleSend
                  name={name}
                  onNameChange={setName}
                  audience={audience}
                  onSend={handleSend}
                  onSaveDraft={handleSaveDraft}
                  onBack={() => setCurrentStep(1)}
                  isProcessing={isProcessing}
                  progress={progress}
                  channel="sms"
                  smsBody={smsBody}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
