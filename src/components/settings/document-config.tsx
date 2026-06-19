'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Loader2, RotateCcw, FileText, Save, RefreshCw, HelpCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const DEFAULT_DOC_CONFIG = {
  companyName: 'HTL NETWORK',
  companyAddress: 'HTL NETWORK PVT. LTD. B/67, MALLESWARAM ROAD, 4th PHASE, MALLESWARAM INDUSTRIAL AREA, BANGALORE - 560003 INDIA',
  approvalLetterTitle: 'LETTER OF APPROVAL',
  paragraph1: `HTL NETWORK PVT. LTD. is looking for tower location across different state in India. We are very glad to inform that VI 5G NETWORK has agreed to install its NETWORK Tower with the given referenceDDD/KG/1044J/05G on the land referred by you. On the basis of your documents and suitability of your land space, the issue to be held. The agreement period is for 20 years and can be extend for further 15 years, if both parties agreed. In case of expanding of tower maturity period, the term and condition will be according to policies of the company in the financial year and laws of the government. After issued of your License certificate, our company will provide you a sum of Rs. 70 lacs as advance and rent of first month. During the agreement period the sum of Rs.60,000/-per month will be allocated for as rent with an increment of 10% per year (Out of rent allotted, 30,000 will be credited to your account and rest 30,000 will be deducted as EMI on 70 lacs Advance so that amount will be recovered within 20 years agreement's time period) and Rs. 22000/- as salary for security Guard. All the rule and regulation will be governed by companies ACT 1956 in case of any legal procedure.`,
  paragraph2: `You need to deposit Agreement fee of Rs.2550/-in our ADVOCATE Bank account through NEFT/RTGS/IMPS/TRANSFER. That will be refunded to you along with your first payment given by the company with 2% interest on it.`,
  paragraph3: `You should fulfill the minimum requirement of land referred by you for installation of tower that is 225 sq.ft land must be owned by the applicant and lease land will not be considered.`,
  paragraph4: `Once the deal begins and the tower gets installed on your land, the scheme cannot be terminated before maturity period of 20 years. Delay may terminate the deal and the whole issue gets condemned.`,
  
  advanceAmount: 'Rs. 70 lacs',
  monthlyRent: 'Rs.60,000/-',
  guardSalary: 'Rs. 22000/-',
  agreementFee: 'Rs.2550/-',
  interestRate: '2%',
  agreementPeriod: '20 years',
  incrementPercent: '10%',
  
  surveyLocationId: 'LOCATION - ID - VI / 5G 0001',
  surveyReportText: 'THE SURVEY DEPARTMENT OF INDIA CONDUCTED SURVEY FOR THE TOWER INSTALLATION SURVEY REPORT IS POSITIVE WITH THE LAND PROPOSED BY YOU NOW VI 5G NETWORK HAS BEEN ALLOWED FOR FURTHER PROCESS NOW VI 5G NETWORK IS ALLOWED TO INSTALL TOWER AT GIVEN ABOVE ADDRESS THE SURVEY REPORT IS LIMITED AND CONFIDENTIAL.',
  
  logoUrl: 'https://htlnetwork.com/assets/images/logo.png',
  qrUrl: 'https://i.ibb.co/Hfydd1wF/qrcode-361081771-9939f3ef116f18267f831b63d7b2e76d.png',
  signatureUrl: 'https://i.ibb.co/Fqj8CGm3/signature.png',
  stampUrl: 'https://i.ibb.co/v6cQ2rDC/approval-image.png',
  watermarkUrl: 'https://i.ibb.co/PZKK8CZ4/Survey-Of-India.png',
  hdrP2P3Url: 'https://i.ibb.co/hJpwPfZd/Picture3.png',
  hdrP4Url: 'https://i.ibb.co/hJpwPfZd/Picture3.png',
  p3img1Url: 'https://i.ibb.co/b0wmpr0/Picture7.png',
  p3img2Url: 'https://i.ibb.co/CpYqYxP0/Picture8.png',
  p4img1Url: 'https://i.ibb.co/Xrfg6kYb/Picture9.png',
  p4img2Url: 'https://i.ibb.co/YBkM6RZq/Picture10.png',
};

type DocConfigType = typeof DEFAULT_DOC_CONFIG;

