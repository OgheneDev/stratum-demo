"use client";

import { PROFILES } from "@/lib/profiles";
import type { WorkspaceProfile } from "@/types";
import clsx from "clsx";

interface Props {
  active: WorkspaceProfile;
  onChange: (profile: WorkspaceProfile) => void;
  loading: boolean;
}

const INDUSTRY_DOTS: Record<string, string> = {
  Aviation: "bg-sky-400",
  Logistics: "bg-emerald-400",
  Healthcare: "bg-rose-400",
};

export function ProfileSelector({ active, onChange, loading }: Props) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-xs text-slate-500 uppercase tracking-widest">
        workspace
      </span>
      <div className="flex gap-1">
        {PROFILES.map((p) => (
          <button
            key={p.id}
            onClick={() => !loading && onChange(p)}
            disabled={loading}
            className={clsx(
              "flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono transition-all duration-150 border",
              active.id === p.id
                ? "bg-slate-800 border-slate-600 text-slate-100"
                : "bg-transparent border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300",
              loading && "opacity-40 cursor-not-allowed",
            )}
          >
            <span
              className={clsx(
                "w-1.5 h-1.5 rounded-full",
                INDUSTRY_DOTS[p.industry],
                active.id === p.id ? "opacity-100" : "opacity-40",
              )}
            />
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
