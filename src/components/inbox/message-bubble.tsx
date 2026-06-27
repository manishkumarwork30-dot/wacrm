"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { Message, MessageReaction } from "@/types";
import {
  Clock,
  Check,
  CheckCheck,
  XCircle,
  FileText,
  MapPin,
  LayoutTemplate,
  ImageOff,
  CornerDownLeft,
} from "lucide-react";
import { format } from "date-fns";
import { ReplyQuote } from "./reply-quote";
import { MessageReactions } from "./message-reactions";


function StatusIcon({ status }: { status: Message["status"] }) {
  switch (status) {
    case "sending":
      return <Clock className="h-3 w-3 text-slate-400" />;
    case "sent":
      return <Check className="h-3 w-3 text-slate-400" />;
    case "delivered":
      return <CheckCheck className="h-3 w-3 text-slate-400" />;
    case "read":
      return <CheckCheck className="h-3 w-3 text-blue-400" />;
    case "failed":
      return <XCircle className="h-3 w-3 text-red-400" />;
    default:
      return null;
  }
}

function MediaUnavailable({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-700/40 px-3 py-2 text-xs text-slate-300">
      <ImageOff className="h-4 w-4 shrink-0 text-slate-500" />
      <span>{label} unavailable</span>
    </div>
  );
}

