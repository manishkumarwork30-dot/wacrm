'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Loader2, RotateCcw, MessageSquare, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const DEFAULT_CONFIG = {
  is_active: true,
  use_web_form: true,
  welcome_msg: `नमस्ते 😊

क्या आपके पास खाली जमीन / प्लॉट है?

4G/5G टावर इंस्टॉलेशन के लिए आवेदन आमंत्रित हैं।

आपका स्थान हमारी सर्वेक्षण टीम द्वारा जांचा जाएगा।

📋 पंजीकरण की प्रक्रिया:

✅ पंजीकरण शुल्क: ₹2,550/-

यह शुल्क आपकी बुकिंग और भागीदारी की पुष्टि के लिए आवश्यक है

📍 यदि आपका स्थान स्वीकृत हो जाता है, तो आपको निम्नलिखित लाभ प्राप्त होंगे:

✅ अग्रिम भुगतान: ₹70,00,000/- (स्थापना से पहले)

✅ मासिक किराया: ₹60,000/-*
   (₹30,000/- सीधे आपके खाते में जमा + ₹30,000/- EMI के रूप में समायोजित)

✅ रोजगार का अवसर: 20,000/-`,
  ask_name_msg: `नमस्ते 😊\n\n4G / 5G डिजिटल टावर इंस्टॉलेशन आवेदन के लिए कृपया नीचे दी गई जानकारी एक-एक करके बताएं:\n\n1️⃣ आपका पूरा नाम (Full Name) क्या है?`,
  ask_state_msg: `2️⃣ आपकी जमीन किस राज्य (State) में है?`,
  ask_pincode_msg: `3️⃣ आपके क्षेत्र का पिन कोड (PIN Code) क्या है?`,
  end_no_land_msg: `ठीक है 🙏\n\nकोई बात नहीं। अगर भविष्य में जमीन हो या किसी और को जरूरत हो, तो हमसे जरूर संपर्क करें।\n\nमोबाइल टावर स्थापना – आपकी सेवा में सदैव तत्पर।`,
  payment_msg: `बहुत अच्छा! 🎉\n\nआपका स्थान हमारी सर्वेक्षण टीम द्वारा जांचा जाएगा।\n\n📋 पंजीकरण की प्रक्रिया:\n\n✅ पंजीकरण शुल्क: ₹2,550/-\n\nयह शुल्क आपकी बुकिंग और भागीदारी की पुष्टि के लिए आवश्यक है\n\nपंजीकरण शुल्क जमा करने के बाद ही आगे की प्रक्रिया (जैसे NOC और एग्रीमेंट) शुरू होगी। QR कोड / Payment Details आपको जल्द ही भेजी जाएंगी।\n\nकृपया थोड़ा इंतजार करें। 🙏`,
  use_template_welcome: false,
  welcome_template_name: 'tower_lead_welcome',
  welcome_template_lang: 'hi',
  approval_template_name: '',
  approval_template_lang: 'hi',
  approval_template_has_doc_header: true,
};

type ConfigKey = keyof typeof DEFAULT_CONFIG;

