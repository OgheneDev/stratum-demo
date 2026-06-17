import type {
  WorkflowEntity,
  WorkspaceProfile,
  CollisionOutcome,
  TransitionRule,
} from "@/types";
import { EntityTable } from "./EntityTable";

interface MobileLayoutProps {
  mobileTab: "alice" | "bob";
  onMobileTabChange: (tab: "alice" | "bob") => void;
  activeEntities: WorkflowEntity[];
  isLoading: boolean;
  collisionEntityId?: string;
  aliceCollisionOutcome: CollisionOutcome;
  bobCollisionOutcome: CollisionOutcome;
  availableTransitions: TransitionRule[];
  activeProfile: WorkspaceProfile;
  onMutate: (entity: WorkflowEntity, actor: "alice" | "bob") => void;
}

export function MobileLayout({
  mobileTab,
  onMobileTabChange,
  activeEntities,
  isLoading,
  collisionEntityId,
  aliceCollisionOutcome,
  bobCollisionOutcome,
  availableTransitions,
  activeProfile,
  onMutate,
}: MobileLayoutProps) {
  return (
    <div className="flex md:hidden flex-col flex-1 min-h-0 overflow-hidden">
      <div className="shrink-0 flex border-b border-white/5">
        {(["alice", "bob"] as const).map((actor) => {
          const isActive = mobileTab === actor;
          const def =
            actor === "alice" ? activeProfile.alice : activeProfile.bob;
          const color =
            actor === "alice"
              ? "text-sky-400 border-sky-400"
              : "text-violet-400 border-violet-400";
          const dot = actor === "alice" ? "bg-sky-400" : "bg-violet-400";

          return (
            <button
              key={actor}
              onClick={() => onMobileTabChange(actor)}
              className={[
                "flex-1 flex items-center justify-center gap-2 py-2.5 font-sans text-xs font-medium border-b-2 transition-colors",
                isActive
                  ? color
                  : "text-slate-500 border-transparent hover:text-slate-300",
              ].join(" ")}
            >
              <span
                className={[
                  "w-1.5 h-1.5 rounded-full",
                  dot,
                  isActive ? "opacity-100" : "opacity-30",
                ].join(" ")}
              />
              {actor === "alice" ? "Alice" : "Bob"}
              <span className="font-mono text-[9px] opacity-50">
                / {def.role}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {mobileTab === "alice" ? (
          <EntityTable
            entities={activeEntities}
            actor="alice"
            loading={isLoading}
            collisionEntityId={collisionEntityId}
            collisionOutcome={aliceCollisionOutcome}
            onMutate={(entity) => onMutate(entity, "alice")}
            availableTransitions={availableTransitions}
            actorLabel={activeProfile.alice.label}
            actorRole={activeProfile.alice.role}
          />
        ) : (
          <EntityTable
            entities={activeEntities}
            actor="bob"
            loading={isLoading}
            collisionEntityId={collisionEntityId}
            collisionOutcome={bobCollisionOutcome}
            onMutate={(entity) => onMutate(entity, "bob")}
            availableTransitions={availableTransitions}
            actorLabel={activeProfile.bob.label}
            actorRole={activeProfile.bob.role}
          />
        )}
      </div>
    </div>
  );
}
