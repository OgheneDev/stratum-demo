"use client";

import type { BlueprintConfig } from "@/types";
import clsx from "clsx";
import { Layers, ArrowRight, Shield, Hash } from "lucide-react";
import { stateStyle } from "@/utils/constants";

interface Props {
  config: BlueprintConfig | null;
  loading: boolean;
  tenantId: string;
}

function StateBadge({ state }: { state: string }) {
  const s = stateStyle(state);
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium",
        s.bg,
        s.text,
      )}
    >
      <span className={clsx("w-1 h-1 rounded-full shrink-0", s.dot)} />
      {state}
    </span>
  );
}

export function BlueprintInspector({ config, loading, tenantId }: Props) {
  return (
    <div className="flex flex-col h-full bg-[#0a0f1a]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/6">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-indigo-500/15 border border-indigo-500/20">
            <Layers size={12} className="text-indigo-400" />
          </div>
          <div>
            <span className="block font-sans font-semibold text-xs text-slate-200 leading-none">
              Blueprint
            </span>
            <span className="block font-mono text-[9px] text-slate-600 mt-0.5">
              contract
            </span>
          </div>
        </div>
        <span className="font-mono text-[9px] text-slate-700 truncate max-w-20">
          {tenantId}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {loading && (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 rounded-lg shimmer" />
            ))}
          </div>
        )}

        {!loading && !config && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Layers size={24} className="text-slate-700" />
            <p className="font-sans text-xs text-slate-600">
              No blueprint found
            </p>
          </div>
        )}

        {!loading && config && (
          <>
            {/* Entity types */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Hash size={10} className="text-slate-600" />
                <span className="font-mono text-[9px] text-slate-600 uppercase tracking-widest">
                  Entity Types
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {config.entity_types.map((t) => (
                  <span
                    key={t}
                    className="font-mono text-[10px] px-2 py-0.5 bg-indigo-500/10 text-indigo-300 rounded border border-indigo-500/15"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Separator */}
            <div className="border-t border-white/4" />

            {/* Transitions */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ArrowRight size={10} className="text-slate-600" />
                  <span className="font-mono text-[9px] text-slate-600 uppercase tracking-widest">
                    Transitions
                  </span>
                </div>
                <span className="font-mono text-[9px] text-slate-700">
                  {config.transitions.length}
                </span>
              </div>

              <div className="space-y-1.5">
                {config.transitions.map((t, i) => (
                  <div
                    key={i}
                    className="group rounded-lg border border-white/5 bg-white/2 hover:bg-white/4 hover:border-white/8 transition-all duration-150 overflow-hidden"
                  >
                    {/* State flow */}
                    <div className="flex items-center gap-1.5 px-2.5 pt-2.5 pb-1.5 flex-wrap">
                      <StateBadge state={t.from_state} />
                      <ArrowRight
                        size={10}
                        className="text-slate-700 shrink-0"
                      />
                      <StateBadge state={t.to_state} />
                    </div>

                    {/* Roles */}
                    <div className="px-2.5 pb-2">
                      <div className="flex flex-wrap gap-1 mt-1">
                        {t.allowed_roles.map((r) => (
                          <span
                            key={r}
                            className="inline-flex items-center gap-1 font-mono text-[9px] px-1.5 py-0.5 bg-slate-900 border border-white/6 text-slate-500 rounded"
                          >
                            <Shield size={7} className="text-slate-600" />
                            {r}
                          </span>
                        ))}
                      </div>

                      {/* Payload schema */}
                      {Object.keys(t.payload_schema).length > 0 && (
                        <div className="mt-2 space-y-0.5 border-t border-white/4 pt-2">
                          {Object.entries(t.payload_schema).map(
                            ([field, schema]) => (
                              <div
                                key={field}
                                className="flex items-center gap-1.5 font-mono text-[9px]"
                              >
                                <span className="text-slate-500">{field}</span>
                                <span className="text-slate-700">:</span>
                                <span className="text-blue-400">
                                  {schema.type}
                                </span>
                                {schema.required && (
                                  <span className="text-rose-500 text-[8px] font-bold">
                                    req
                                  </span>
                                )}
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
