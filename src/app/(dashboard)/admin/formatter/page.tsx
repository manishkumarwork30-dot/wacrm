"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Clipboard, Check, Trash2 } from "lucide-react";

export default function FormatterPage() {
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [copied, setCopied] = useState(false);

  const formatText = () => {
    if (!inputText.trim()) {
      toast.error("Please enter some text to format");
      return;
    }

    try {
      const lines = inputText.split("\n").map(l => l.trim()).filter(Boolean);
      
      let applicantName = '';
      let fatherName = '';
      let cityVillage = '';
      let tehsil = '';
      let district = '';
      let pincode = '';
      let state = '';
      let mobile = '';
      let applierName = '';
      let tag = '';

      // Identify tag (if the last line is a short code, e.g. 2-4 characters)
      if (lines.length > 0) {
        const lastLine = lines[lines.length - 1];
        if (lastLine.length <= 4 && !lastLine.includes('-') && !lastLine.includes(':')) {
          tag = lastLine.toUpperCase();
          lines.pop(); // Remove it from lines to process
        }
      }

      for (let line of lines) {
        // Check for S/O line
        if (line.toUpperCase().includes(' S/O ') || line.toUpperCase().includes(' S/O')) {
          const parts = line.split(/\s+s\/o\s*/i);
          if (parts.length >= 2) {
            applicantName = parts[0].trim();
            fatherName = parts[1].trim();
          } else {
            applicantName = line.trim();
          }
          continue;
        }

        const lowerLine = line.toLowerCase();

        // Check for fields
        if (lowerLine.startsWith('city-') || lowerLine.includes('city:') || lowerLine.startsWith('village-') || lowerLine.startsWith('vill-')) {
          cityVillage = line.replace(/^(city|village|vill)[-:\s]+/i, '').trim();
        } else if (lowerLine.includes('tehsil-') || lowerLine.includes('tehsil:')) {
          tehsil = line.split(/tehsil[-:\s]+/i)[1]?.trim() || '';
        } else if (lowerLine.includes('district-') || lowerLine.includes('district:') || lowerLine.includes('distt-') || lowerLine.includes('distt:') || lowerLine.startsWith('district ')) {
            // Extract after 'district' keyword allowing space, hyphen or colon
            const match = line.match(/^district[\s-:]+(.+)/i);
            district = match ? match[1].trim() : '';
          }
          district = line.replace(/^.*dist(rict|t)[-:\s]+/i, '').trim();
        } else if (lowerLine.startsWith('pincode-') || lowerLine.includes('pincode:')) {
          pincode = line.replace(/^pincode[-:\s]+/i, '').trim();
        } else if (lowerLine.startsWith('state-') || lowerLine.includes('state:')) {
          state = line.replace(/^state[-:\s]+/i, '').trim();
        } else if (lowerLine.startsWith('m.no-') || lowerLine.includes('m.no:') || lowerLine.startsWith('mobile-') || lowerLine.startsWith('mobile no-') || lowerLine.includes('mobile:')) {
          mobile = line.replace(/^(m\.no|mobile|mobile no)[-:\s]+/i, '').trim();
        } else if (lowerLine.startsWith('applier name-') || lowerLine.includes('applier name:') || lowerLine.startsWith('applicant name-')) {
          applierName = line.replace(/^(applier name|applicant name)[-:\s]+/i, '').trim();
        }
      }

      // Clean names helper
      const cleanName = (n: string) => {
        let cleaned = n.replace(/^(mr\.|mrs\.|ms\.)\s+/i, '').trim();
        return cleaned.toUpperCase();
      };

      const formattedApplicant = applicantName ? `MR. ${cleanName(applicantName)}` : '';
      const formattedFather = fatherName ? `MR. ${cleanName(fatherName)}` : '';
      const formattedApplier = applierName ? `MR. ${cleanName(applierName)}` : '';

      // Get state code
      const stateClean = state.toLowerCase();
      let stateCode = '';
      const stateCodes: Record<string, string> = {
        "madhya pradesh": "MP", "uttar pradesh": "UP", "rajasthan": "RJ", "bihar": "BR",
        "haryana": "HR", "punjab": "PB", "delhi": "DL", "gujarat": "GJ", "maharashtra": "MH",
        "west bengal": "WB", "tamil nadu": "TN", "karnataka": "KA", "andhra pradesh": "AP",
        "telangana": "TS", "chhattisgarh": "CG", "jharkhand": "JH", "odisha": "OD",
        "uttarakhand": "UK", "himachal pradesh": "HP", "jammu and kashmir": "JK"
      };
      if (stateClean) {
        stateCode = stateCodes[stateClean] || state.toUpperCase();
      }

      // Build the first line
      let firstLineParts: string[] = [];
      if (formattedApplicant) {
        if (formattedFather) {
          firstLineParts.push(`${formattedApplicant} S/O ${formattedFather}`);
        } else {
          firstLineParts.push(formattedApplicant);
        }
      }
      if (cityVillage) {
        firstLineParts.push(`VILL - ${cityVillage.toUpperCase()}`);
      }
      if (tehsil) {
        firstLineParts.push(`TEHSIL - ${tehsil.toUpperCase()}`);
      }
      if (district) {
        const stateSuffix = stateCode ? ` (${stateCode})` : '';
        const pinSuffix = pincode ? ` - ${pincode}` : '';
        firstLineParts.push(`DISTT - ${district.toUpperCase()}${stateSuffix}${pinSuffix}`);
      }

      const firstLine = firstLineParts.join(', ');
      const secondLine = `MOBILE NO - ${mobile}`;
      const thirdLine = `APPLIER NAME - ${formattedApplier}${tag ? ` (${tag})` : ''}`;

      const finalOutput = `${firstLine}\n${secondLine}\n${thirdLine}`;
      setOutputText(finalOutput);
      toast.success("Text formatted successfully!");
    } catch (err: any) {
      toast.error("Failed to format text: " + err.message);
    }
  };

  const handleCopy = () => {
    if (!outputText) return;
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-full flex-col p-6 gap-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Text Formatter</h1>
        <p className="text-sm text-slate-400 mt-1">
          Paste applicant raw text to format it according to standard template format.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Input panel */}
        <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Input Raw Text</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setInputText(""); setOutputText(""); }}
              className="text-slate-400 hover:text-white"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Clear
            </Button>
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`HTL Network \nOmprakash Vishwakarma S/O Ramnarayan Vishwakarma \nCity- W.No-04,Bajrang Mohalla\nPost Office -Tehsil- Narsingh Garh \nDistrict- Rajgarh \nPincode- 465669 \nState- Madhya Pradesh \nM.no- 9993192017\nApplier Name- Omprakash Vishwakarma \n\nRJ`}
            className="flex-1 min-h-[300px] w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-blue-500/50 focus:outline-none transition-colors font-mono"
          />
          <Button
            onClick={formatText}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium animate-pulse"
          >
            Format Text
          </Button>
        </div>

        {/* Output panel */}
        <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Formatted Output</h2>
            {outputText && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="text-blue-400 hover:text-blue-300"
              >
                {copied ? <Check className="h-4 w-4 mr-1.5" /> : <Clipboard className="h-4 w-4 mr-1.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            )}
          </div>
          <textarea
            readOnly
            value={outputText}
            placeholder="Formatted output will appear here..."
            className="flex-1 min-h-[300px] w-full rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-sm text-slate-300 focus:outline-none font-mono cursor-default"
          />
          <Button
            disabled={!outputText}
            onClick={handleCopy}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
          >
            Copy Result
          </Button>
        </div>
      </div>
    </div>
  );
}
