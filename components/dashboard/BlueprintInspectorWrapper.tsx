import type { BlueprintConfig } from "@/types";
import { BlueprintInspector } from "@/components/inspector/BlueprintInspector";
import { X } from "lucide-react";

interface BlueprintInspectorWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  config: BlueprintConfig | null;
  loading: boolean;
  tenantId: string;
}

export function BlueprintInspectorWrapper({
  isOpen,
  onClose,
  config,
  loading,
  tenantId,
}: BlueprintInspectorWrapperProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside
        className={[
          "flex-col min-h-0 overflow-hidden bg-[#0a0f1a] border-r border-white/5",
          "lg:flex lg:relative lg:w-60 lg:z-auto lg:translate-x-0",
          "fixed top-0 left-0 h-full z-40 w-72 flex transition-transform duration-300",
          "translate-x-0",
        ].join(" ")}
      >
        {/* Mobile header with close button */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/6">
          <span className="font-sans font-semibold text-sm text-slate-200">
            Blueprint
          </span>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-md bg-white/4 border border-white/6 text-slate-500 hover:text-slate-300"
          >
            <X size={13} />
          </button>
        </div>

        {/* The actual BlueprintInspector component */}
        <BlueprintInspector
          config={config}
          loading={loading}
          tenantId={tenantId}
        />
      </aside>
    </>
  );
}
