"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useWhatsAppStatus } from "@/hooks/use-whatsapp-status";
import { toast } from "sonner";
import {
  LogOut,
  Menu,
  Settings as SettingsIcon,
  User,
  Wifi,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/inbox": "Inbox",
  "/contacts": "Contacts",
  "/leads": "Leads",
  "/pipelines": "Pipelines",
  "/broadcasts": "Broadcasts",
  "/automations": "Automations",
  "/flows": "Flows",
  "/settings": "Settings",
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  const match = Object.entries(pageTitles).find(([path]) =>
    pathname.startsWith(path)
  );
  return match ? match[1] : "Dashboard";
}

interface HeaderProps {
  onOpenSidebar?: () => void;
}

export function Header({ onOpenSidebar }: HeaderProps) {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const waStatus = useWhatsAppStatus();
  const title = getPageTitle(pathname);
  const [syncing, setSyncing] = useState(false);

  const getSyncLabel = () => {
    if (pathname.startsWith("/settings")) return "Sync Templates";
    if (pathname.startsWith("/contacts")) return "Sync Contacts";
    if (pathname.startsWith("/leads")) return "Sync Leads";
    if (pathname.startsWith("/broadcasts")) return "Sync Broadcasts";
    if (pathname.startsWith("/inbox")) return "Sync Inbox";
    if (pathname.startsWith("/pipelines")) return "Sync Pipelines";
    if (pathname.startsWith("/automations")) return "Sync Automations";
    if (pathname.startsWith("/flows")) return "Sync Flows";
    return "Sync Page";
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      if (pathname.startsWith("/settings")) {
        const res = await fetch('/api/whatsapp/templates/sync', {
          method: 'POST',
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || `Sync failed (HTTP ${res.status})`);
        }
        toast.success(
          `Templates Synced! Total: ${data.total} (${data.inserted} new, ${data.updated} updated)`
        );
      } else {
        // Trigger generic page reload via custom event
        window.dispatchEvent(new Event("refresh-data"));
        // Simulate a small loading spinner for smoothness
        await new Promise((resolve) => setTimeout(resolve, 600));
        
        const pageName = getSyncLabel().replace("Sync ", "");
        toast.success(`${pageName} refreshed successfully!`);
      }
    } catch (err: any) {
      console.error('[header-sync] error:', err);
      toast.error(err.message || 'Failed to sync');
    } finally {
      setSyncing(false);
    }
  };

  const initial =
    profile?.full_name?.charAt(0)?.toUpperCase() ??
    profile?.email?.charAt(0)?.toUpperCase() ??
    "U";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-800 bg-slate-950 px-4 lg:px-6">
      {/* Left: hamburger + page title */}
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open menu"
          className="flex h-10 w-10 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-slate-800 hover:text-white lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="truncate text-base font-semibold text-white sm:text-lg">
          {title}
        </h1>
      </div>

      {/* Center: WhatsApp connection badge — always visible */}
      <Link
        href="/settings?tab=whatsapp"
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all hover:opacity-80"
        style={
          waStatus.loading
            ? {
                background: "rgba(100,116,139,0.15)",
                border: "1px solid rgba(100,116,139,0.3)",
                color: "#94a3b8",
              }
            : waStatus.connected
            ? {
                background: "rgba(34,197,94,0.15)",
                border: "1px solid rgba(34,197,94,0.4)",
                color: "#4ade80",
              }
            : {
                background: "rgba(239,68,68,0.15)",
                border: "1px solid rgba(239,68,68,0.4)",
                color: "#f87171",
              }
        }
        title={
          waStatus.connected
            ? `WhatsApp connected — Phone Number ID: ${waStatus.phoneNumber}`
            : "WhatsApp not connected — click to configure"
        }
      >
        {waStatus.loading ? (
          <>
            <span className="h-2 w-2 rounded-full bg-slate-500 animate-pulse" />
            <span className="hidden sm:inline">Checking...</span>
          </>
        ) : waStatus.connected ? (
          <>
            {/* Pulsing green live dot */}
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            <Wifi className="size-3 shrink-0" />
            <span className="hidden sm:inline max-w-[140px] truncate">
              {waStatus.phoneNumber
                ? `ID: ${waStatus.phoneNumber}`
                : "Connected"}
            </span>
            <span className="sm:hidden">WA ✓</span>
          </>
        ) : (
          <>
            <WifiOff className="size-3 shrink-0" />
            <span className="hidden sm:inline">Not Connected</span>
            <span className="sm:hidden">WA ✗</span>
          </>
        )}
      </Link>

      {/* WhatsApp Sync Button */}
      <button
        type="button"
        onClick={handleSync}
        disabled={syncing}
        className="flex items-center gap-1.5 rounded-full bg-slate-800/60 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-all hover:bg-slate-800 hover:text-white disabled:opacity-50 cursor-pointer"
        title={`Sync/Refresh ${getSyncLabel().replace("Sync ", "")}`}
      >
        <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
        <span className="hidden md:inline">
          {syncing ? "Syncing..." : getSyncLabel()}
        </span>
        <span className="md:hidden">Sync</span>
      </button>

      {/* Right: user dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex items-center gap-2 rounded-md px-1 py-1 transition-colors hover:bg-slate-800/70 focus:bg-slate-800/70 focus:outline-none data-popup-open:bg-slate-800/70 sm:gap-3 sm:pl-1 sm:pr-3"
          aria-label="Open account menu"
        >
          <Avatar className="size-8">
            {profile?.avatar_url ? (
              <AvatarImage
                src={profile.avatar_url}
                alt={profile.full_name ?? "Avatar"}
              />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
              {initial}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium text-white sm:inline">
            {profile?.full_name ?? "User"}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={6}
          className="min-w-56 bg-slate-900 text-slate-100 ring-slate-700"
        >
          <div className="px-2 py-1.5">
            <p className="truncate text-sm font-medium text-white">
              {profile?.full_name ?? "User"}
            </p>
            <p className="truncate text-xs text-slate-400">
              {profile?.email ?? ""}
            </p>
          </div>
          <DropdownMenuSeparator className="bg-slate-800" />
          <DropdownMenuItem
            render={
              <Link
                href="/settings?tab=profile"
                className="text-slate-200 focus:bg-slate-800 focus:text-white"
              />
            }
          >
            <User className="size-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            render={
              <Link
                href="/settings?tab=whatsapp"
                className="text-slate-200 focus:bg-slate-800 focus:text-white"
              />
            }
          >
            <SettingsIcon className="size-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-slate-800" />
          <DropdownMenuItem
            onClick={signOut}
            className="text-slate-200 focus:bg-slate-800 focus:text-white"
          >
            <LogOut className="size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
