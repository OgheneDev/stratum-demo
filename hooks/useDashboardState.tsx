import { useState, useEffect, useRef, useCallback } from "react";
import type {
  WorkspaceProfile,
  WorkflowEntity,
  LogEntry,
  CollisionOutcome,
} from "@/types";
import type { ProfileCache, MutateTarget } from "@/types/dashboard";
import { PROFILES, DEFAULT_PROFILE } from "@/lib/profiles";
import { makeLog } from "@/lib/logger";

export function useDashboardState() {
  const [activeProfileId, setActiveProfileId] = useState<string>(
    DEFAULT_PROFILE.id,
  );
  const [initializing, setInitializing] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const cacheRef = useRef<Map<string, ProfileCache>>(new Map());
  const [readyProfiles, setReadyProfiles] = useState<Set<string>>(new Set());
  const [entityMap, setEntityMap] = useState<Map<string, WorkflowEntity[]>>(
    new Map(),
  );

  const [mobileTab, setMobileTab] = useState<"alice" | "bob">("alice");
  const [blueprintOpen, setBlueprintOpen] = useState(false);
  const [mutateTarget, setMutateTarget] = useState<MutateTarget | null>(null);

  const [collisionRunning, setCollisionRunning] = useState(false);
  const [aliceCollisionOutcome, setAliceCollisionOutcome] =
    useState<CollisionOutcome>("idle");
  const [bobCollisionOutcome, setBobCollisionOutcome] =
    useState<CollisionOutcome>("idle");
  const [collisionEntityId, setCollisionEntityId] = useState<
    string | undefined
  >();

  const addLog = useCallback((log: LogEntry) => {
    setLogs((prev) => [...prev.slice(-499), log]);
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

  const activeProfile = PROFILES.find((p) => p.id === activeProfileId)!;
  const activeCache = cacheRef.current.get(activeProfileId);
  const activeEntities = entityMap.get(activeProfileId) ?? [];
  const activeBlueprint = activeCache?.blueprint ?? null;
  const activeTokens = activeCache?.tokens ?? null;
  const activeProfileReady = readyProfiles.has(activeProfileId);
  const isLoading = initializing || !activeProfileReady;

  const handleProfileChange = useCallback(
    (p: WorkspaceProfile) => {
      setActiveProfileId(p.id);
      setAliceCollisionOutcome("idle");
      setBobCollisionOutcome("idle");
      setCollisionEntityId(undefined);
      addLog(makeLog("info", `Switched to workspace: ${p.label}`, "system"));
    },
    [addLog],
  );

  const updateEntities = useCallback(
    (profileId: string, entities: WorkflowEntity[]) => {
      setEntityMap((prev) => {
        const next = new Map(prev);
        next.set(profileId, entities);
        return next;
      });
    },
    [],
  );

  const updateCollisionOutcome = useCallback(
    (alice: CollisionOutcome, bob: CollisionOutcome, entityId?: string) => {
      setAliceCollisionOutcome(alice);
      setBobCollisionOutcome(bob);
      setCollisionEntityId(entityId);
    },
    [],
  );

  // Return everything flat for easier access
  return {
    // State
    activeProfileId,
    initializing,
    logs,
    readyProfiles,
    entityMap,
    mobileTab,
    blueprintOpen,
    mutateTarget,
    collisionRunning,
    aliceCollisionOutcome,
    bobCollisionOutcome,
    collisionEntityId,
    cacheRef,

    // Setters
    setActiveProfileId,
    setInitializing,
    setLogs,
    setReadyProfiles,
    setEntityMap,
    setMobileTab,
    setBlueprintOpen,
    setMutateTarget,
    setCollisionRunning,
    setAliceCollisionOutcome,
    setBobCollisionOutcome,
    setCollisionEntityId,

    // Derived
    activeProfile,
    activeCache,
    activeEntities,
    activeBlueprint,
    activeTokens,
    activeProfileReady,
    isLoading,

    // Actions
    addLog,
    clearLogs,
    handleProfileChange,
    updateEntities,
    updateCollisionOutcome,
  };
}
