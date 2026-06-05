"use client";

import { useState } from "react";
import type { WorkflowEntity, TransitionRule } from "@/types";
import clsx from "clsx";

interface Props {
  entity: WorkflowEntity;
  transitions: TransitionRule[];
  actor: "alice" | "bob";
  onConfirm: (rule: TransitionRule, payload: Record<string, unknown>) => void;
  onClose: () => void;
}

export function MutateModal({
  entity,
  transitions,
  actor,
  onConfirm,
  onClose,
}: Props) {
  const available = transitions.filter(
    (t) => t.from_state === entity.currentState,
  );
  const [selectedRule, setSelectedRule] = useState<TransitionRule | null>(
    available[0] ?? null,
  );
  const [fields, setFields] = useState<Record<string, string>>({});

  if (available.length === 0) return null;

  const accentColor =
    actor === "alice" ? "border-sky-700" : "border-violet-700";

  function handleSubmit() {
    if (!selectedRule) return;
    const payload: Record<string, unknown> = {};
    Object.entries(selectedRule.payload_schema).forEach(([key, schema]) => {
      const raw = fields[key] ?? "";
      payload[key] = schema.type === "number" ? Number(raw) : raw;
    });
    onConfirm(selectedRule, payload);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        className={clsx(
          "w-full max-w-md bg-slate-900 border rounded-lg shadow-2xl overflow-hidden",
          accentColor,
        )}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <span className="font-display text-sm font-bold text-slate-200">
              Mutate Entity
            </span>
            <button
              onClick={onClose}
              className="font-mono text-xs text-slate-600 hover:text-slate-300"
            >
              esc
            </button>
          </div>
          <div className="mt-1 font-mono text-[10px] text-slate-600">
            id: {entity.id} · v{entity.version}
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Transition selector */}
          <div>
            <label className="font-mono text-[10px] text-slate-500 uppercase block mb-2">
              transition
            </label>
            <div className="space-y-1.5">
              {available.map((rule) => (
                <button
                  key={rule.to_state}
                  onClick={() => {
                    setSelectedRule(rule);
                    setFields({});
                  }}
                  className={clsx(
                    "w-full text-left px-3 py-2 rounded border font-mono text-xs transition-colors",
                    selectedRule?.to_state === rule.to_state
                      ? "bg-slate-800 border-slate-600 text-slate-200"
                      : "bg-transparent border-slate-800 text-slate-500 hover:border-slate-600",
                  )}
                >
                  <span className="text-slate-500">{rule.from_state}</span>
                  <span className="text-slate-700 mx-2">→</span>
                  <span className="text-slate-200">{rule.to_state}</span>
                  <span className="ml-2 text-slate-600 text-[10px]">
                    [{rule.allowed_roles.join(", ")}]
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Payload fields */}
          {selectedRule &&
            Object.keys(selectedRule.payload_schema).length > 0 && (
              <div>
                <label className="font-mono text-[10px] text-slate-500 uppercase block mb-2">
                  payload
                </label>
                <div className="space-y-2">
                  {Object.entries(selectedRule.payload_schema).map(
                    ([key, schema]) => (
                      <div key={key}>
                        <label className="font-mono text-[10px] text-slate-500 flex items-center gap-1 mb-1">
                          {key}
                          <span className="text-blue-500">{schema.type}</span>
                          {schema.required && (
                            <span className="text-rose-500">*</span>
                          )}
                        </label>
                        <input
                          type={schema.type === "number" ? "number" : "text"}
                          value={fields[key] ?? ""}
                          onChange={(e) =>
                            setFields((prev) => ({
                              ...prev,
                              [key]: e.target.value,
                            }))
                          }
                          placeholder={`Enter ${schema.type}...`}
                          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-500"
                        />
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="font-mono text-xs px-3 py-1.5 text-slate-500 hover:text-slate-300 transition-colors"
          >
            cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedRule}
            className="font-mono text-xs px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded border border-slate-600 transition-colors disabled:opacity-40"
          >
            execute mutation →
          </button>
        </div>
      </div>
    </div>
  );
}
