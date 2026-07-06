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
  ShieldCheck, 
  User as UserIcon,
  Plus,
  Save,
  Trash2,
  ListFilter
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

// Define themes
const THEMES = [
  { name: "Classic Navy", value: "#113f67", textClass: "text-[#113f67]", borderClass: "border-[#113f67]" },
  { name: "Electric Blue", value: "#0052FF", textClass: "text-[#0052FF]", borderClass: "border-[#0052FF]" },
  { name: "Crimson Red", value: "#dc2626", textClass: "text-[#dc2626]", borderClass: "border-[#dc2626]" },
  { name: "Forest Green", value: "#059669", textClass: "text-[#059669]", borderClass: "border-[#059669]" },
  { name: "Cyber Purple", value: "#7c3aed", textClass: "text-[#7c3aed]", borderClass: "border-[#7c3aed]" }
];

export default function IDCardPage() {
  // Saved cards list state
  const [savedCards, setSavedCards] = useState<any[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "list">("edit");

  // Input fields state (Pre-filled with default user screenshot data)
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
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch cards on mount
  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    setIsLoadingCards(true);
    try {
      const { data, error } = await supabase
        .from("agent_id_cards")
        .select("*")
        .order("updated_at", { ascending: false });
      
      if (error) throw error;
      setSavedCards(data || []);
    } catch (err) {
      console.log("Supabase fetch failed, falling back to localStorage:", err);
      const local = localStorage.getItem("htl_id_cards");
      if (local) {
        setSavedCards(JSON.parse(local));
      }
    } finally {
      setIsLoadingCards(false);
    }
  };

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

  // Save card (Insert or Update)
  const handleSaveCard = async () => {
    if (!name.trim()) {
      toast.error("Agent Name is required!");
      return;
    }

    const cardData: any = {
      name,
      designation,
      id_number: idNumber,
      aadhar_no: aadharNo,
      email,
      phone,
      valid_upto: validUpto,
      company_name: companyName,
      logo_url: logoUrl,
      photo_base64: photoBase64,
      theme_name: selectedTheme.name,
      orientation,
      updated_at: new Date().toISOString()
    };

    try {
      if (selectedCardId) {
        // Update
        const { error } = await supabase
          .from("agent_id_cards")
          .update(cardData)
          .eq("id", selectedCardId);
        
        if (error) throw error;
        toast.success("ID Card updated in database!");
      } else {
        // Insert
        const { data, error } = await supabase
          .from("agent_id_cards")
          .insert([cardData])
          .select();
        
        if (error) throw error;
        if (data && data[0]) {
          setSelectedCardId(data[0].id);
        }
        toast.success("New ID Card saved to database!");
      }
      fetchCards();
    } catch (err) {
      console.log("Database save failed, using localStorage fallback:", err);
      
      const local = localStorage.getItem("htl_id_cards");
      let list = local ? JSON.parse(local) : [];

      if (selectedCardId) {
        // Update local list
        list = list.map((c: any) => 
          c.id === selectedCardId ? { ...c, ...cardData } : c
        );
        toast.success("ID Card updated locally!");
      } else {
        // Insert local list
        const newId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
        const newCard = { id: newId, ...cardData, created_at: new Date().toISOString() };
        list.push(newCard);
        setSelectedCardId(newId);
        toast.success("New ID Card saved locally!");
      }
      localStorage.setItem("htl_id_cards", JSON.stringify(list));
      setSavedCards(list);
    }
  };

  // Reset form for creating a new card
  const handleCreateNew = () => {
    setSelectedCardId(null);
    setName("ANJU");
    setDesignation("SERVICE PROVIDER");
    setIdNumber("761788");
    setAadharNo("XXXX XXXX 0638");
    setEmail("HTLLIMITED.COM");
    setPhone("9990035764");
    setValidUpto("31 MARCH 2031");
    setPhotoBase64("");
    toast.info("Form reset. Ready to create a new ID card!");
    setActiveTab("edit");
  };

  // Load a saved card into the editor
  const handleSelectCard = (card: any) => {
    setSelectedCardId(card.id);
    setName(card.name);
    setDesignation(card.designation || "");
    setIdNumber(card.id_number || "");
    setAadharNo(card.aadhar_no || "");
    setEmail(card.email || "");
    setPhone(card.phone || "");
    setValidUpto(card.valid_upto || "");
    setCompanyName(card.company_name || "HTL NETWORK");
    setLogoUrl(card.logo_url || "https://htlnetwork.com/assets/images/logo.png");
    setPhotoBase64(card.photo_base64 || "");
    setOrientation(card.orientation || "vertical");
    
    const themeObj = THEMES.find(t => t.name === card.theme_name) || THEMES[0];
    setSelectedTheme(themeObj);
    
    toast.success(`Loaded details for ${card.name}`);
    setActiveTab("edit");
  };

  // Delete a saved card
  const handleDeleteCard = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent select event
    if (!confirm("Are you sure you want to delete this ID card?")) return;

    try {
      const { error } = await supabase
        .from("agent_id_cards")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      toast.success("ID Card deleted from database!");
      fetchCards();
    } catch (err) {
      console.log("Database delete failed, using localStorage fallback:", err);
      const local = localStorage.getItem("htl_id_cards");
      if (local) {
        let list = JSON.parse(local);
        list = list.filter((c: any) => c.id !== id);
        localStorage.setItem("htl_id_cards", JSON.stringify(list));
        setSavedCards(list);
        toast.success("ID Card deleted locally!");
      }
    }

    if (selectedCardId === id) {
      handleCreateNew();
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-blue-500" />
            ID Card Manager
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Create, save, and edit multiple ID cards matching the official layout.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleCreateNew}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-9 gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Create New Card
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form/Management Panel */}
        <div className="lg:col-span-6 xl:col-span-7 space-y-6">
          
          {/* Tab Selection */}
          <div className="flex rounded-lg bg-slate-900 p-1 border border-slate-800">
            <button
              onClick={() => setActiveTab("edit")}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === "edit"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Save className="h-3.5 w-3.5" />
              {selectedCardId ? "Edit ID Card" : "Card Details"}
            </button>
            <button
              onClick={() => setActiveTab("list")}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === "list"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ListFilter className="h-3.5 w-3.5" />
              Saved Cards List ({savedCards.length})
            </button>
          </div>

          {activeTab === "edit" ? (
            <div className="bg-slate-900/50 backdrop-blur-md rounded-xl border border-slate-800 p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Cardholder Form
                </h2>
                {selectedCardId && (
                  <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-mono">
                    Editing Mode
                  </span>
                )}
              </div>

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

              {/* Layout Config */}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
            <Button
              onClick={handleSaveCard}
              className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-medium gap-2 h-11"
            >
              <Save className="h-4 w-4 text-emerald-400" />
              Save ID Card Details
            </Button>
            <Button
              onClick={handleGeneratePDF}
              disabled={isGenerating}
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium gap-2 h-11"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download PDF Card
                </>
              )}
            </Button>
          </div>
        </div>
          ) : (
            /* Saved Cards List */
            <div className="bg-slate-900/50 backdrop-blur-md rounded-xl border border-slate-800 p-6 space-y-4">
              <h2 className="text-base font-semibold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <ListFilter className="h-4 w-4 text-blue-400" />
                Saved ID Cards
              </h2>

              {isLoadingCards ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <span>Loading cards...</span>
                </div>
              ) : savedCards.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No saved ID cards found. Start filling the details and click "Save ID Card Details" above!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
                  {savedCards.map((card) => (
                    <div
                      key={card.id}
                      onClick={() => handleSelectCard(card)}
                      className={`p-3.5 rounded-lg border text-left cursor-pointer transition-all duration-200 flex justify-between items-center group ${
                        selectedCardId === card.id
                          ? "bg-blue-500/10 border-blue-500"
                          : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950/80"
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="text-xs font-bold text-white truncate">{card.name}</div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">{card.designation || "No Designation"}</div>
                        <div className="text-[9px] text-slate-500 font-mono mt-1">ID: {card.id_number || "N/A"}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectCard(card);
                          }}
                          className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                          title="Load & Edit"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => handleDeleteCard(card.id, e)}
                          className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          title="Delete Card"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Preview Panel */}
        <div className="lg:col-span-6 xl:col-span-5 flex flex-col items-center gap-6 justify-center">
          <div className="flex items-center justify-center w-full max-w-[280px]">
            <span className="text-xs font-semibold text-slate-400">LIVE PREVIEW</span>
          </div>

          {/* Interactive Card Container */}
          <div className="perspective-1000 w-full flex justify-center py-4">
            <div
              className={`relative rounded-xl border border-slate-200 bg-white flex flex-col overflow-hidden shadow-2xl text-black ${
                orientation === "vertical" 
                  ? "w-[245px] h-[385px]" 
                  : "w-[385px] h-[245px]"
              }`}
            >
              {/* FRONT SIDE (Exact screenshot matching) */}
              {/* Header: Logo top left - MADE BIGGER */}
              <div className="relative w-full px-4 pt-3 pb-1 shrink-0 flex items-center justify-between">
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt="Logo" 
                    className="h-9 object-contain self-start mt-0.5" 
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-10" />
                )}
                <div className="w-1" />
              </div>

              {/* Company name - BOLDER font weight and increased size */}
              <div className="text-center font-black text-base tracking-widest mt-1" style={{ color: selectedTheme.value }}>
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

              {/* Double bottom wavy curves - LIGHT BLUE ON TOP, DARK BLUE ON BOTTOM */}
              <div className="relative w-full h-8 overflow-hidden mt-auto shrink-0 bg-transparent">
                {/* Curve 1 (Light Blue, higher top path) */}
                <svg className="absolute bottom-0 left-0 w-full h-full translate-y-[2px]" viewBox="0 0 245 32" preserveAspectRatio="none">
                  <path d="M 0 14 Q 105 0 245 15 L 245 32 L 0 32 Z" fill="#3b82f6" />
                </svg>
                {/* Curve 2 (Dark Blue, overlapping foreground path) */}
                <svg className="absolute bottom-0 left-0 w-full h-full translate-y-[2px]" viewBox="0 0 245 32" preserveAspectRatio="none">
                  <path d="M 0 20 Q 115 6 245 21 L 245 32 L 0 32 Z" fill="#1e40af" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
