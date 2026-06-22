// src/app/(dashboard)/admin/formatter/page.tsx

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Clipboard, Check, Trash2 } from "lucide-react";
import { formatWhatsAppText, formatEntry } from "@/lib/whatsapp/messageFormatter";

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
      // Parse the raw input into structured entries
      const entries = formatWhatsAppText(inputText);
      if (entries.length === 0) {
        toast.error("No valid entries found to format");
        return;
      }
      // Convert each entry to the required output format
      const formatted = entries.map(e => formatEntry(e)).join("\n\n");
      setOutputText(formatted);
      toast.success(`Formatted ${entries.length} block${entries.length > 1 ? "s" : ""} successfully!`);
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
          Paste applicant raw text blocks. Multiple blocks separated by empty lines are supported.
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
            Format
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
            placeholder="Formatted blocks will appear here..."
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