export function ChatbotConfig() {
  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templateId, setTemplateId] = useState<string | null>(null);
  
  // Configuration states
  const [isActive, setIsActive] = useState(true);
  const [useWebForm, setUseWebForm] = useState(true);
  const [welcomeMsg, setWelcomeMsg] = useState(DEFAULT_CONFIG.welcome_msg);
  const [askNameMsg, setAskNameMsg] = useState(DEFAULT_CONFIG.ask_name_msg);
  const [askStateMsg, setAskStateMsg] = useState(DEFAULT_CONFIG.ask_state_msg);
  const [askPinMsg, setAskPinMsg] = useState(DEFAULT_CONFIG.ask_pincode_msg);
  const [endNoLandMsg, setEndNoLandMsg] = useState(DEFAULT_CONFIG.end_no_land_msg);
  const [paymentMsg, setPaymentMsg] = useState(DEFAULT_CONFIG.payment_msg);
  
  // Template welcome states
  const [useTemplateWelcome, setUseTemplateWelcome] = useState(false);
  const [welcomeTemplateName, setWelcomeTemplateName] = useState('tower_lead_welcome');
  const [welcomeTemplateLang, setWelcomeTemplateLang] = useState('hi');

  // Fallback template states for closed 24h window
  const [approvalTemplateName, setApprovalTemplateName] = useState('');
  const [approvalTemplateLang, setApprovalTemplateLang] = useState('hi');
  const [approvalTemplateHasDocHeader, setApprovalTemplateHasDocHeader] = useState(true);
  
  // WhatsApp Flow states
  const [flowId, setFlowId] = useState('');
  const [settingUpFlow, setSettingUpFlow] = useState(false);

  const fetchConfig = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .eq('user_id', userId)
        .eq('name', '__chatbot_config')
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch chatbot config:', error);
        return;
      }

      if (data) {
        setTemplateId(data.id);
        const buttonsConfig = (data.buttons as any) || {};
        
        setIsActive(buttonsConfig.is_active !== false);
        setUseWebForm(buttonsConfig.use_web_form !== false);
        setWelcomeMsg(buttonsConfig.welcome_msg || DEFAULT_CONFIG.welcome_msg);
        setAskNameMsg(buttonsConfig.ask_name_msg || DEFAULT_CONFIG.ask_name_msg);
        setAskStateMsg(buttonsConfig.ask_state_msg || DEFAULT_CONFIG.ask_state_msg);
        setAskPinMsg(buttonsConfig.ask_pincode_msg || DEFAULT_CONFIG.ask_pincode_msg);
        setEndNoLandMsg(buttonsConfig.end_no_land_msg || DEFAULT_CONFIG.end_no_land_msg);
        setPaymentMsg(buttonsConfig.payment_msg || DEFAULT_CONFIG.payment_msg);
        setUseTemplateWelcome(buttonsConfig.use_template_welcome === true);
        setWelcomeTemplateName(buttonsConfig.welcome_template_name || 'tower_lead_welcome');
        setWelcomeTemplateLang(buttonsConfig.welcome_template_lang || 'hi');
        setApprovalTemplateName(buttonsConfig.approval_template_name || '');
        setApprovalTemplateLang(buttonsConfig.approval_template_lang || 'hi');
        setApprovalTemplateHasDocHeader(buttonsConfig.approval_template_has_doc_header !== false);
        setFlowId(buttonsConfig.flow_id || '');
      }
    } catch (err) {
      console.error('fetchConfig error:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    fetchConfig(user.id);
  }, [authLoading, user, fetchConfig]);

  async function handleSave() {
    if (!user) return;

    try {
      setSaving(true);
      const chatbotPayload = {
        is_active: isActive,
        use_web_form: useWebForm,
        welcome_msg: welcomeMsg.trim(),
        ask_name_msg: askNameMsg.trim(),
        ask_state_msg: askStateMsg.trim(),
        ask_pincode_msg: askPinMsg.trim(),
        end_no_land_msg: endNoLandMsg.trim(),
        payment_msg: paymentMsg.trim(),
        use_template_welcome: useTemplateWelcome,
        welcome_template_name: welcomeTemplateName.trim(),
        welcome_template_lang: welcomeTemplateLang.trim(),
        approval_template_name: approvalTemplateName.trim(),
        approval_template_lang: approvalTemplateLang.trim(),
        approval_template_has_doc_header: approvalTemplateHasDocHeader,
        flow_id: flowId.trim(),
      };

      if (templateId) {
        // Update
        const { error } = await supabase
          .from('message_templates')
          .update({
            buttons: chatbotPayload as any,
          })
          .eq('id', templateId);

        if (error) throw error;
      } else {
        // Insert
        const { data, error } = await supabase
          .from('message_templates')
          .insert({
            user_id: user.id,
            name: '__chatbot_config',
            category: 'Utility',
            language: 'en_US',
            body_text: 'WhatsApp Chatbot Configuration Payload',
            buttons: chatbotPayload as any,
            status: 'Approved',
          })
          .select('id')
          .maybeSingle();

        if (error) throw error;
        if (data) setTemplateId(data.id);
      }

      toast.success('Tower Chatbot configuration saved successfully');
    } catch (err) {
      console.error('Save config error:', err);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  }

  async function handleSetupFlow() {
    if (!user) return;
    try {
      setSettingUpFlow(true);
      const res = await fetch(`/api/whatsapp/flows/setup?userId=${user.id}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to setup flow');
      setFlowId(data.flow_id);
      toast.success('Flow created & published! Click Save below to apply it.');
    } catch (err: any) {
      toast.error(err.message || 'Error setting up flow');
    } finally {
      setSettingUpFlow(false);
    }
  }

  const handleResetField = (field: Exclude<ConfigKey, 'is_active' | 'use_web_form' | 'use_template_welcome'>) => {
    const value = DEFAULT_CONFIG[field] as string;
    switch (field) {
      case 'welcome_msg': setWelcomeMsg(value); break;
      case 'ask_name_msg': setAskNameMsg(value); break;
      case 'ask_state_msg': setAskStateMsg(value); break;
      case 'ask_pincode_msg': setAskPinMsg(value); break;
      case 'end_no_land_msg': setEndNoLandMsg(value); break;
      case 'payment_msg': setPaymentMsg(value); break;
    }
    toast.info('Reverted to default message');
  };

  const handleResetAll = () => {
    if (confirm('Are you sure you want to reset all messages to default Hindi?')) {
      setIsActive(DEFAULT_CONFIG.is_active);
      setUseWebForm(DEFAULT_CONFIG.use_web_form);
      setWelcomeMsg(DEFAULT_CONFIG.welcome_msg);
      setAskNameMsg(DEFAULT_CONFIG.ask_name_msg);
      setAskStateMsg(DEFAULT_CONFIG.ask_state_msg);
      setAskPinMsg(DEFAULT_CONFIG.ask_pincode_msg);
      setEndNoLandMsg(DEFAULT_CONFIG.end_no_land_msg);
      setPaymentMsg(DEFAULT_CONFIG.payment_msg);
      setUseTemplateWelcome(false);
      setWelcomeTemplateName('tower_lead_welcome');
      setWelcomeTemplateLang('hi');
      setApprovalTemplateName('');
      setApprovalTemplateLang('hi');
      setApprovalTemplateHasDocHeader(true);
      toast.success('Reset all settings to default');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const renderField = (
    label: string,
    description: string,
    value: string,
    setValue: (v: string) => void,
    fieldKey: Exclude<ConfigKey, 'is_active' | 'use_web_form' | 'use_template_welcome'>
  ) => {
    return (
      <div className="space-y-2 relative group">
        <div className="flex items-center justify-between">
          <Label className="text-slate-300 font-semibold">{label}</Label>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => handleResetField(fieldKey)}
            className="h-7 px-2 text-xs text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
            title="Reset to default Hindi text"
          >
            <RotateCcw className="size-3.5 mr-1" />
            Reset
          </Button>
        </div>
        <CardDescription className="text-slate-400 text-xs">{description}</CardDescription>
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={value.split('\n').length + 1}
          className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 resize-y focus-visible:ring-primary font-mono text-sm leading-relaxed"
        />
      </div>
    );
  };

  return (
    <div className="space-y-6 mt-4 max-w-4xl">
      {/* Bot State & Control */}
      <Card className="bg-slate-900 border-slate-700 ring-0 ring-transparent">
        <CardHeader className="border-b border-slate-800/60">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-white flex items-center gap-2">
                <MessageSquare className="size-5 text-primary" />
                Tower Chatbot Automation Status
              </CardTitle>
              <CardDescription className="text-slate-400">
                Enable or disable the automatic questionnaire flow for WhatsApp tower installation prospects.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium ${isActive ? 'text-primary' : 'text-slate-400'}`}>
                {isActive ? 'Active' : 'Disabled'}
              </span>
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Lead Capture Method */}
      <Card className="bg-slate-900 border-slate-700 ring-0 ring-transparent">
        <CardHeader className="border-b border-slate-800/60">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-white text-base">
                Lead Capture Method
              </CardTitle>
              <CardDescription className="text-slate-400">
                Choose between sending a single form link (In-App Webview Form) or asking questions one-by-one in the WhatsApp chat.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-primary">
                {useWebForm ? 'In-App Webview Form (New)' : 'Chatbot Questionnaire (Old)'}
              </span>
              <Switch
                checked={useWebForm}
                onCheckedChange={setUseWebForm}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </div>
        </CardHeader>
        
        {useWebForm && (
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between border-t border-slate-800/60 pt-4">
              <div className="space-y-1">
                <Label className="text-slate-200 font-semibold">Use Approved Meta Template</Label>
                <p className="text-slate-400 text-xs">
                  Required to force the form to open directly inside WhatsApp's native mobile pop-up/webview. Must be pre-approved in Meta Business Manager.
                </p>
              </div>
              <Switch
                checked={useTemplateWelcome}
                onCheckedChange={setUseTemplateWelcome}
                className="data-[state=checked]:bg-primary"
              />
            </div>

            {useTemplateWelcome && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800/60">
                <div className="space-y-2">
                  <Label className="text-slate-300 font-semibold text-xs">Meta Welcome Template Name</Label>
                  <input
                    type="text"
                    value={welcomeTemplateName}
                    onChange={(e) => setWelcomeTemplateName(e.target.value)}
                    placeholder="e.g. tower_lead_welcome"
                    className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-slate-900"
                  />
                  <p className="text-[10px] text-slate-500">
                    Template must have 1 URL button pointing to: <code>https://whatsapp-crm-fawn.vercel.app/apply/{"{{1}}"}</code>
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300 font-semibold text-xs">Template Language Code</Label>
                  <input
                    type="text"
                    value={welcomeTemplateLang}
                    onChange={(e) => setWelcomeTemplateLang(e.target.value)}
                    placeholder="e.g. hi (Hindi) or en (English)"
                    className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-slate-900"
                  />
                </div>
              </div>
            )}

            <div className="border-t border-slate-800/60 pt-4 space-y-4">
              <div className="space-y-1">
                <Label className="text-slate-200 font-semibold">Native WhatsApp Flow (Recommended)</Label>
                <p className="text-slate-400 text-xs">
                  Create an in-app form so users don't need to visit external links. If a Flow ID is provided, the chatbot will prioritize sending the native Flow form instead of the web link.
                </p>
              </div>
              <div className="flex gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <Label className="text-slate-300 font-semibold text-xs">Flow ID</Label>
                  <input
                    type="text"
                    value={flowId}
                    onChange={(e) => setFlowId(e.target.value)}
                    placeholder="Enter Meta WhatsApp Flow ID"
                    className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-slate-900"
                  />
                </div>
                <Button 
                  onClick={handleSetupFlow}
                  disabled={settingUpFlow}
                  variant="outline"
                  className="h-10 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  {settingUpFlow ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                  {settingUpFlow ? 'Creating...' : 'Auto-Create Flow on Meta'}
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Message Customization */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Conversation Script & Prompts</h3>
          <Button
            variant="outline"
            onClick={handleResetAll}
            className="border-slate-700 hover:bg-slate-800 hover:text-white text-slate-300"
          >
            <RotateCcw className="size-4 mr-2" />
            Reset All to Default
          </Button>
        </div>

        <div className="grid gap-6">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-base">1. Welcome Flow</CardTitle>
              <CardDescription className="text-slate-400">Initial contact checks if prospect has land.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {renderField(
                'Welcome Message & Land Question',
                'Message asking if the user has land/plot available for installation.',
                welcomeMsg,
                setWelcomeMsg,
                'welcome_msg'
              )}
              {renderField(
                'Exit Message (No Land)',
                'Message sent when user replies with "NO" to land availability.',
                endNoLandMsg,
                setEndNoLandMsg,
                'end_no_land_msg'
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-base">2. Lead Details Questionnaire</CardTitle>
              <CardDescription className="text-slate-400">Step-by-step messages asking for user data.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {renderField(
                'Step 1: Ask Name',
                'Prompts for user\'s full name.',
                askNameMsg,
                setAskNameMsg,
                'ask_name_msg'
              )}
              {renderField(
                'Step 2: Ask State',
                'Prompts for the state.',
                askStateMsg,
                setAskStateMsg,
                'ask_state_msg'
              )}
              {renderField(
                'Step 3: Ask PIN Code',
                'Prompts for the area pin code.',
                askPinMsg,
                setAskPinMsg,
                'ask_pincode_msg'
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-base">3. Payment & Final Confirmation</CardTitle>
              <CardDescription className="text-slate-400">Final proposal agreement and qualification deposit process.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {renderField(
                'Payment Process Details',
                'Instructs the user regarding the registration/booking fee deposit.',
                paymentMsg,
                setPaymentMsg,
                'payment_msg'
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-base">4. Scheduled Approval PDF & 24h Fallback Template</CardTitle>
              <CardDescription className="text-slate-400">
                Setup a fallback template to automatically deliver the approval message if the WhatsApp 24-hour customer service window closes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300 font-semibold text-xs">Meta Fallback Template Name</Label>
                  <input
                    type="text"
                    value={approvalTemplateName}
                    onChange={(e) => setApprovalTemplateName(e.target.value)}
                    placeholder="e.g. tower_approval_fallback"
                    className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-slate-900"
                  />
                  <p className="text-[10px] text-slate-500">
                    If blank, no fallback template is sent outside the 24-hour window.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300 font-semibold text-xs">Template Language Code</Label>
                  <input
                    type="text"
                    value={approvalTemplateLang}
                    onChange={(e) => setApprovalTemplateLang(e.target.value)}
                    placeholder="e.g. hi (Hindi) or en (English)"
                    className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800/60 pt-4">
                <div className="space-y-1">
                  <Label className="text-slate-200 font-semibold text-sm">Template Has Document Header</Label>
                  <p className="text-slate-400 text-xs">
                    Enable if your Meta template has a Document header. We will attach the generated Approval Letter PDF automatically.
                  </p>
                </div>
                <Switch
                  checked={approvalTemplateHasDocHeader}
                  onCheckedChange={setApprovalTemplateHasDocHeader}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end sticky bottom-6 z-10">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-6 rounded-lg shadow-lg flex items-center gap-2 border border-primary/20"
        >
          {saving ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              Saving Script Configuration...
            </>
          ) : (
            <>
              <Save className="size-5" />
              Save Tower Chatbot Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
