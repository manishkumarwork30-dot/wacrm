"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Clipboard, Check, Trash2 } from "lucide-react";

export default function FormatterPage() {
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [copied, setCopied] = useState(false);

  const formatSingleBlock = (blockText: string): string => {
    const lines = blockText.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return "";

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
      const upperLine = line.toUpperCase();
      
      // Check for S/O line
      if (upperLine.includes(' S/O ') || upperLine.includes(' S/O')) {
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

      // Check for fields using regular expressions for maximum flexibility
      const cityMatch = line.match(/^(?:city|village|vill)(?:age)?[-:\s]*(.*)/i) || (lowerLine.includes('bajrang mohalla') ? [line, line] : null);
      const tehsilMatch = line.match(/(?:tehsil|tahsil)[-:\s]*(.*)/i);
      const distMatch = line.match(/(?:district|distt|dist)[-:\s]*(.*)/i);
      const pinMatch = line.match(/(?:pincode|pin\s*code|pin)[-:\s]*(.*)/i);
      const stateMatch = line.match(/(?:state)[-:\s]*(.*)/i);
      const mobileMatch = line.match(/(?:m\.?\s*no\.?|mob(?:ile)?(?:\s*no\.?)?(?:\s*number)?|contact|phone|ph)[-:\s]+(.*)/i) || line.match(/^(?:m\.?\s*no\.?|mob(?:ile)?(?:\s*no\.?)?(?:\s*number)?|contact|phone|ph)\s*(.*)/i);
      const applierMatch = line.match(/(?:applier\s*name|applicant\s*name|applier|applicant)[-:\s]*(.*)/i);

      if (cityMatch) {
        cityVillage = cityMatch[1].trim();
      } else if (tehsilMatch) {
        tehsil = tehsilMatch[1].trim();
      } else if (distMatch) {
        district = distMatch[1].trim();
      } else if (pinMatch) {
        pincode = pinMatch[1].trim();
      } else if (stateMatch) {
        state = stateMatch[1].trim();
      } else if (mobileMatch) {
        mobile = mobileMatch[1].trim();
      } else if (applierMatch) {
        applierName = applierMatch[1].trim();
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
      let displayCity = cityVillage.toUpperCase();
      firstLineParts.push(`VILL - ${displayCity}`);
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

    return `${firstLine}\n${secondLine}\n${thirdLine}`;
  };

  const formatText = () => {
    if (!inputText.trim()) {
      toast.error("Please enter some text to format");
      return;
    }

    try {
      let rawBlocks: string[] = [];
      if (inputText.includes("---") || inputText.includes("===")) {
        rawBlocks = inputText.split(/\n\s*(?:---+|===+)\s*\n/);
      } else {
        const lines = inputText.split("\n");
        let currentBlock: string[] = [];
        for (let line of lines) {
          const trimmed = line.trim();
          const upperTrimmed = trimmed.toUpperCase();
          if ((upperTrimmed.startsWith("HTL") || upperTrimmed.startsWith("NETWORK")) && currentBlock.length > 0) {
            rawBlocks.push(currentBlock.join("\n"));
            currentBlock = [];
          }
          currentBlock.push(line);
        }
        if (currentBlock.length > 0) {
          rawBlocks.push(currentBlock.join("\n"));
        }
      }

      rawBlocks = rawBlocks.map(b => b.trim()).filter(Boolean);

      if (rawBlocks.length === 0) {
        toast.error("No valid text blocks found to format");
        return;
      }

      const outputs = rawBlocks.map(block => {
        const formatted = formatSingleBlock(block);
        return `${block}\n--------------------\n${formatted}`;
      });

      const finalOutput = outputs.join("\n\n====================\n\n");
      setOutputText(finalOutput);
      toast.success(`Formatted ${rawBlocks.length} blocks successfully!`);
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
    <div className="flex h-full flex-col p-6 gap-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Text Formatter</h1>
        <p className="text-sm text-slate-400 mt-1">
          Paste applicant raw text blocks. Multiple blocks starting with "HTL" or "Network" are supported.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Input panel */}
        <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Input Raw Text (Notepad Style)</h2>
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
            placeholder="Paste raw block(s) here..."
            className="flex-1 min-h-[400px] w-full rounded-md border border-slate-300 bg-white p-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-shadow font-mono"
            style={{ resize: "vertical" }}
          />
          <Button
            onClick={formatText}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-md"
          >
            Format Multiple Blocks
          </Button>
        </div>

        {/* Output panel */}
        <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Formatted Output (Notepad Style)</h2>
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
            placeholder="Formatted blocks will appear here in Notepad style..."
            className="flex-1 min-h-[400px] w-full rounded-md border border-slate-300 bg-white p-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-shadow font-mono"
            style={{ resize: "vertical" }}
          />
          <Button
            disabled={!outputText}
            onClick={handleCopy}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 shadow-sm"
          >
            Copy Result
          </Button>
        </div>
      </div>
    </div>
  );
}
