import type {
  WorkflowEntity,
  WorkspaceProfile,
  CollisionOutcome,
  TransitionRule,
} from "@/types";
import { EntityTable } from "./EntityTable";

interface DesktopLayoutProps {
  activeEntities: WorkflowEntity[];
  isLoading: boolean;
  collisionEntityId?: string;
  aliceCollisionOutcome: CollisionOutcome;
  bobCollisionOutcome: CollisionOutcome;
  availableTransitions: TransitionRule[];
  activeProfile: WorkspaceProfile;
  onMutate: (entity: WorkflowEntity, actor: "alice" | "bob") => void;
}

export function DesktopLayout({
  activeEntities,
  isLoading,
  collisionEntityId,
  aliceCollisionOutcome,
  bobCollisionOutcome,
  availableTransitions,
  activeProfile,
  onMutate,
}: DesktopLayoutProps) {
  return (
    <div className="hidden md:flex flex-1 min-h-0 overflow-hidden">
      <div className="flex-1 border-r border-white/5 min-h-0 flex flex-col overflow-hidden">
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
      </div>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
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
      </div>
    </div>
  );
}