export function DocumentConfig() {
  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templateId, setTemplateId] = useState<string | null>(null);
  
  // Doc Config State
  const [config, setConfig] = useState<DocConfigType>(DEFAULT_DOC_CONFIG);
  
  // Preview State
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchConfig = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .eq('user_id', userId)
        .eq('name', '__document_config')
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch document config:', error);
        return;
      }

      if (data) {
        setTemplateId(data.id);
        const savedConfig = (data.buttons as any) || {};
        setConfig({
          ...DEFAULT_DOC_CONFIG,
          ...savedConfig
        });
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

  // Clean up preview object URLs
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const updatePreview = useCallback(async (currentConfig: DocConfigType) => {
    try {
      setPreviewLoading(true);
      const res = await fetch('/api/admin/document-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: currentConfig }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } else {
        const errJson = await res.json();
        console.error('Preview error details:', errJson);
        toast.error('Failed to update PDF preview');
      }
    } catch (err) {
      console.error('Failed to load preview:', err);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  // Update preview once config is loaded
  useEffect(() => {
    if (!loading && user) {
      updatePreview(config);
    }
  }, [loading, user]); // eslint-disable-next-line react-hooks/exhaustive-deps

  const handleFieldChange = (key: keyof DocConfigType, value: string) => {
    setConfig((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  async function handleSave() {
    if (!user) return;

    try {
      setSaving(true);
      if (templateId) {
        const { error } = await supabase
          .from('message_templates')
          .update({
            buttons: config as any,
            updated_at: new Date().toISOString(),
          })
          .eq('id', templateId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('message_templates')
          .insert({
            user_id: user.id,
            name: '__document_config',
            category: 'Utility',
            language: 'en_US',
            body_text: 'Approval PDF Generator Config Payload',
            buttons: config as any,
            status: 'Approved',
          })
          .select('id')
          .maybeSingle();

        if (error) throw error;
        if (data) setTemplateId(data.id);
      }

      toast.success('Document template settings saved successfully');
      // Refresh preview with saved config
      updatePreview(config);
    } catch (err) {
      console.error('Save config error:', err);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  }

  const handleResetField = (key: keyof DocConfigType) => {
    handleFieldChange(key, DEFAULT_DOC_CONFIG[key]);
    toast.info('Reverted field to default');
  };

  const handleResetAll = () => {
    if (confirm('Are you sure you want to reset all document fields to their defaults?')) {
      setConfig(DEFAULT_DOC_CONFIG);
      updatePreview(DEFAULT_DOC_CONFIG);
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4 items-start">
      {/* Configuration Form */}
      <div className="space-y-6">
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="border-b border-slate-800/60 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2 text-lg">
                <FileText className="size-5 text-primary" />
                Approval Document Settings
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetAll}
                className="border-slate-700 hover:bg-slate-800 text-slate-300 h-8"
              >
                <RotateCcw className="size-3.5 mr-2" />
                Reset All
              </Button>
            </div>
            <CardDescription className="text-slate-400 text-xs mt-1.5">
              Customize the look, header, variables, and paragraph texts of your Congratulations/Approval PDF letter.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Tabs defaultValue="header" className="w-full">
              <TabsList className="bg-slate-950 border border-slate-800 w-full justify-start overflow-x-auto">
                <TabsTrigger value="header" className="text-xs">Company Details</TabsTrigger>
                <TabsTrigger value="financials" className="text-xs">Financial Rules</TabsTrigger>
                <TabsTrigger value="paragraphs" className="text-xs">Approval Text</TabsTrigger>
                <TabsTrigger value="assets" className="text-xs">Asset URLs</TabsTrigger>
              </TabsList>

              {/* Tab 1: Company Details */}
              <TabsContent value="header" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="companyName" className="text-slate-300 font-medium">Company Name</Label>
                    <button type="button" onClick={() => handleResetField('companyName')} className="text-slate-500 hover:text-white text-xs">Reset</button>
                  </div>
                  <Input
                    id="companyName"
                    value={config.companyName}
                    onChange={(e) => handleFieldChange('companyName', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="approvalLetterTitle" className="text-slate-300 font-medium">Document Title</Label>
                    <button type="button" onClick={() => handleResetField('approvalLetterTitle')} className="text-slate-500 hover:text-white text-xs">Reset</button>
                  </div>
                  <Input
                    id="approvalLetterTitle"
                    value={config.approvalLetterTitle}
                    onChange={(e) => handleFieldChange('approvalLetterTitle', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="companyAddress" className="text-slate-300 font-medium">Footer Address / Registry</Label>
                    <button type="button" onClick={() => handleResetField('companyAddress')} className="text-slate-500 hover:text-white text-xs">Reset</button>
                  </div>
                  <Textarea
                    id="companyAddress"
                    value={config.companyAddress}
                    onChange={(e) => handleFieldChange('companyAddress', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                    rows={3}
                  />
                </div>
              </TabsContent>

              {/* Tab 2: Financial Rules */}
              <TabsContent value="financials" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="advanceAmount" className="text-slate-300 text-xs">Advance Amount</Label>
                    <Input
                      id="advanceAmount"
                      value={config.advanceAmount}
                      onChange={(e) => handleFieldChange('advanceAmount', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="monthlyRent" className="text-slate-300 text-xs">Monthly Rent</Label>
                    <Input
                      id="monthlyRent"
                      value={config.monthlyRent}
                      onChange={(e) => handleFieldChange('monthlyRent', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guardSalary" className="text-slate-300 text-xs">Guard Salary</Label>
                    <Input
                      id="guardSalary"
                      value={config.guardSalary}
                      onChange={(e) => handleFieldChange('guardSalary', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agreementFee" className="text-slate-300 text-xs">Agreement Fee</Label>
                    <Input
                      id="agreementFee"
                      value={config.agreementFee}
                      onChange={(e) => handleFieldChange('agreementFee', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="interestRate" className="text-slate-300 text-xs">Fee Refund Interest %</Label>
                    <Input
                      id="interestRate"
                      value={config.interestRate}
                      onChange={(e) => handleFieldChange('interestRate', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agreementPeriod" className="text-slate-300 text-xs">Agreement Period</Label>
                    <Input
                      id="agreementPeriod"
                      value={config.agreementPeriod}
                      onChange={(e) => handleFieldChange('agreementPeriod', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white h-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="incrementPercent" className="text-slate-300 text-xs">Yearly Increment %</Label>
                  <Input
                    id="incrementPercent"
                    value={config.incrementPercent}
                    onChange={(e) => handleFieldChange('incrementPercent', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white h-9"
                  />
                </div>
              </TabsContent>

              {/* Tab 3: Approval Text / Paragraphs */}
              <TabsContent value="paragraphs" className="space-y-4 pt-4">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="font-semibold text-slate-200 flex items-center gap-1">
                    <HelpCircle className="size-3 text-primary" /> Supported Variables:
                  </div>
                  <p>Inject dynamic lead details using double brackets:</p>
                  <div className="flex flex-wrap gap-1 mt-1 font-mono text-slate-300">
                    <span className="bg-slate-900 px-1 border border-slate-800">{"{{name}}"}</span>
                    <span className="bg-slate-900 px-1 border border-slate-800">{"{{location}}"}</span>
                    <span className="bg-slate-900 px-1 border border-slate-800">{"{{mobile_no}}"}</span>
                    <span className="bg-slate-900 px-1 border border-slate-800">{"{{state}}"}</span>
                    <span className="bg-slate-900 px-1 border border-slate-800">{"{{pin_code}}"}</span>
                    <span className="bg-slate-900 px-1 border border-slate-800">{"{{land_size}}"}</span>
                    <span className="bg-slate-900 px-1 border border-slate-800">{"{{ownership}}"}</span>
                    <span className="bg-slate-900 px-1 border border-slate-800">{"{{date}}"}</span>
                    <span className="bg-slate-900 px-1 border border-slate-800">{"{{monthlyRent}}"}</span>
                    <span className="bg-slate-900 px-1 border border-slate-800">{"{{advanceAmount}}"}</span>
                    <span className="bg-slate-900 px-1 border border-slate-800">{"{{guardSalary}}"}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="paragraph1" className="text-slate-300 font-medium text-xs">Paragraph 1 (Main Offer Details)</Label>
                    <button type="button" onClick={() => handleResetField('paragraph1')} className="text-slate-500 hover:text-white text-xs">Reset</button>
                  </div>
                  <Textarea
                    id="paragraph1"
                    value={config.paragraph1}
                    onChange={(e) => handleFieldChange('paragraph1', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white font-mono text-xs"
                    rows={6}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="paragraph2" className="text-slate-300 font-medium text-xs">Paragraph 2 (Agreement Fees details)</Label>
                    <button type="button" onClick={() => handleResetField('paragraph2')} className="text-slate-500 hover:text-white text-xs">Reset</button>
                  </div>
                  <Textarea
                    id="paragraph2"
                    value={config.paragraph2}
                    onChange={(e) => handleFieldChange('paragraph2', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white font-mono text-xs"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="paragraph3" className="text-slate-300 font-medium text-xs">Paragraph 3 (Land Requirements)</Label>
                    <button type="button" onClick={() => handleResetField('paragraph3')} className="text-slate-500 hover:text-white text-xs">Reset</button>
                  </div>
                  <Textarea
                    id="paragraph3"
                    value={config.paragraph3}
                    onChange={(e) => handleFieldChange('paragraph3', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white font-mono text-xs"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="paragraph4" className="text-slate-300 font-medium text-xs">Paragraph 4 (Termination Terms)</Label>
                    <button type="button" onClick={() => handleResetField('paragraph4')} className="text-slate-500 hover:text-white text-xs">Reset</button>
                  </div>
                  <Textarea
                    id="paragraph4"
                    value={config.paragraph4}
                    onChange={(e) => handleFieldChange('paragraph4', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white font-mono text-xs"
                    rows={3}
                  />
                </div>

                <div className="border-t border-slate-800 my-4 pt-4" />

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="surveyReportText" className="text-slate-300 font-medium text-xs">Page 2 Survey Report Statement</Label>
                    <button type="button" onClick={() => handleResetField('surveyReportText')} className="text-slate-500 hover:text-white text-xs">Reset</button>
                  </div>
                  <Textarea
                    id="surveyReportText"
                    value={config.surveyReportText}
                    onChange={(e) => handleFieldChange('surveyReportText', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white font-mono text-xs"
                    rows={4}
                  />
                </div>
              </TabsContent>

              {/* Tab 4: Assets (Images/Maps URLs) */}
              <TabsContent value="assets" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="logoUrl" className="text-slate-300 text-xs">Company Logo PNG URL</Label>
                  <Input
                    id="logoUrl"
                    value={config.logoUrl}
                    onChange={(e) => handleFieldChange('logoUrl', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signatureUrl" className="text-slate-300 text-xs">Signature Image PNG URL</Label>
                  <Input
                    id="signatureUrl"
                    value={config.signatureUrl}
                    onChange={(e) => handleFieldChange('signatureUrl', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stampUrl" className="text-slate-300 text-xs">Stamp Image PNG URL</Label>
                  <Input
                    id="stampUrl"
                    value={config.stampUrl}
                    onChange={(e) => handleFieldChange('stampUrl', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="watermarkUrl" className="text-slate-300 text-xs">Watermark PNG URL (Page Center)</Label>
                  <Input
                    id="watermarkUrl"
                    value={config.watermarkUrl}
                    onChange={(e) => handleFieldChange('watermarkUrl', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white text-xs"
                  />
                </div>
                
                <div className="border-t border-slate-800 my-4 pt-2" />
                <h4 className="text-xs font-semibold text-slate-300 mb-2">Page 3 & 4 Survey Maps URLs</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="p3img1Url" className="text-slate-400 text-[10px]">Page 3 Image 1 (Signal Strength)</Label>
                    <Input
                      id="p3img1Url"
                      value={config.p3img1Url}
                      onChange={(e) => handleFieldChange('p3img1Url', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="p3img2Url" className="text-slate-400 text-[10px]">Page 3 Image 2 (Frequency)</Label>
                    <Input
                      id="p3img2Url"
                      value={config.p3img2Url}
                      onChange={(e) => handleFieldChange('p3img2Url', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="p4img1Url" className="text-slate-400 text-[10px]">Page 4 Image 1 (Coverage 1)</Label>
                    <Input
                      id="p4img1Url"
                      value={config.p4img1Url}
                      onChange={(e) => handleFieldChange('p4img1Url', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="p4img2Url" className="text-slate-400 text-[10px]">Page 4 Image 2 (Coverage 2)</Label>
                    <Input
                      id="p4img2Url"
                      value={config.p4img2Url}
                      onChange={(e) => handleFieldChange('p4img2Url', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white text-xs h-9"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex gap-4">
          <Button
            onClick={() => updatePreview(config)}
            disabled={previewLoading}
            variant="outline"
            className="border-slate-700 text-slate-300 flex-1 py-5"
          >
            {previewLoading ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="size-4 mr-2" />
            )}
            Update Preview
          </Button>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex-1 py-5"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <Save className="size-4 mr-2" />
            )}
            Save Template
          </Button>
        </div>
      </div>

      {/* Live PDF Preview Panel */}
      <Card className="bg-slate-900 border-slate-700 h-[680px] flex flex-col sticky top-6">
        <CardHeader className="border-b border-slate-800/60 pb-3 flex flex-row items-center justify-between shrink-0">
          <div>
            <CardTitle className="text-white text-base">Live Document Preview</CardTitle>
            <CardDescription className="text-slate-400 text-xs">Interactive real-time PDF representation</CardDescription>
          </div>
          {previewLoading && (
            <span className="text-[11px] text-primary animate-pulse bg-primary/10 px-2 py-0.5 rounded border border-primary/20 flex items-center gap-1.5">
              <Loader2 className="size-3 animate-spin" /> Rendering...
            </span>
          )}
        </CardHeader>
        <CardContent className="flex-1 p-0 relative overflow-hidden bg-slate-950">
          {previewUrl ? (
            <iframe
              src={previewUrl}
              className="w-full h-full border-0 bg-white"
              title="PDF Template Preview"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-3">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-xs">Generating PDF Preview...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
