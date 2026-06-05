"use client";

import { useEffect, useRef } from "react";
import type { LogEntry } from "@/types";
import { formatTs } from "@/lib/logger";
import clsx from "clsx";

interface Props {
  logs: LogEntry[];
}

const LEVEL_STYLES: Record<
  string,
  { line: string; badge: string; label: string }
> = {
  info: {
    line: "text-sky-400",
    badge: "bg-sky-950 border-sky-800",
    label: "INFO",
  },
  success: {
    line: "text-emerald-400",
    badge: "bg-emerald-950 border-emerald-800",
    label: "COMMIT",
  },
  collision: {
    line: "text-rose-400",
    badge: "bg-rose-950 border-rose-800",
    label: "COLLISION",
  },
  telemetry: {
    line: "text-slate-500",
    badge: "bg-slate-900 border-slate-700",
    label: "TELEMETRY",
  },
  error: {
    line: "text-rose-500",
    badge: "bg-rose-950 border-rose-800",
    label: "ERROR",
  },
};

const ACTOR_LABELS: Record<string, string> = {
  alice: "ALICE",
  bob: "BOB",
  system: "SYSTEM",
};

export function Terminal({ logs }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-display text-xs font-bold text-slate-400 uppercase tracking-widest">
            Telemetry
          </span>
          <span className="font-mono text-[10px] text-slate-700">
            {logs.length} events
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Legend */}
          {Object.entries(LEVEL_STYLES).map(([key, s]) => (
            <span key={key} className="flex items-center gap-1">
              <span className={clsx("font-mono text-[9px]", s.line)}>
                {s.label}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Log lines */}
      <div className="flex-1 overflow-y-auto p-3 space-y-0.5 font-mono text-[11px]">
        {logs.length === 0 && (
          <div className="flex items-center gap-2 text-slate-700">
            <span className="animate-blink">█</span>
            <span>awaiting events…</span>
          </div>
        )}

        {logs.map((log) => {
          const style = LEVEL_STYLES[log.level] ?? LEVEL_STYLES.telemetry;
          return (
            <div
              key={log.id}
              className={clsx("flex items-start gap-2 py-0.5 animate-fade-in")}
            >
              {/* Timestamp */}
              <span className="text-slate-700 flex-shrink-0 tabular-nums w-24">
                {formatTs(log.ts)}
              </span>

              {/* Level badge */}
              <span
                className={clsx(
                  "flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded border",
                  style.badge,
                  style.line,
                )}
              >
                {style.label}
              </span>

              {/* Actor badge */}
              {log.actor && (
                <span
                  className={clsx(
                    "flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded",
                    log.actor === "alice"
                      ? "text-sky-400 bg-sky-950/50"
                      : log.actor === "bob"
                        ? "text-violet-400 bg-violet-950/50"
                        : "text-slate-400 bg-slate-800/50",
                  )}
                >
                  {ACTOR_LABELS[log.actor]}
                </span>
              )}

              {/* Message */}
              <span className={clsx("flex-1 min-w-0", style.line)}>
                {log.message}
                {log.detail && (
                  <span className="text-slate-600 ml-2">{log.detail}</span>
                )}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
