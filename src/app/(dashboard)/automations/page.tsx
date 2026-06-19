"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Zap,
  Plus,
  MoreVertical,
  Copy,
  Pencil,
  Trash2,
  FileText,
  MessageCircle,
  Clock,
  Users,
  PhoneCall,
  Loader2,
} from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import type { Automation } from "@/types"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AUTOMATION_TEMPLATES, type TemplateSlug } from "@/lib/automations/templates"
import { triggerMeta, formatRelative } from "@/lib/automations/trigger-meta"
import { cn } from "@/lib/utils"

const TEMPLATE_ORDER: TemplateSlug[] = [
  "welcome_message",
  "out_of_office",
  "lead_qualifier",
  "follow_up_reminder",
]

const TEMPLATE_ICON: Record<TemplateSlug, typeof Zap> = {
  welcome_message: MessageCircle,
  out_of_office: Clock,
  lead_qualifier: Users,
  follow_up_reminder: PhoneCall,
}

export default function AutomationsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [automations, setAutomations] = useState<Automation[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Automation | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    if (!user) return
    try {
      const supabase = createClient()
      
      // 1. Fetch normal database automations
      const { data: dbData, error: fetchErr } = await supabase
        .from("automations")
        .select("*")
        .order("created_at", { ascending: false })
      if (fetchErr) throw fetchErr

      // 2. Fetch chatbot config
      const { data: chatbotConfig } = await supabase
        .from("message_templates")
        .select("id, buttons")
        .eq("user_id", user.id)
        .eq("name", "__chatbot_config")
        .maybeSingle()

      const configButtons = (chatbotConfig?.buttons as any) || {}
      const chatbotIsActive = configButtons.is_active !== false

      // 3. Fetch lead count and latest lead timestamp
      const { count: leadCount } = await supabase
        .from("tower_leads")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)

      const { data: latestLead } = await supabase
        .from("tower_leads")
        .select("created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      // 4. Construct virtual automation for chatbot
      const virtualChatbot: Automation = {
        id: "virtual-tower-chatbot",
        user_id: user.id,
        name: "Tower Installation Chatbot",
        description: "Qualifies tower installation leads via automated WhatsApp conversation flow.",
        trigger_type: "message_received" as any,
        trigger_config: {} as any,
        is_active: chatbotIsActive,
        execution_count: leadCount || 0,
        last_executed_at: latestLead?.created_at || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      setAutomations([virtualChatbot, ...((dbData ?? []) as Automation[])])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load automations")
    }
  }

  useEffect(() => {
    if (!authLoading && user) {
      load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id])

  useEffect(() => {
    if (!user) return
    
    const handleRefresh = () => load()
    window.addEventListener('refresh-data', handleRefresh);
    return () => {
      window.removeEventListener('refresh-data', handleRefresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function toggleActive(a: Automation, next: boolean) {
    // Optimistic flip so the switch feels instant.
    setAutomations((prev) =>
      prev?.map((x) => (x.id === a.id ? { ...x, is_active: next } : x)) ?? prev,
    )

    if (a.id === "virtual-tower-chatbot") {
      try {
        const supabase = createClient()
        const { data: existing } = await supabase
          .from("message_templates")
          .select("*")
          .eq("user_id", user?.id)
          .eq("name", "__chatbot_config")
          .maybeSingle()

        const currentButtons = (existing?.buttons as any) || {}
        const updatedButtons = { ...currentButtons, is_active: next }

        if (existing) {
          const { error } = await supabase
            .from("message_templates")
            .update({ buttons: updatedButtons as any })
            .eq("id", existing.id)
          if (error) throw error
        } else {
          const defaultPayload = {
            is_active: next,
            welcome_msg: `मोबाइल टावर स्थापना संबंधी अपडेट

प्रिय महोदय/महोदया,

मोबाइल टावर स्थापना के अवसर में आपकी रुचि के लिए धन्यवाद।

जैसा कि चर्चा हुई थी, हमने आपके विवरण को ऑनलाइन स्थान सर्वेक्षण के लिए हमारी सर्वेक्षण टीम को भेज दिया है। इसके आधार पर, हम पुष्टि करेंगे कि आपके क्षेत्र में टावर स्थापना की आवश्यकता है या नहीं।

📍 यदि आपका स्थान स्वीकृत हो जाता है, तो आपको निम्नलिखित लाभ प्राप्त होंगे:

✅ अग्रिम भुगतान: ₹70,00,000/- (स्थापना से पहले)

✅ मासिक किराया: ₹60,000/-*
   (₹30,000/- सीधे आपके खाते में जमा + ₹30,000/- EMI के रूप में समायोजित)

✅ रोजगार का अवसर: 20,000/- 
   टावर रखरखाव अनुबंध के तहत परिवार के एक सदस्य को निश्चित मासिक वेतन पर नौकरी दी जाएगी।

📝 आपके स्थान की स्वीकृति मिलने के बाद, आपको कल सुबह तक WhatsApp पर PDF स्वीकृति रिपोर्ट प्राप्त हो जाएगी SURVEY के बाद।

📌 महत्वपूर्ण नोट:
स्वीकृति मिलने पर, आपको ₹2,550 का एकमुश्त पंजीकरण शुल्क देना होगा, जिससे आपकी भागीदारी और बुकिंग की पुष्टि हो जाएगी

━━━━━━━━━━━━━━━━━━━━━━━━━━

👉 अगर आप इन शर्तों से सहमत हैं और आगे बात करना चाहते हैं, तो कृपया "YES" लिखकर भेजें (सहमत होने के लिए)।

👉 अगर नहीं, तो "NO" लिखकर जवाब दें।

सादर,
Ms. Meena Kumari
ग्राहक संबंध कार्यकारी
📞 8796156214
मोबाइल टावर स्थापना सेवाएं`,
            ask_name_msg: `नमस्ते 😊\n\n4G / 5G डिजिटल टावर इंस्टॉलेशन आवेदन के लिए कृपया नीचे दी गई जानकारी एक-एक करके बताएं:\n\n1️⃣ आपका पूरा नाम (Full Name) क्या है?`,
            ask_state_msg: `2️⃣ आपकी जमीन किस राज्य (State) में है?`,
            ask_pincode_msg: `3️⃣ आपके क्षेत्र का पिन कोड (PIN Code) क्या है?`,
            end_no_land_msg: `ठीक है 🙏\n\nकोई बात नहीं। अगर भविष्य में जमीन हो या किसी और को जरूरत हो, तो हमसे जरूर संपर्क करें।\n\nमोबाइल टावर स्थापना – आपकी सेवा में सदैव तत्पर।`,
            payment_msg: `बहुत अच्छा! 🎉\n\nआपका स्थान हमारी सर्वेक्षण टीम द्वारा जांचा जाएगा।\n\n📋 पंजीकरण की प्रक्रिया:\n\n✅ पंजीकरण शुल्क: ₹2,550/-\n\nयह शुल्क आपकी बुकिंग और भागीदारी की पुष्टि के लिए आवश्यक है\n\nपंजीकरण शुल्क जमा करने के बाद ही आगे की प्रक्रिया (जैसे NOC और एग्रीमेंट) शुरू होगी। QR कोड / Payment Details आपको जल्द ही भेजी जाएंगी।\n\nकृपया थोड़ा इंतजार करें। 🙏`
          }

          const { error } = await supabase
            .from("message_templates")
            .insert({
              user_id: user?.id,
              name: "__chatbot_config",
              category: "Utility",
              language: "en_US",
              body_text: "WhatsApp Chatbot Configuration Payload",
              buttons: defaultPayload as any,
              status: "Approved",
            })
          if (error) throw error
        }
        toast.success(next ? "Tower Chatbot activated" : "Tower Chatbot paused")
      } catch (err) {
        setAutomations((prev) =>
          prev?.map((x) => (x.id === a.id ? { ...x, is_active: !next } : x)) ?? prev,
        )
        toast.error("Failed to update chatbot status")
      }
      return
    }

    const res = await fetch(`/api/automations/${a.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ is_active: next }),
    })
    if (!res.ok) {
      // Roll back on error.
      setAutomations((prev) =>
        prev?.map((x) => (x.id === a.id ? { ...x, is_active: !next } : x)) ?? prev,
      )
      const body = await res.json().catch(() => ({}))
      toast.error(body?.error ?? "Failed to update")
      return
    }
    toast.success(next ? "Automation activated" : "Automation paused")
  }

  async function duplicate(a: Automation) {
    const res = await fetch(`/api/automations/${a.id}/duplicate`, { method: "POST" })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      toast.error(body?.error ?? "Failed to duplicate")
      return
    }
    toast.success("Automation duplicated")
    load()
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    const res = await fetch(`/api/automations/${pendingDelete.id}`, { method: "DELETE" })
    setDeleting(false)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      toast.error(body?.error ?? "Failed to delete")
      return
    }
    toast.success("Automation deleted")
    setPendingDelete(null)
    load()
  }

  async function startFromTemplate(slug: TemplateSlug) {
    router.push(`/automations/new?template=${slug}`)
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <p className="text-sm text-red-400">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    )
  }

  if (automations === null) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  const showTemplates = automations.length < 3

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Automations</h1>
          <p className="mt-1 text-sm text-slate-400">
            Build workflows that react to WhatsApp® events automatically.
          </p>
        </div>
        <Button
          onClick={() => router.push("/automations/new")}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Create Automation
        </Button>
      </div>

      {showTemplates && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-300">Quick-start templates</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {TEMPLATE_ORDER.map((slug) => {
              const t = AUTOMATION_TEMPLATES[slug]
              const Icon = TEMPLATE_ICON[slug]
              return (
                <button
                  key={slug}
                  onClick={() => startFromTemplate(slug)}
                  className="group flex flex-col items-start rounded-xl border border-slate-800 bg-slate-900 p-4 text-left transition-colors hover:border-primary/50 hover:bg-slate-900/80"
                >
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/15">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-semibold text-white">{t.name}</div>
                  <p className="mt-1 text-xs text-slate-400">{t.description}</p>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {automations.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/40">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <p className="mt-3 text-sm font-medium text-white">No automations yet</p>
          <p className="mt-1 text-xs text-slate-400">
            Pick a template above or create one from scratch.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {automations.map((a) => (
            <AutomationCard
              key={a.id}
              automation={a}
              onToggle={(next) => toggleActive(a, next)}
              onEdit={() => {
                if (a.id === "virtual-tower-chatbot") {
                  router.push("/settings?tab=chatbot")
                } else {
                  router.push(`/automations/${a.id}/edit`)
                }
              }}
              onDuplicate={() => duplicate(a)}
              onLogs={() => {
                if (a.id === "virtual-tower-chatbot") {
                  router.push("/leads")
                } else {
                  router.push(`/automations/${a.id}/logs`)
                }
              }}
              onDelete={() => setPendingDelete(a)}
            />
          ))}
        </ul>
      )}

      <Dialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete automation</DialogTitle>
            <DialogDescription>
              This permanently removes{" "}
              <span className="text-white">{pendingDelete?.name}</span> and its execution
              history. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setPendingDelete(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AutomationCard({
  automation,
  onToggle,
  onEdit,
  onDuplicate,
  onLogs,
  onDelete,
}: {
  automation: Automation
  onToggle: (next: boolean) => void
  onEdit: () => void
  onDuplicate: () => void
  onLogs: () => void
  onDelete: () => void
}) {
  const isVirtualChatbot = automation.id === "virtual-tower-chatbot"
  const meta = isVirtualChatbot
    ? { label: "Lead Qualification", pillClass: "border-primary/30 bg-primary/10 text-primary" }
    : triggerMeta(automation.trigger_type)

  return (
    <li className="rounded-xl border border-slate-800 bg-slate-900 transition-colors hover:border-slate-700">
      <div className="flex items-center gap-4 p-4">
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10"
          aria-hidden
        >
          <Zap className="h-5 w-5 text-primary" />
        </div>

        <button
          type="button"
          onClick={onEdit}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-white">
              {automation.name}
            </span>
            {automation.is_active && (
              <span className="relative flex h-2 w-2" aria-label="active">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
            )}
          </div>
          {automation.description && (
            <p className="mt-0.5 truncate text-xs text-slate-400">{automation.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                meta.pillClass,
              )}
            >
              {meta.label}
            </span>
            <span className="tabular-nums">
              {automation.execution_count} {isVirtualChatbot ? "lead" : "run"}{automation.execution_count === 1 ? "" : "s"}
            </span>
            <span aria-hidden>·</span>
            <span>last {formatRelative(automation.last_executed_at)}</span>
          </div>
        </button>

        <div className="flex items-center gap-3">
          <Switch
            checked={automation.is_active}
            onCheckedChange={(v) => onToggle(!!v)}
            aria-label={automation.is_active ? "Deactivate" : "Activate"}
          />

          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Open menu"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-800 hover:text-white data-[popup-open]:bg-slate-800"
            >
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {!isVirtualChatbot ? (
                <>
                  <DropdownMenuItem onClick={onDuplicate}>
                    <Copy className="h-4 w-4" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onLogs}>
                    <FileText className="h-4 w-4" />
                    View Logs
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={onDelete}>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem onClick={onLogs}>
                  <FileText className="h-4 w-4" />
                  View Leads
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </li>
  )
}
