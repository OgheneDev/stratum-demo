"use client";

import clsx from "clsx";

interface Props {
  onSimulate: () => void;
  running: boolean;
  disabled: boolean;
  hasEntities: boolean;
}

export function CollisionSimulator({
  onSimulate,
  running,
  disabled,
  hasEntities,
}: Props) {
  return (
    <div className="flex items-center justify-center gap-4 py-3 border-y border-slate-800 bg-slate-950/60">
      <div className="flex flex-col items-center gap-1">
        <button
          onClick={onSimulate}
          disabled={disabled || running || !hasEntities}
          className={clsx(
            "group flex items-center gap-2.5 px-5 py-2.5 rounded border font-mono text-xs transition-all duration-150",
            running
              ? "bg-amber-950/50 border-amber-800 text-amber-400 cursor-wait"
              : disabled || !hasEntities
                ? "bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed opacity-50"
                : "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-rose-800 hover:text-rose-300 active:scale-95",
          )}
        >
          {/* Animated collision icon */}
          <span className="relative flex items-center gap-1">
            <span
              className={clsx(
                "w-1.5 h-1.5 rounded-full",
                running
                  ? "bg-amber-400 animate-ping"
                  : "bg-slate-500 group-hover:bg-rose-400",
              )}
            />
            <span
              className={clsx(
                "w-1.5 h-1.5 rounded-full",
                running
                  ? "bg-amber-400 animate-ping animation-delay-150"
                  : "bg-slate-500 group-hover:bg-rose-400",
              )}
            />
          </span>
          {running
            ? "dispatching concurrent writes…"
            : "simulate microsecond collision race"}
        </button>

        <p className="font-mono text-[9px] text-slate-700">
          dispatches alice + bob mutations at identical version simultaneously
          via Promise.all
        </p>
      </div>
    </div>
  );
}
