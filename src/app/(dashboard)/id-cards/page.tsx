"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  CreditCard, 
  Upload, 
  Download, 
  RefreshCw, 
  Loader2, 
  Check, 
  ShieldCheck, 
  User as UserIcon,
  Phone,
  Mail,
  MapPin,
  FileText
} from "lucide-react";
import { toast } from "sonner";

// Define preset themes
const THEMES = [
  { name: "Electric Blue", value: "#0052FF", bgGradient: "from-blue-600 to-indigo-900", cardBg: "bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950/40" },
  { name: "Obsidian Gold", value: "#D4AF37", bgGradient: "from-amber-600 to-stone-900", cardBg: "bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950/20" },
  { name: "Crimson Steel", value: "#DC2626", bgGradient: "from-red-600 to-zinc-900", cardBg: "bg-gradient-to-br from-slate-900 via-slate-950 to-red-950/30" },
  { name: "Emerald Cyber", value: "#10B981", bgGradient: "from-emerald-600 to-slate-900", cardBg: "bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/20" },
  { name: "Deep Violet", value: "#8B5CF6", bgGradient: "from-violet-600 to-slate-950", cardBg: "bg-gradient-to-br from-slate-900 via-slate-950 to-violet-950/30" }
];

export default function IDCardPage() {
  // Input fields state
  const [name, setName] = useState("Ramesh Kumar");
  const [designation, setDesignation] = useState("Verification Executive");
  const [idNumber, setIdNumber] = useState("HTL-2026-0049");
  const [aadharNo, setAadharNo] = useState("1234 5678 9012");
  const [email, setEmail] = useState("ramesh.kumar@htlnetwork.com");
  const [phone, setPhone] = useState("+91 98765 43210");
  const [validUpto, setValidUpto] = useState("2031");
  const [companyName, setCompanyName] = useState("HTL NETWORK");
  const [logoUrl, setLogoUrl] = useState("https://htlnetwork.com/assets/images/logo.png");
  
  // Custom uploaded photo state (Base64)
  const [photoBase64, setPhotoBase64] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Layout & Theme states
  const [orientation, setOrientation] = useState<"vertical" | "horizontal">("vertical");
  const [selectedTheme, setSelectedTheme] = useState(THEMES[0]);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Auto-mask Aadhaar number for visual preview
  const formatAadharPreview = (val: string) => {
    const clean = val.replace(/\s/g, "");
    if (clean.length >= 4) {
      return `XXXX XXXX ${clean.substring(clean.length - 4)}`;
    }
    return "XXXX XXXX 1234";
  };

  // Image Upload handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Photo size should be less than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoBase64(reader.result as string);
      toast.success("Photo uploaded successfully!");
    };
    reader.readAsDataURL(file);
  };

  // Trigger PDF Generation
  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate-id-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          designation,
          idNumber,
          aadharNo,
          email,
          phone,
          validUpto,
          companyName,
          logoUrl,
          photoBase64,
          themeColor: selectedTheme.value,
          orientation
        })
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      // Download the PDF
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `ID_Card_${idNumber || "agent"}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      toast.success("ID Card PDF generated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong during PDF generation");
    } finally {
      setIsGenerating(false);
    }
  };

  // Custom visual barcode representation in HTML Preview
  const renderHTMLBarcode = () => {
    const bars = [];
    const seed = (idNumber || "EMPLOYEE").length;
    for (let i = 0; i < 35; i++) {
      const height = 100;
      const width = ((i * seed) % 3 === 0) ? "w-[1px]" : (((i * seed) % 5 === 0) ? "w-[3px]" : "w-[2px]");
      const spacing = (i % 4 === 0) ? "mr-[2px]" : "mr-[1px]";
      const color = (i % 7 === 0) ? "bg-transparent" : "bg-white";
      bars.push(<div key={i} className={`h-full ${width} ${spacing} ${color}`} />);
    }
    return <div className="flex h-6 justify-center items-stretch bg-transparent px-2 mt-1">{bars}</div>;
  };

  return (
    <div className="flex h-full flex-col p-6 gap-6">
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-blue-500" />
          ID Card Generator
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Create, customize, and generate professional ID cards for agents and field executives.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left Form Panel */}
        <div className="xl:col-span-7 bg-slate-900/50 backdrop-blur-md rounded-xl border border-slate-800 p-6 space-y-6">
          <h2 className="text-base font-semibold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Cardholder Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agentName" className="text-slate-300">Agent Name / Holder Name</Label>
              <Input 
                id="agentName" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Ramesh Kumar"
                className="bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="designation" className="text-slate-300">Designation</Label>
              <Input 
                id="designation" 
                value={designation} 
                onChange={(e) => setDesignation(e.target.value)} 
                placeholder="Verification Executive"
                className="bg-slate-950 border-slate-800 text-white placeholder-slate-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="idNumber" className="text-slate-300">ID / Employee Number</Label>
              <Input 
                id="idNumber" 
                value={idNumber} 
                onChange={(e) => setIdNumber(e.target.value)} 
                placeholder="HTL-2026-0049"
                className="bg-slate-950 border-slate-800 text-white placeholder-slate-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aadharNo" className="text-slate-300">Aadhaar Number</Label>
              <Input 
                id="aadharNo" 
                value={aadharNo} 
                onChange={(e) => setAadharNo(e.target.value)} 
                placeholder="1234 5678 9012"
                className="bg-slate-950 border-slate-800 text-white placeholder-slate-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email ID</Label>
              <Input 
                id="email" 
                value={email} 
                type="email"
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="agent@htlnetwork.com"
                className="bg-slate-950 border-slate-800 text-white placeholder-slate-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-300">Phone Number</Label>
              <Input 
                id="phone" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                placeholder="+91 98765 43210"
                className="bg-slate-950 border-slate-800 text-white placeholder-slate-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="validUpto" className="text-slate-300">Valid Upto</Label>
              <Input 
                id="validUpto" 
                value={validUpto} 
                onChange={(e) => setValidUpto(e.target.value)} 
                placeholder="2031"
                className="bg-slate-950 border-slate-800 text-white placeholder-slate-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-slate-300">Company Name</Label>
              <Input 
                id="companyName" 
                value={companyName} 
                onChange={(e) => setCompanyName(e.target.value)} 
                placeholder="HTL NETWORK"
                className="bg-slate-950 border-slate-800 text-white placeholder-slate-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Agent Photo</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs h-9 px-3 gap-2 flex-1"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload Photo
                </Button>
                {photoBase64 && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setPhotoBase64("")}
                    className="text-xs h-9 px-3 shrink-0"
                  >
                    Clear
                  </Button>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handlePhotoUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="logoUrl" className="text-slate-300">Company Logo URL</Label>
              <Input 
                id="logoUrl" 
                value={logoUrl} 
                onChange={(e) => setLogoUrl(e.target.value)} 
                placeholder="Logo URL"
                className="bg-slate-950 border-slate-800 text-white placeholder-slate-600"
              />
            </div>
          </div>

          {/* Configuration Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800/80">
            {/* Orientation */}
            <div className="space-y-2">
              <Label className="text-slate-300">Card Layout</Label>
              <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setOrientation("vertical")}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    orientation === "vertical"
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Vertical (Portrait)
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation("horizontal")}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    orientation === "horizontal"
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Horizontal (Landscape)
                </button>
              </div>
            </div>

            {/* Themes */}
            <div className="space-y-2">
              <Label className="text-slate-300 font-medium">Card Theme</Label>
              <div className="flex gap-2 flex-wrap">
                {THEMES.map((theme) => (
                  <button
                    key={theme.name}
                    type="button"
                    onClick={() => setSelectedTheme(theme)}
                    style={{ backgroundColor: theme.value }}
                    className={`w-6 h-6 rounded-full border-2 transition-transform duration-200 ${
                      selectedTheme.name === theme.name 
                        ? "border-white scale-125" 
                        : "border-slate-950 hover:scale-110"
                    }`}
                    title={theme.name}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="pt-3">
            <Button
              onClick={handleGeneratePDF}
              disabled={isGenerating}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium gap-2 h-11"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating ID Card PDF...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Generate & Download print-ready PDF
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right Preview Panel */}
        <div className="xl:col-span-5 flex flex-col items-center gap-6 justify-center">
          <div className="flex items-center justify-between w-full max-w-[280px]">
            <span className="text-xs font-semibold text-slate-400">LIVE PREVIEW</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFlipped(!isFlipped)}
              className="text-slate-300 hover:text-white hover:bg-slate-800/50 text-xs gap-1.5 h-8"
            >
              <RefreshCw className="h-3 w-3" />
              Flip to {isFlipped ? "Front" : "Back"}
            </Button>
          </div>

          {/* Interactive Card Container */}
          <div className="perspective-1000 w-full flex justify-center py-4">
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className={`relative cursor-pointer transition-transform duration-700 transform-style-3d ${
                orientation === "vertical" 
                  ? "w-[245px] h-[385px]" 
                  : "w-[385px] h-[245px]"
              } ${isFlipped ? "rotate-y-180" : ""}`}
            >
              {/* ───────────────────────────────────────────────────────────── */}
              {/* FRONT OF THE CARD */}
              {/* ───────────────────────────────────────────────────────────── */}
              <div 
                className={`absolute inset-0 backface-hidden rounded-xl border border-slate-800 ${selectedTheme.cardBg} flex flex-col overflow-hidden shadow-2xl transition-all duration-300`}
              >
                {/* Header Banner */}
                <div 
                  className={`flex items-center gap-2 px-3 justify-center text-white shrink-0`}
                  style={{ 
                    height: orientation === "vertical" ? "52px" : "48px",
                    backgroundColor: selectedTheme.value
                  }}
                >
                  {logoUrl && (
                    <img 
                      src={logoUrl} 
                      alt="Logo" 
                      className="h-7 w-7 object-contain bg-white/10 rounded p-[2px] shrink-0" 
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}
                  <span className="font-bold text-xs tracking-wide uppercase truncate">
                    {companyName}
                  </span>
                </div>

                {/* Body Content */}
                <div className="flex-1 flex flex-col p-4 justify-between items-center text-center">
                  {orientation === "vertical" ? (
                    /* Vertical Front Layout */
                    <>
                      {/* Picture Frame */}
                      <div className="relative mt-2">
                        <div 
                          className="w-24 h-24 rounded-full border-3 overflow-hidden flex items-center justify-center bg-slate-900 shadow-inner"
                          style={{ borderColor: selectedTheme.value }}
                        >
                          {photoBase64 ? (
                            <img src={photoBase64} alt="Agent" className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center text-slate-700">
                              <UserIcon className="w-10 h-10 text-slate-500" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Text details */}
                      <div className="space-y-1 mt-2">
                        <div className="text-sm font-bold text-white tracking-wide truncate max-w-[210px]">{name}</div>
                        <div className="text-xxs font-semibold uppercase tracking-wider" style={{ color: selectedTheme.value }}>{designation}</div>
                      </div>

                      {/* Info grid */}
                      <div className="w-full bg-slate-950/60 rounded-lg p-2 border border-slate-800/40 text-left space-y-1.5 mt-2">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-500 font-medium">ID No:</span>
                          <span className="text-slate-300 font-mono font-semibold">{idNumber}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-500 font-medium">Aadhaar:</span>
                          <span className="text-slate-300 font-mono font-semibold">{formatAadharPreview(aadharNo)}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Horizontal Front Layout */
                    <div className="flex w-full h-full gap-4 items-center justify-start text-left">
                      {/* Left: Picture Frame */}
                      <div className="relative shrink-0">
                        <div 
                          className="w-24 h-24 rounded-full border-3 overflow-hidden flex items-center justify-center bg-slate-900 shadow-inner"
                          style={{ borderColor: selectedTheme.value }}
                        >
                          {photoBase64 ? (
                            <img src={photoBase64} alt="Agent" className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center text-slate-700">
                              <UserIcon className="w-10 h-10 text-slate-500" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Text & Details */}
                      <div className="flex-1 flex flex-col justify-between py-1 h-full max-w-[220px]">
                        <div>
                          <div className="text-sm font-bold text-white tracking-wide truncate">{name}</div>
                          <div className="text-xxs font-semibold uppercase tracking-wider" style={{ color: selectedTheme.value }}>{designation}</div>
                        </div>

                        <div className="bg-slate-950/60 rounded-lg p-2 border border-slate-800/40 space-y-1">
                          <div className="flex justify-between items-center text-[9px] gap-2">
                            <span className="text-slate-500 font-medium shrink-0">ID No:</span>
                            <span className="text-slate-300 font-mono font-semibold truncate">{idNumber}</span>
                          </div>
                          <div className="flex justify-between items-center text-[9px] gap-2">
                            <span className="text-slate-500 font-medium shrink-0">Aadhaar:</span>
                            <span className="text-slate-300 font-mono font-semibold truncate">{formatAadharPreview(aadharNo)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer validity bar */}
                <div 
                  className="w-full h-6 flex justify-center items-center text-[9px] font-bold text-white shrink-0 mt-auto"
                  style={{ backgroundColor: selectedTheme.value }}
                >
                  VALID UPTO: {validUpto || "2031"}
                </div>
              </div>

              {/* ───────────────────────────────────────────────────────────── */}
              {/* BACK OF THE CARD */}
              {/* ───────────────────────────────────────────────────────────── */}
              <div 
                className={`absolute inset-0 backface-hidden rotate-y-180 rounded-xl border border-slate-800 bg-slate-950 flex flex-col overflow-hidden shadow-2xl p-3`}
              >
                {/* Mini Top colored line */}
                <div className="w-full h-[3px] rounded shrink-0 mb-2" style={{ backgroundColor: selectedTheme.value }} />

                {/* Title */}
                <div className="text-center font-bold text-[9px] tracking-widest text-slate-300 mb-2" style={{ color: selectedTheme.value }}>
                  TERMS & CONDITIONS
                </div>

                {orientation === "vertical" ? (
                  /* Vertical Back Layout */
                  <div className="flex-1 flex flex-col justify-between items-center text-[8px] text-slate-500 text-left">
                    <div className="space-y-1 font-medium leading-relaxed px-1">
                      <div>1. This card remains the property of {companyName || "the organization"}.</div>
                      <div>2. Unauthorized use or copying is strictly prohibited.</div>
                      <div>3. Return immediately to the company office if found.</div>
                    </div>

                    {/* Contact Details */}
                    <div className="w-full text-center space-y-1 bg-slate-900/40 rounded p-1.5 border border-slate-800/30">
                      <div className="flex items-center justify-center gap-1 text-[8px] text-slate-400 font-semibold truncate">
                        <Mail className="h-2.5 w-2.5 shrink-0" style={{ color: selectedTheme.value }} />
                        {email || "info@htlnetwork.com"}
                      </div>
                      <div className="flex items-center justify-center gap-1 text-[8px] text-slate-400 font-semibold">
                        <Phone className="h-2.5 w-2.5 shrink-0" style={{ color: selectedTheme.value }} />
                        {phone || "+91 99999 88888"}
                      </div>
                    </div>

                    {/* Barcode representation */}
                    <div className="w-full text-center mt-2">
                      {renderHTMLBarcode()}
                      <div className="text-[7px] font-mono text-slate-400 tracking-widest mt-0.5">{idNumber}</div>
                    </div>

                    {/* Authority Signature */}
                    <div className="w-full flex flex-col items-center mt-2 mb-1 shrink-0">
                      <div className="w-[120px] h-[0.5px] bg-slate-800" />
                      <div className="text-[7px] text-slate-600 mt-1 font-medium">Authorized Signatory</div>
                    </div>
                  </div>
                ) : (
                  /* Horizontal Back Layout */
                  <div className="flex-1 flex gap-4 justify-between items-stretch text-[8px] text-slate-500 text-left">
                    {/* Left Side: T&C and Contact */}
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div className="space-y-1 font-medium leading-relaxed">
                        <div>• Property of {companyName || "organization"}.</div>
                        <div>• Unauthorized copy is prohibited.</div>
                        <div>• If found, return to office.</div>
                      </div>

                      <div className="space-y-0.5 mt-2">
                        <div className="flex items-center gap-1 text-[7px] text-slate-400 font-semibold truncate">
                          <Mail className="h-2.5 w-2.5 shrink-0" style={{ color: selectedTheme.value }} />
                          {email}
                        </div>
                        <div className="flex items-center gap-1 text-[7px] text-slate-400 font-semibold">
                          <Phone className="h-2.5 w-2.5 shrink-0" style={{ color: selectedTheme.value }} />
                          {phone}
                        </div>
                      </div>
                    </div>

                    {/* Right Side: Barcode & Signature */}
                    <div className="w-[120px] shrink-0 flex flex-col justify-between items-center border-l border-slate-900 pl-4 py-1">
                      {/* Barcode */}
                      <div className="w-full text-center">
                        {renderHTMLBarcode()}
                        <div className="text-[7px] font-mono text-slate-400 tracking-widest mt-0.5 truncate">{idNumber}</div>
                      </div>

                      {/* Authority Signature */}
                      <div className="w-full flex flex-col items-center shrink-0">
                        <div className="w-full h-[0.5px] bg-slate-800" />
                        <div className="text-[7px] text-slate-600 mt-1 font-medium">Authorized Signatory</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mini Bottom colored line */}
                <div className="w-full h-[3px] rounded shrink-0 mt-auto" style={{ backgroundColor: selectedTheme.value }} />
              </div>
            </div>
          </div>

          {/* Quick interactive tip */}
          <div className="bg-slate-900/30 border border-slate-800/60 rounded-lg p-3 text-center max-w-[320px]">
            <p className="text-xxs text-slate-500 leading-normal">
              💡 <strong>Tip:</strong> Click on the ID Card preview or the button above to flip the card and check the contact information, terms, and barcode representation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
