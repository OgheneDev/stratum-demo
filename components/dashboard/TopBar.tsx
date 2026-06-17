// components/dashboard/TopBar.tsx
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  GitBranch,
  Layers,
} from "lucide-react";
import type { WorkspaceProfile, ProfileTokens } from "@/types";
import { ProfileSelector } from "./ProfileSelector";
import { PROFILES } from "@/lib/profiles";

interface TopBarProps {
  activeProfile: WorkspaceProfile;
  initializing: boolean;
  readyProfiles: Set<string>;
  activeTokens: ProfileTokens | null;
  onProfileChange: (profile: WorkspaceProfile) => void;
  onBlueprintToggle: () => void;
}

export function TopBar({
  activeProfile,
  initializing,
  readyProfiles,
  activeTokens,
  onProfileChange,
  onBlueprintToggle,
}: TopBarProps) {
  return (
    <header
      className="shrink-0 flex items-center justify-between px-3 sm:px-4 border-b border-white/6 bg-[#080c14]/95 backdrop-blur-sm z-20"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        minHeight: "calc(2.75rem + env(safe-area-inset-top))",
      }}
    >
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-linear-to-br from-indigo-500/30 to-violet-500/20 border border-indigo-500/20">
            <GitBranch size={13} className="text-indigo-400" />
          </div>
          <div className="leading-none hidden xs:block">
            <span className="block font-sans font-bold text-sm text-slate-100 tracking-tight">
              STRATUM
            </span>
            <span className="block font-mono text-[8px] text-slate-700 mt-px">
              engine-as-a-service
            </span>
          </div>
        </div>

        <div className="w-px h-6 bg-white/6 hidden sm:block" />

        <div className="hidden sm:block">
          <ProfileSelector
            active={activeProfile}
            onChange={onProfileChange}
            loading={initializing}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <StatusIndicator
          initializing={initializing}
          readyProfiles={readyProfiles}
          activeTokens={activeTokens}
        />

        <button
          onClick={onBlueprintToggle}
          className="lg:hidden flex items-center justify-center w-7 h-7 rounded-md bg-white/3 border border-white/6 text-slate-500 hover:text-slate-300"
        >
          <Layers size={13} />
        </button>
      </div>
    </header>
  );
}

function StatusIndicator({ initializing, readyProfiles, activeTokens }: any) {
  return (
    <>
      {initializing && (
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/2 border border-white/5">
          <Loader2 size={9} className="text-amber-400 animate-spin" />
          <span className="font-mono text-[9px] text-slate-500">
            booting {readyProfiles.size}/{PROFILES.length} workspaces…
          </span>
        </div>
      )}

      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/2 border border-white/5">
        {activeTokens ? (
          <CheckCircle2 size={10} className="text-emerald-400" />
        ) : initializing ? (
          <Loader2 size={10} className="text-amber-400 animate-spin" />
        ) : (
          <AlertCircle size={10} className="text-rose-400" />
        )}
        <span className="font-mono text-[9px] text-slate-500 hidden sm:block">
          {activeTokens
            ? "authenticated"
            : initializing
              ? "authenticating…"
              : "auth failed"}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
        </span>
        <span className="font-mono text-[9px] text-emerald-500/70 hidden sm:block">
          live
        </span>
      </div>
    </>
  );
}
