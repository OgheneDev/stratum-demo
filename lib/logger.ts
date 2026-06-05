import type { LogEntry, LogLevel } from "@/types";

let counter = 0;

export function makeLog(
  level: LogLevel,
  message: string,
  actor?: LogEntry["actor"],
  detail?: string,
): LogEntry {
  return {
    id: `log-${Date.now()}-${counter++}`,
    ts: Date.now(),
    level,
    actor,
    message,
    detail,
  };
}

export function formatTs(ts: number): string {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${h}:${m}:${s}.${ms}`;
}
