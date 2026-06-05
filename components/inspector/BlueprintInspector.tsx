"use client";

import type { BlueprintConfig } from "@/types";

interface Props {
  config: BlueprintConfig | null;
  loading: boolean;
  tenantId: string;
}

const STATE_COLORS: Record<string, string> = {
  // aviation
  landed: "text-sky-400",
  deboarding: "text-sky-300",
  cleaning: "text-slate-400",
  fueling: "text-amber-400",
  boarding: "text-emerald-400",
  departed: "text-slate-300",
  // logistics
  pending: "text-amber-400",
  assigned: "text-sky-400",
  in_transit: "text-blue-400",
  delivered: "text-emerald-400",
  cancelled: "text-rose-400",
  // healthcare
  waiting: "text-amber-400",
  triage: "text-orange-400",
  assessment: "text-blue-400",
  treatment: "text-purple-400",
  discharged: "text-emerald-400",
};

function stateColor(s: string) {
  return STATE_COLORS[s] ?? "text-slate-300";
}

export function BlueprintInspector({ config, loading, tenantId }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <span className="font-display text-xs font-bold text-slate-300 uppercase tracking-widest">
          Blueprint Contract
        </span>
        <span className="font-mono text-[10px] text-slate-600">{tenantId}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {loading && (
          <div className="space-y-2 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-8 bg-slate-800 rounded" />
            ))}
          </div>
        )}

        {!loading && !config && (
          <p className="font-mono text-xs text-slate-600 italic">
            No blueprint found for this tenant.
          </p>
        )}

        {!loading && config && (
          <>
            <div className="mb-3">
              <span className="font-mono text-[10px] text-slate-600 uppercase">
                entity types
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {config.entity_types.map((t) => (
                  <span
                    key={t}
                    className="font-mono text-[10px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="font-mono text-[10px] text-slate-600 uppercase">
                transitions ({config.transitions.length})
              </span>
              <div className="mt-2 space-y-2">
                {config.transitions.map((t, i) => (
                  <div
                    key={i}
                    className="border border-slate-800 rounded p-2.5 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className={stateColor(t.from_state)}>
                        {t.from_state}
                      </span>
                      <span className="text-slate-700">→</span>
                      <span className={stateColor(t.to_state)}>
                        {t.to_state}
                      </span>
                    </div>

                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {t.allowed_roles.map((r) => (
                        <span
                          key={r}
                          className="font-mono text-[9px] px-1.5 py-0.5 bg-slate-900 border border-slate-700 text-slate-400 rounded"
                        >
                          {r}
                        </span>
                      ))}
                    </div>

                    {Object.keys(t.payload_schema).length > 0 && (
                      <div className="mt-2 space-y-0.5">
                        {Object.entries(t.payload_schema).map(
                          ([field, schema]) => (
                            <div
                              key={field}
                              className="flex items-center gap-2 font-mono text-[10px]"
                            >
                              <span className="text-slate-500">{field}</span>
                              <span className="text-slate-700">:</span>
                              <span className="text-blue-400">
                                {schema.type}
                              </span>
                              {schema.required && (
                                <span className="text-rose-500 text-[9px]">
                                  required
                                </span>
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    )}
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
