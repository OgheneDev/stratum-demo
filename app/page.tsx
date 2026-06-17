"use client";

import { useEffect } from "react";
import type { TransitionRule } from "@/types";
import { PROFILES } from "@/lib/profiles";
import { makeLog } from "@/lib/logger";
import { mutateEntity } from "@/lib/api";
import { useDashboardState } from "@/hooks/useDashboardState";
import { useWebSocketManager } from "@/hooks/useWebSocketManager";
import { ProfileBootService } from "@/services/profileBootService";
import { CollisionService } from "@/services/collisionService";
import { TopBar } from "@/components/dashboard/TopBar";
import { MobileProfileSelector } from "@/components/dashboard/MobileProfileSelelctor";
import { DesktopLayout } from "@/components/dashboard/DesktopLayout";
import { MobileLayout } from "@/components/dashboard/MobileLayout";
import { CollisionSimulator } from "@/components/collision/CollisionSimulator";
import { Terminal } from "@/components/terminal/Terminal";
import { MutateModal } from "@/components/dashboard/MutateModal";
import { BlueprintInspectorWrapper } from "@/components/dashboard/BlueprintInspectorWrapper";

export default function DashboardPage() {
  const {
    // State
    activeProfileId,
    initializing,
    logs,
    readyProfiles,
    mobileTab,
    blueprintOpen,
    mutateTarget,
    collisionRunning,
    aliceCollisionOutcome,
    bobCollisionOutcome,
    collisionEntityId,
    cacheRef,

    // Setters
    setInitializing,
    setReadyProfiles,
    setMobileTab,
    setBlueprintOpen,
    setMutateTarget,
    setCollisionRunning,
    setAliceCollisionOutcome,
    setBobCollisionOutcome,
    setCollisionEntityId,

    // Derived
    activeProfile,
    activeEntities,
    activeBlueprint,
    activeTokens,
    isLoading,

    // Actions
    addLog,
    clearLogs,
    handleProfileChange,
    updateEntities,
    updateCollisionOutcome,
  } = useDashboardState();

  const { makeSocket } = useWebSocketManager();

  const bootService = new ProfileBootService(
    addLog,
    (token, actor, profileId, tenantId) =>
      makeSocket(token, actor, profileId, tenantId, handleEntityUpdate),
  );

  const collisionService = new CollisionService(addLog);

  // Handle entity updates from WebSocket
  const handleEntityUpdate = (payload: any) => {
    updateEntities(payload.tenant_id, payload);
  };

  // Boot all profiles on mount
  useEffect(() => {
    async function bootAll() {
      setInitializing(true);
      addLog(makeLog("info", "Booting all workspaces in parallel…", "system"));

      const results = await Promise.all(
        PROFILES.map((p) => bootService.bootProfile(p, handleEntityUpdate)),
      );

      results.forEach((cache, index) => {
        if (cache) {
          const profile = PROFILES[index];
          setReadyProfiles((prev) => new Set([...prev, profile.id]));
        }
      });

      addLog(makeLog("success", "All workspaces ready", "system"));
      setInitializing(false);
    }

    bootAll();

    return () => {
      cacheRef.current.forEach((cache) => {
        cache.aliceSocket.disconnect();
        cache.bobSocket.disconnect();
      });
    };
  }, []);

  // Handle manual mutation
  const handleMutateConfirm = async (
    rule: TransitionRule,
    payload: Record<string, unknown>,
  ) => {
    if (!mutateTarget || !activeTokens) return;
    const { entity, actor } = mutateTarget;
    const token = actor === "alice" ? activeTokens.alice : activeTokens.bob;

    setMutateTarget(null);

    addLog(
      makeLog(
        "info",
        `Mutation dispatched — ${entity.id.slice(0, 8)}… ${rule.from_state} → ${rule.to_state}`,
        actor,
        `v${entity.version}`,
      ),
    );

    const result = await mutateEntity(
      token,
      entity.id,
      rule.from_state,
      rule.to_state,
      entity.version,
      payload,
    );

    if (result.success && result.entity) {
      addLog(
        makeLog(
          "success",
          `DB commit OK — entity v${result.entity.version} · audit dispatched async`,
          actor,
        ),
      );
    } else if (result.error?.code === "MUTATION_COLLISION") {
      addLog(
        makeLog(
          "collision",
          `Error 409: Mutation Rejected. Version mismatch detected at database row level.`,
          actor,
          `expected v${result.error.stale_version}`,
        ),
      );
    } else {
      addLog(
        makeLog(
          "error",
          `Mutation failed: ${result.error?.message ?? "unknown"}`,
          actor,
        ),
      );
    }
  };

  // Handle collision simulation
  const handleSimulateCollision = async () => {
    if (!activeTokens || !activeBlueprint) return;

    setCollisionRunning(true);

    await collisionService.simulateCollision(
      activeTokens,
      activeBlueprint,
      activeProfile.entityType,
      activeProfileId,
      activeProfile.alice.role,
      activeProfile.bob.role,
      updateEntities,
      (alice, bob, entityId) => {
        setAliceCollisionOutcome(alice);
        setBobCollisionOutcome(bob);
        if (entityId) setCollisionEntityId(entityId);
      },
    );

    setCollisionRunning(false);
    setTimeout(() => {
      setAliceCollisionOutcome("idle");
      setBobCollisionOutcome("idle");
      setCollisionEntityId(undefined);
    }, 4000);
  };

  return (
    <div
      className="flex flex-col bg-[#080c14] overflow-hidden"
      style={{ height: "100dvh" }}
    >
      <TopBar
        activeProfile={activeProfile}
        initializing={initializing}
        readyProfiles={readyProfiles}
        activeTokens={activeTokens}
        onProfileChange={handleProfileChange}
        onBlueprintToggle={() => setBlueprintOpen(!blueprintOpen)}
      />

      <MobileProfileSelector
        activeProfile={activeProfile}
        initializing={initializing}
        onProfileChange={handleProfileChange}
      />

      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        <BlueprintInspectorWrapper
          isOpen={blueprintOpen}
          onClose={() => setBlueprintOpen(false)}
          config={activeBlueprint}
          loading={isLoading}
          tenantId={activeProfile.tenantId}
        />

        <DesktopLayout
          activeEntities={activeEntities}
          isLoading={isLoading}
          collisionEntityId={collisionEntityId}
          aliceCollisionOutcome={aliceCollisionOutcome}
          bobCollisionOutcome={bobCollisionOutcome}
          availableTransitions={activeBlueprint?.transitions ?? []}
          activeProfile={activeProfile}
          onMutate={(entity, actor) => setMutateTarget({ entity, actor })}
        />

        <MobileLayout
          mobileTab={mobileTab}
          onMobileTabChange={(tab) => setMobileTab(tab)}
          activeEntities={activeEntities}
          isLoading={isLoading}
          collisionEntityId={collisionEntityId}
          aliceCollisionOutcome={aliceCollisionOutcome}
          bobCollisionOutcome={bobCollisionOutcome}
          availableTransitions={activeBlueprint?.transitions ?? []}
          activeProfile={activeProfile}
          onMutate={(entity, actor) => setMutateTarget({ entity, actor })}
        />
      </div>

      <CollisionSimulator
        onSimulate={handleSimulateCollision}
        running={collisionRunning}
        disabled={isLoading || !activeTokens}
        hasEntities={activeEntities.length > 0}
      />

      <Terminal logs={logs} onClear={clearLogs} />

      {mutateTarget && activeBlueprint && (
        <MutateModal
          entity={mutateTarget.entity}
          transitions={activeBlueprint.transitions}
          actor={mutateTarget.actor}
          actorRole={
            mutateTarget.actor === "alice"
              ? activeProfile.alice.role
              : activeProfile.bob.role
          }
          onConfirm={handleMutateConfirm}
          onClose={() => setMutateTarget(null)}
        />
      )}
    </div>
  );
}