function MediaImage({ url, alt }: { url: string; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadImage = useCallback(async () => {
    if (!url) return;

    // Proxy URLs need auth fetch to create blob URL
    if (url.startsWith("/api/whatsapp/media/")) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to load media");
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        setSrc(blobUrl);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    } else {
      setSrc(url);
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    loadImage();
    return () => {
      if (src?.startsWith("blob:")) {
        URL.revokeObjectURL(src);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadImage]);

  if (error) {
    return (
      <div className="flex h-40 w-60 items-center justify-center rounded-lg bg-slate-700">
        <ImageOff className="h-8 w-8 text-slate-500" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-40 w-60 items-center justify-center rounded-lg bg-slate-700">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <img
      src={src ?? ""}
      alt={alt}
      className="max-h-64 max-w-60 rounded-lg object-cover"
      onError={() => setError(true)}
    />
  );
}

function MessageContent({ message }: { message: Message }) {
  switch (message.content_type) {
    case "text":
      return (
        <p className="whitespace-pre-wrap break-words text-sm">
          {message.content_text}
        </p>
      );

    case "image":
      return (
        <div>
          {message.media_url ? (
            <MediaImage url={message.media_url} alt="Shared image" />
          ) : (
            <MediaUnavailable label="Image" />
          )}
          {message.content_text && (
            <p className="mt-1 whitespace-pre-wrap break-words text-sm">
              {message.content_text}
            </p>
          )}
        </div>
      );

    case "video":
      return (
        <div>
          {message.media_url ? (
            <video
              src={message.media_url}
              controls
              className="max-h-64 max-w-60 rounded-lg"
            />
          ) : (
            <MediaUnavailable label="Video" />
          )}
          {message.content_text && (
            <p className="mt-1 whitespace-pre-wrap break-words text-sm">
              {message.content_text}
            </p>
          )}
        </div>
      );

    case "audio":
      return (
        <div>
          {message.media_url ? (
            <audio src={message.media_url} controls className="max-w-60" />
          ) : (
            <MediaUnavailable label="Audio" />
          )}
        </div>
      );

    case "document": {
      if (!message.media_url) {
        return <MediaUnavailable label={message.content_text || "Document"} />;
      }
      const displayFileName = (() => {
        try {
          const parts = message.media_url.split('/');
          const lastPart = parts[parts.length - 1];
          if (lastPart) {
            const clean = decodeURIComponent(lastPart.split('?')[0]);
            if (clean.includes('.')) return clean;
          }
        } catch {}
        return "Document.pdf";
      })();
      return (
        <div className="flex flex-col gap-1.5">
          <a
            href={message.media_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg bg-slate-700/50 px-3 py-2 text-sm hover:bg-slate-700 text-slate-100 max-w-60"
          >
            <FileText className="h-5 w-5 shrink-0 text-slate-400" />
            <span className="truncate flex-1 font-medium">
              {displayFileName}
            </span>
          </a>
          {message.content_text && message.content_text !== displayFileName && (
            <p className="whitespace-pre-wrap break-words text-sm">
              {message.content_text}
            </p>
          )}
        </div>
      );
    }

    case "template":
      return (
        <div>
          <span className="mb-1 inline-flex items-center gap-1 rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            <LayoutTemplate className="h-3 w-3" />
            Template
          </span>
          {message.content_text && (
            <p className="mt-1 whitespace-pre-wrap break-words text-sm">
              {message.content_text}
            </p>
          )}
        </div>
      );

    case "location":
      return (
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
          <span>{message.content_text || "Location shared"}</span>
        </div>
      );

    case "interactive": {
      // Customer tapped a reply button or list row on a message the bot
      // sent. We show the tapped option's title (already in content_text,
      // set by parseMessageContent in the webhook) with a small affordance
      // so agents reading the inbox can tell at a glance that this is a
      // tap rather than the customer typing the same words.
      return (
        <div className="flex flex-col gap-0.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
            <CornerDownLeft className="h-3 w-3" />
            Button reply
          </span>
          <p className="whitespace-pre-wrap break-words text-sm">
            {message.content_text || "[Interactive reply]"}
          </p>
        </div>
      );
    }

    default:
      return (
        <p className="whitespace-pre-wrap break-words text-sm">
          {message.content_text || "[Unsupported message type]"}
        </p>
      );
  }
}

interface MessageBubbleProps {
  message: Message;
  /** Pre-computed quote info for messages that reply to another. */
  reply?: { authorLabel: string; preview: string } | null;
  reactions?: MessageReaction[];
  currentUserId?: string;
  onToggleReaction?: (emoji: string) => void;
  contactId?: string;
}

interface BotButton {
  title: string;
  url?: string;
}

function getBotButtons(text: string | null | undefined, contactId?: string): BotButton[] {
  if (!text) return [];
  const textLower = text.toLowerCase();
  
  // Welcome Msg or Reminder Msg
  if (
    textLower.includes('apply now') ||
    textLower.includes('आवेदन के लिए नीचे दिए गए') ||
    textLower.includes('आवेदन अभी पूरा नहीं हुआ है') ||
    textLower.includes('फॉर्म अभी पूरा नहीं हुआ है')
  ) {
    const url = contactId ? `/apply/${contactId}` : undefined;
    return [{ title: 'Apply Now', url }];
  }
  
  // Survey/Agreement Msg
  if (
    textLower.includes('शर्तों से सहमत हैं') && 
    (textLower.includes('सहमत होने के लिए') || textLower.includes('सहमत'))
  ) {
    if (textLower.includes('सहमत')) {
      return [
        { title: 'YES (सहमत)' },
        { title: 'NO (असहमत)' }
      ];
    }
    return [
      { title: 'YES' },
      { title: 'NO' }
    ];
  }
  
  // AWAITING_LAND_CONFIRMATION reprompt
  if (textLower.includes('yes या no में जवाब दें')) {
    return [
      { title: 'YES' },
      { title: 'NO' }
    ];
  }
  
  // askMobileMsg
  if (textLower.includes('इसी व्हाट्सएप नंबर का उपयोग')) {
    return [
      { title: 'YES (Same No)' }
    ];
  }
  
  return [];
}

export function MessageBubble({
  message,
  reply,
  reactions,
  currentUserId,
  onToggleReaction,
  contactId,
}: MessageBubbleProps) {
  const isAgent = message.sender_type === "agent" || message.sender_type === "bot";
  const time = format(new Date(message.created_at), "HH:mm");
  const buttons = isAgent ? getBotButtons(message.content_text, contactId) : [];

  // Row alignment + width cap are owned by <MessageActions> so its hover
  // group matches the bubble's content area, not the full row.
  return (
    <div
      className={cn(
        "flex flex-col",
        isAgent ? "items-end" : "items-start",
      )}
    >
      <div
        className={cn(
          "relative rounded-2xl px-3 py-2",
          isAgent
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md bg-slate-800 text-slate-100",
        )}
      >
        {reply && (
          <ReplyQuote authorLabel={reply.authorLabel} preview={reply.preview} />
        )}
        <MessageContent message={message} />
        
        {/* Render buttons if any */}
        {buttons && buttons.length > 0 && (
          <div className="mt-3 flex flex-col gap-2 border-t border-white/20 pt-2 w-full min-w-[200px]">
            {buttons.map((btn, index) => {
              if (btn.url) {
                return (
                  <a
                    key={index}
                    href={btn.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-xs font-semibold text-white hover:bg-white/25 transition-all duration-200 shadow-sm border border-white/10"
                  >
                    <span>{btn.title}</span>
                    <svg className="h-3.5 w-3.5 shrink-0 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                );
              }
              return (
                <div
                  key={index}
                  className="flex items-center justify-center rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs font-semibold text-white/80 select-none cursor-default"
                >
                  {btn.title}
                </div>
              );
            })}
          </div>
        )}

        <div
          className={cn(
            "mt-1 flex items-center gap-1",
            isAgent ? "justify-end" : "justify-start",
          )}
        >
          <span className="text-[10px] text-white/60">{time}</span>
          {isAgent && <StatusIcon status={message.status} />}
        </div>
      </div>
      {reactions && reactions.length > 0 && onToggleReaction && (
        <MessageReactions
          reactions={reactions}
          currentUserId={currentUserId}
          onToggle={onToggleReaction}
        />
      )}
    </div>
  );
}
