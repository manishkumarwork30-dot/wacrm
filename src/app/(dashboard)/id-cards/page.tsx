"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  CreditCard, 
  Upload, 
  Download, 
  RefreshCw, 
  Loader2, 
  ShieldCheck, 
  User as UserIcon,
  Phone,
  Mail
} from "lucide-react";
import { toast } from "sonner";

// Define themes
const THEMES = [
  { name: "Classic Navy", value: "#113f67", textClass: "text-[#113f67]", borderClass: "border-[#113f67]" },
  { name: "Electric Blue", value: "#0052FF", textClass: "text-[#0052FF]", borderClass: "border-[#0052FF]" },
  { name: "Crimson Red", value: "#dc2626", textClass: "text-[#dc2626]", borderClass: "border-[#dc2626]" },
  { name: "Forest Green", value: "#059669", textClass: "text-[#059669]", borderClass: "border-[#059669]" },
  { name: "Cyber Purple", value: "#7c3aed", textClass: "text-[#7c3aed]", borderClass: "border-[#7c3aed]" }
];

export default function IDCardPage() {
  // Input fields state (Pre-filled with user screenshot data)
  const [name, setName] = useState("ANJU");
  const [designation, setDesignation] = useState("SERVICE PROVIDER");
  const [idNumber, setIdNumber] = useState("761788");
  const [aadharNo, setAadharNo] = useState("XXXX XXXX 0638");
  const [email, setEmail] = useState("HTLLIMITED.COM");
  const [phone, setPhone] = useState("9990035764");
  const [validUpto, setValidUpto] = useState("31 MARCH 2031");
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

  // Mask Aadhaar number logic
  const formatAadharPreview = (val: string) => {
    const clean = val.replace(/\s/g, "");
    if (clean.length >= 4) {
      return `XXXX XXXX ${clean.substring(clean.length - 4)}`;
    }
    return "XXXX XXXX 0638";
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
    for (let i = 0; i < 45; i++) {
      const width = ((i * seed) % 3 === 0) ? "w-[1px]" : (((i * seed) % 5 === 0) ? "w-[3px]" : "w-[2px]");
      const spacing = (i % 4 === 0) ? "mr-[2px]" : "mr-[1px]";
      const color = (i % 7 === 0) ? "bg-transparent" : "bg-black";
      bars.push(<div key={i} className={`h-full ${width} ${spacing} ${color}`} />);
    }
    return <div className="flex h-7 justify-center items-stretch bg-transparent px-2 mt-1">{bars}</div>;
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
          Create, customize, and generate professional ID cards matching the official layout.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form Panel */}
        <div className="lg:col-span-6 xl:col-span-7 bg-slate-900/50 backdrop-blur-md rounded-xl border border-slate-800 p-6 space-y-6">
          <h2 className="text-base font-semibold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Cardholder Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agentName" className="text-slate-300">Agent Name</Label>
              <Input 
                id="agentName" 
                value={name} 
                onChange={(e) => setName(e.target.value.toUpperCase())} 
                placeholder="ANJU"
                className="bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="designation" className="text-slate-300">Designation</Label>
              <Input 
                id="designation" 
                value={designation} 
                onChange={(e) => setDesignation(e.target.value.toUpperCase())} 
                placeholder="SERVICE PROVIDER"
                className="bg-slate-950 border-slate-800 text-white placeholder-slate-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="idNumber" className="text-slate-300">ID Number</Label>
              <Input 
                id="idNumber" 
                value={idNumber} 
                onChange={(e) => setIdNumber(e.target.value)} 
                placeholder="761788"
                className="bg-slate-950 border-slate-800 text-white placeholder-slate-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aadharNo" className="text-slate-300">Aadhaar Number</Label>
              <Input 
                id="aadharNo" 
                value={aadharNo} 
                onChange={(e) => setAadharNo(e.target.value)} 
                placeholder="XXXX XXXX 0638"
                className="bg-slate-950 border-slate-800 text-white placeholder-slate-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email ID</Label>
              <Input 
                id="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value.toUpperCase())} 
                placeholder="HTLLIMITED.COM"
                className="bg-slate-950 border-slate-800 text-white placeholder-slate-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-300">Phone Number</Label>
              <Input 
                id="phone" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                placeholder="9990035764"
                className="bg-slate-950 border-slate-800 text-white placeholder-slate-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="validUpto" className="text-slate-300">Valid Upto</Label>
              <Input 
                id="validUpto" 
                value={validUpto} 
                onChange={(e) => setValidUpto(e.target.value.toUpperCase())} 
                placeholder="31 MARCH 2031"
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
                  Vertical
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
                  Horizontal
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 font-medium">Card Theme Color</Label>
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
        <div className="lg:col-span-6 xl:col-span-5 flex flex-col items-center gap-6 justify-center">
          <div className="flex items-center justify-between w-full max-w-[280px]">
            <span className="text-xs font-semibold text-slate-400">LIVE PREVIEW</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFlipped(!isFlipped)}
              className="text-slate-300 hover:text-white hover:bg-slate-800/50 text-xs gap-1.5 h-8"
            >
              <RefreshCw className="h-3 w-3" />
              Flip to {isFlipped ? "Back" : "Front"}
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
              {/* FRONT SIDE (Exact screenshot matching) */}
              <div 
                className={`absolute inset-0 backface-hidden rounded-xl border border-slate-200 bg-white flex flex-col overflow-hidden shadow-2xl text-black`}
              >
                {/* Header: Logo top left, Title centered */}
                <div className="relative w-full px-4 pt-3 pb-1 shrink-0 flex items-center justify-between">
                  {logoUrl ? (
                    <img 
                      src={logoUrl} 
                      alt="Logo" 
                      className="h-6 object-contain self-start mt-0.5" 
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-10" />
                  )}
                  <span className="text-xxs font-extrabold tracking-widest text-slate-400 uppercase">OFFICIAL</span>
                </div>

                <div className="text-center font-extrabold text-sm tracking-wide -mt-1" style={{ color: selectedTheme.value }}>
                  {companyName.toUpperCase()}
                </div>

                {/* Profile Photo */}
                <div className="flex-1 flex flex-col p-3 justify-start items-center text-center space-y-2">
                  {orientation === "vertical" ? (
                    <>
                      {/* Photo frame */}
                      <div 
                        className="w-[90px] h-[90px] rounded-lg border-4 overflow-hidden flex items-center justify-center bg-slate-100 shadow-md"
                        style={{ borderColor: selectedTheme.value }}
                      >
                        {photoBase64 ? (
                          <img src={photoBase64} alt="Agent" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center text-slate-400">
                            <UserIcon className="w-12 h-12" />
                          </div>
                        )}
                      </div>

                      {/* Name */}
                      <div className="text-sm font-extrabold tracking-wide uppercase mt-1" style={{ color: selectedTheme.value }}>
                        {name}
                      </div>

                      {/* Aadhar */}
                      <div className="text-[9px] font-extrabold text-black tracking-wide -mt-1 uppercase">
                        AADHAR NO - {formatAadharPreview(aadharNo)}
                      </div>

                      {/* Designation */}
                      <div className="text-xs font-black tracking-wider uppercase" style={{ color: selectedTheme.value }}>
                        {designation}
                      </div>

                      {/* Info details */}
                      <div className="text-[9.5px] font-black text-black space-y-0.5 tracking-wide">
                        <div>ID NO :- {idNumber}</div>
                        <div>PHONE NO :- {phone}</div>
                        <div>E-MAIL :- {email}</div>
                      </div>

                      {/* Barcode preview */}
                      <div className="w-[180px] h-8 mt-1 shrink-0">
                        {renderHTMLBarcode()}
                      </div>

                      {/* Validity */}
                      <div className="text-[9px] font-extrabold text-black tracking-wide uppercase mt-1">
                        VALID UPTO :- {validUpto}
                      </div>
                    </>
                  ) : (
                    /* Horizontal Preview */
                    <div className="flex w-full h-full gap-4 items-center justify-start text-left">
                      {/* Left: Photo Frame */}
                      <div 
                        className="w-[90px] h-[90px] rounded-lg border-4 overflow-hidden flex items-center justify-center bg-slate-100 shadow-md shrink-0"
                        style={{ borderColor: selectedTheme.value }}
                      >
                        {photoBase64 ? (
                          <img src={photoBase64} alt="Agent" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center text-slate-400">
                            <UserIcon className="w-12 h-12" />
                          </div>
                        )}
                      </div>

                      {/* Right: Details */}
                      <div className="flex-1 flex flex-col justify-between py-0.5 h-full max-w-[240px]">
                        <div>
                          <div className="text-sm font-extrabold tracking-wide uppercase" style={{ color: selectedTheme.value }}>{name}</div>
                          <div className="text-[9px] font-extrabold text-black uppercase -mt-0.5">AADHAR NO - {formatAadharPreview(aadharNo)}</div>
                          <div className="text-xxs font-black tracking-wider uppercase mt-0.5" style={{ color: selectedTheme.value }}>{designation}</div>
                        </div>

                        <div className="text-[8.5px] font-black text-black space-y-0.5 leading-tight">
                          <div>ID NO :- {idNumber}</div>
                          <div>PHONE NO :- {phone}</div>
                          <div>E-MAIL :- {email}</div>
                        </div>

                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-[100px] h-6 shrink-0">{renderHTMLBarcode()}</div>
                          <div className="text-[7.5px] font-extrabold text-black uppercase">VALID UPTO :- {validUpto}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Double bottom wavy curves (matching image) */}
                <div className="relative w-full h-8 overflow-hidden mt-auto shrink-0 bg-transparent">
                  {/* Curve 1 */}
                  <svg className="absolute bottom-0 left-0 w-full h-full translate-y-[2px]" viewBox="0 0 245 32" preserveAspectRatio="none">
                    <path d="M 0 16 Q 100 2 245 18 L 245 32 L 0 32 Z" fill="#1e40af" />
                  </svg>
                  {/* Curve 2 */}
                  <svg className="absolute bottom-0 left-0 w-full h-full translate-y-[2px]" viewBox="0 0 245 32" preserveAspectRatio="none">
                    <path d="M 0 24 Q 110 8 245 22 L 245 32 L 0 32 Z" fill="#3b82f6" />
                  </svg>
                </div>
              </div>

              {/* BACK SIDE */}
              <div 
                className={`absolute inset-0 backface-hidden rotate-y-180 rounded-xl border border-slate-800 bg-slate-950 flex flex-col overflow-hidden shadow-2xl p-4 text-white`}
              >
                <div className="w-full h-[3px] rounded shrink-0 mb-3" style={{ backgroundColor: selectedTheme.value }} />

                <div className="text-center font-extrabold text-[10px] tracking-wider mb-2" style={{ color: selectedTheme.value }}>
                  TERMS & CONDITIONS
                </div>

                {orientation === "vertical" ? (
                  <div className="flex-1 flex flex-col justify-between items-center text-[8.5px] text-slate-400 text-left">
                    <div className="space-y-1.5 font-medium leading-relaxed px-1">
                      <div>1. This card is non-transferable and remains the property of {companyName}.</div>
                      <div>2. Any unauthorized use or copying is prohibited.</div>
                      <div>3. Return immediately to the company office if found.</div>
                    </div>

                    <div className="w-full text-center space-y-1 bg-slate-900/40 rounded p-2 border border-slate-800/30">
                      <div className="text-[8px] text-slate-300 font-semibold truncate">
                        Email: {email}
                      </div>
                      <div className="text-[8px] text-slate-300 font-semibold">
                        Phone: {phone}
                      </div>
                    </div>

                    <div className="w-full text-center mt-3">
                      <div className="flex h-7 justify-center items-stretch bg-transparent px-2 mt-1">
                        {/* Render white barcode lines on dark bg */}
                        {renderHTMLBarcode()}
                      </div>
                      <div className="text-[8px] font-mono text-slate-400 tracking-widest mt-1">{idNumber}</div>
                    </div>

                    <div className="w-full flex flex-col items-center mt-3 shrink-0">
                      <div className="w-[120px] h-[0.5px] bg-slate-800" />
                      <div className="text-[7.5px] text-slate-500 mt-1 font-semibold">Authorized Signatory</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex gap-4 justify-between items-stretch text-[8.5px] text-slate-400 text-left">
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div className="space-y-1.5 font-medium leading-relaxed">
                        <div>• Property of {companyName}.</div>
                        <div>• Unauthorized copy is prohibited.</div>
                        <div>• If found, return to office.</div>
                      </div>

                      <div className="space-y-1 mt-2">
                        <div className="text-[7.5px] text-slate-300 font-semibold truncate">Email: {email}</div>
                        <div className="text-[7.5px] text-slate-300 font-semibold">Phone: {phone}</div>
                      </div>
                    </div>

                    <div className="w-[120px] shrink-0 flex flex-col justify-between items-center border-l border-slate-900 pl-4 py-1">
                      <div className="w-full text-center">
                        {renderHTMLBarcode()}
                        <div className="text-[7.5px] font-mono text-slate-400 tracking-widest mt-1 truncate">{idNumber}</div>
                      </div>

                      <div className="w-full flex flex-col items-center shrink-0">
                        <div className="w-full h-[0.5px] bg-slate-800" />
                        <div className="text-[7.5px] text-slate-500 mt-1 font-semibold">Authorized Signatory</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="w-full h-[3px] rounded shrink-0 mt-auto" style={{ backgroundColor: selectedTheme.value }} />
              </div>
            </div>
          </div>

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
