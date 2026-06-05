"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type {
  WorkspaceProfile,
  WorkflowEntity,
  BlueprintConfig,
  LogEntry,
  CollisionOutcome,
  WsEntityUpdatedPayload,
  TransitionRule,
  ProfileTokens,
} from "@/types";
import { PROFILES, DEFAULT_PROFILE } from "@/lib/profiles";
import {
  issueToken,
  fetchActiveBlueprint,
  fetchEntities,
  uploadBlueprint,
  createEntity,
  mutateEntity,
} from "@/lib/api";
import { makeLog } from "@/lib/logger";

import { ProfileSelector } from "@/components/dashboard/ProfileSelector";
import { EntityTable } from "@/components/dashboard/EntityTable";
import { MutateModal } from "@/components/dashboard/MutateModal";
import { BlueprintInspector } from "@/components/inspector/BlueprintInspector";
import { CollisionSimulator } from "@/components/collision/CollisionSimulator";
import { Terminal } from "@/components/terminal/Terminal";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:4000";

export default function DashboardPage() {
  const [profile, setProfile] = useState<WorkspaceProfile>(DEFAULT_PROFILE);

  // Runtime tokens — fetched fresh on every profile load via POST /tenants/token
  // Never hardcoded. If the API key in profiles.ts is wrong, loadProfile will
  // log the error clearly in the terminal.
  const [tokens, setTokens] = useState<ProfileTokens | null>(null);

  const [loading, setLoading] = useState(false);
  const [blueprint, setBlueprint] = useState<BlueprintConfig | null>(null);
  const [entities, setEntities] = useState<WorkflowEntity[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Mutate modal state
  const [mutateTarget, setMutateTarget] = useState<{
    entity: WorkflowEntity;
    actor: "alice" | "bob";
  } | null>(null);

  // Collision state
  const [collisionRunning, setCollisionRunning] = useState(false);
  const [aliceCollisionOutcome, setAliceCollisionOutcome] =
    useState<CollisionOutcome>("idle");
  const [bobCollisionOutcome, setBobCollisionOutcome] =
    useState<CollisionOutcome>("idle");
  const [collisionEntityId, setCollisionEntityId] = useState<
    string | undefined
  >();

  // Socket refs — kept outside state to avoid re-render loops
  const aliceSocketRef = useRef<Socket | null>(null);
  const bobSocketRef = useRef<Socket | null>(null);

  // ─── Append log (capped at 500 lines) ─────────────────────────────────────

  const addLog = useCallback((log: LogEntry) => {
    setLogs((prev) => [...prev.slice(-499), log]);
  }, []);

  // ─── WebSocket setup ───────────────────────────────────────────────────────

  const connectSockets = useCallback(
    (p: WorkspaceProfile, aliceToken: string, bobToken: string) => {
      // Tear down any existing connections first
      aliceSocketRef.current?.disconnect();
      bobSocketRef.current?.disconnect();

      function makeSocket(token: string, actor: "alice" | "bob"): Socket {
        const socket = io(WS_URL, {
          auth: { token },
          transports: ["websocket"],
          reconnection: true,
          reconnectionDelay: 1000,
        });

        socket.on("connect", () => {
          addLog(
            makeLog(
              "info",
              `WebSocket authenticated — tenant: ${p.tenantId}`,
              actor,
              `socket_id: ${socket.id}`,
            ),
          );
        });

        socket.on("connect_error", (err) => {
          addLog(
            makeLog(
              "error",
              `WebSocket connection failed: ${err.message}`,
              actor,
            ),
          );
        });

        socket.on("entity:updated", (payload: WsEntityUpdatedPayload) => {
          // Sync entity state from Redis pub/sub broadcast
          setEntities((prev) =>
            prev.map((e) =>
              e.id === payload.entity_id
                ? {
                    ...e,
                    currentState: payload.new_state,
                    version: payload.version,
                    attributes: { ...e.attributes, ...payload.attributes },
                    updatedAt: payload.timestamp,
                  }
                : e,
            ),
          );

          addLog(
            makeLog(
              "success",
              `entity:updated — ${payload.entity_id.slice(0, 8)}… ${payload.old_state} → ${payload.new_state}`,
              actor,
              `v${payload.version} · actor: ${payload.actor_id}`,
            ),
          );

          addLog(
            makeLog(
              "telemetry",
              `Redis pub/sub broadcast received`,
              actor,
              `channel: tenant:${payload.tenant_id}:stream`,
            ),
          );
        });

        socket.on("mutation:collision", (payload) => {
          addLog(
            makeLog(
              "collision",
              `mutation:collision received — entity: ${payload.entity_id?.slice(0, 8)}…`,
              actor,
              `stale_version: ${payload.stale_version}`,
            ),
          );
        });

        socket.on("disconnect", (reason) => {
          addLog(
            makeLog("telemetry", `WebSocket disconnected: ${reason}`, actor),
          );
        });

        return socket;
      }

      aliceSocketRef.current = makeSocket(aliceToken, "alice");
      bobSocketRef.current = makeSocket(bobToken, "bob");
    },
    [addLog],
  );

  // ─── Load profile ──────────────────────────────────────────────────────────

  const loadProfile = useCallback(
    async (p: WorkspaceProfile) => {
      setLoading(true);
      setEntities([]);
      setBlueprint(null);
      setTokens(null);
      setAliceCollisionOutcome("idle");
      setBobCollisionOutcome("idle");
      setCollisionEntityId(undefined);

      addLog(
        makeLog(
          "info",
          `Loading workspace: ${p.label}`,
          "system",
          `tenant: ${p.tenantId}`,
        ),
      );

      // ── Step 1: Issue fresh tokens for Alice and Bob ─────────────────────
      // Both are dispatchers so they can perform any dispatcher-allowed transition.
      // The API key must be registered in Stratum first (POST /tenants/register).
      addLog(makeLog("info", "Issuing tokens for Alice + Bob…", "system"));

      let aliceToken: string;
      let bobToken: string;

      try {
        const [a, b] = await Promise.all([
          issueToken(p.apiKey, "dispatcher", "alice"),
          issueToken(p.apiKey, "dispatcher", "bob"),
        ]);
        aliceToken = a;
        bobToken = b;
        setTokens({ alice: aliceToken, bob: bobToken });
        addLog(
          makeLog(
            "success",
            "Tokens issued — alice + bob authenticated",
            "system",
          ),
        );
      } catch (err: any) {
        addLog(
          makeLog(
            "error",
            `Token issuance failed: ${err.message}. Check that the API key in profiles.ts is correct and the tenant is registered.`,
            "system",
          ),
        );
        setLoading(false);
        return;
      }

      // ── Step 2: Connect WebSockets using fresh tokens ────────────────────
      connectSockets(p, aliceToken, bobToken);

      // ── Step 3: Fetch or upload blueprint ────────────────────────────────
      const existingBlueprint = await fetchActiveBlueprint(aliceToken);

      if (existingBlueprint) {
        setBlueprint(existingBlueprint);
        addLog(
          makeLog(
            "telemetry",
            `Blueprint fetched — ${existingBlueprint.transitions.length} transitions`,
            "system",
          ),
        );
      } else {
        addLog(
          makeLog(
            "info",
            "No blueprint found — uploading pre-baked config…",
            "system",
          ),
        );
        try {
          await uploadBlueprint(aliceToken, p.blueprint);
          setBlueprint(p.blueprint);
          addLog(
            makeLog(
              "success",
              "Blueprint uploaded and cached in Redis",
              "system",
            ),
          );
        } catch (err: any) {
          addLog(
            makeLog(
              "error",
              `Blueprint upload failed: ${err.message}`,
              "system",
            ),
          );
        }
      }

      // ── Step 4: Fetch existing entities or seed demo data ────────────────
      const existing = await fetchEntities(aliceToken, p.entityType);

      if (existing.length > 0) {
        setEntities(existing);
        addLog(
          makeLog(
            "telemetry",
            `Hydrated ${existing.length} entities from database`,
            "system",
          ),
        );
      } else {
        addLog(makeLog("info", "Seeding demo entities…", "system"));
        const seeded: WorkflowEntity[] = [];

        for (const seed of p.seedEntities) {
          try {
            const e = await createEntity(
              aliceToken,
              p.entityType,
              seed.initial_state,
              seed.attributes,
            );
            seeded.push(e);
            addLog(
              makeLog(
                "success",
                `Entity created — ${e.id.slice(0, 8)}… state: ${e.currentState}`,
                "system",
              ),
            );
          } catch (err: any) {
            addLog(makeLog("error", `Seed failed: ${err.message}`, "system"));
          }
        }

        setEntities(seeded);
      }

      setLoading(false);
    },
    [connectSockets, addLog],
  );

  // ─── Profile switch ────────────────────────────────────────────────────────

  function handleProfileChange(p: WorkspaceProfile) {
    setProfile(p);
    loadProfile(p);
  }

  // ─── Initial load ──────────────────────────────────────────────────────────

  useEffect(() => {
    loadProfile(DEFAULT_PROFILE);
    return () => {
      aliceSocketRef.current?.disconnect();
      bobSocketRef.current?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Manual mutation (from mutate modal) ──────────────────────────────────

  async function handleMutateConfirm(
    rule: TransitionRule,
    payload: Record<string, unknown>,
  ) {
    if (!mutateTarget || !tokens) return;
    const { entity, actor } = mutateTarget;
    setMutateTarget(null);

    const token = actor === "alice" ? tokens.alice : tokens.bob;

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
  }

  // ─── Collision simulation ──────────────────────────────────────────────────

  async function handleSimulateCollision() {
    if (!tokens || !blueprint) return;

    // Find the first entity that has an available transition
    const target = entities.find((e) =>
      blueprint.transitions.some((t) => t.from_state === e.currentState),
    );
    if (!target) return;

    const availableRule = blueprint.transitions.find(
      (t) => t.from_state === target.currentState,
    );
    if (!availableRule) return;

    setCollisionRunning(true);
    setCollisionEntityId(target.id);
    setAliceCollisionOutcome("idle");
    setBobCollisionOutcome("idle");

    // Build minimal valid payloads — Alice and Bob propose different values
    // for the same transition targeting the same entity at the same version
    const alicePayload: Record<string, unknown> = {};
    const bobPayload: Record<string, unknown> = {};

    Object.entries(availableRule.payload_schema).forEach(([key, schema]) => {
      if (schema.type === "string") {
        alicePayload[key] = key.includes("driver")
          ? "driver_mark"
          : `alice_${key}`;
        bobPayload[key] = key.includes("driver")
          ? "driver_sarah"
          : `bob_${key}`;
      } else if (schema.type === "number") {
        alicePayload[key] = 100;
        bobPayload[key] = 200;
      } else {
        alicePayload[key] = "alice";
        bobPayload[key] = "bob";
      }
    });

    addLog(
      makeLog(
        "info",
        `Collision race initiated — entity: ${target.id.slice(0, 8)}… v${target.version}`,
        "system",
        `both targeting: ${availableRule.from_state} → ${availableRule.to_state}`,
      ),
    );
    addLog(
      makeLog(
        "info",
        `Alice payload: ${JSON.stringify(alicePayload)}`,
        "alice",
      ),
    );
    addLog(
      makeLog("info", `Bob payload: ${JSON.stringify(bobPayload)}`, "bob"),
    );

    // Fire both mutations simultaneously — Promise.all dispatches them at
    // the exact same instant. Only one can win the OCC version check.
    const [aliceResult, bobResult] = await Promise.all([
      mutateEntity(
        tokens.alice,
        target.id,
        availableRule.from_state,
        availableRule.to_state,
        target.version,
        alicePayload,
      ),
      mutateEntity(
        tokens.bob,
        target.id,
        availableRule.from_state,
        availableRule.to_state,
        target.version,
        bobPayload,
      ),
    ]);

    // Determine winner and loser
    if (aliceResult.success) {
      setAliceCollisionOutcome("winner");
      setBobCollisionOutcome("loser");
      addLog(
        makeLog(
          "success",
          `Alice write committed — entity now v${aliceResult.entity?.version}`,
          "alice",
          `state: ${aliceResult.entity?.currentState}`,
        ),
      );
      addLog(
        makeLog(
          "collision",
          `Error 409: Mutation Rejected. Version mismatch detected at database row level.`,
          "bob",
          `expected v${target.version} · Bob arrived second`,
        ),
      );
    } else if (bobResult.success) {
      setBobCollisionOutcome("winner");
      setAliceCollisionOutcome("loser");
      addLog(
        makeLog(
          "success",
          `Bob write committed — entity now v${bobResult.entity?.version}`,
          "bob",
          `state: ${bobResult.entity?.currentState}`,
        ),
      );
      addLog(
        makeLog(
          "collision",
          `Error 409: Mutation Rejected. Version mismatch detected at database row level.`,
          "alice",
          `expected v${target.version} · Alice arrived second`,
        ),
      );
    } else {
      // Both failed — usually means the entity state changed between the
      // time we read it and when we fired — tell user to refresh
      setAliceCollisionOutcome("loser");
      setBobCollisionOutcome("loser");
      addLog(
        makeLog(
          "error",
          `Both mutations failed — entity state may have changed. Try again.`,
          "system",
        ),
      );
    }

    addLog(
      makeLog(
        "telemetry",
        `OCC barrier held — one atomic commit, one version rejection, zero dirty writes`,
        "system",
      ),
    );

    setCollisionRunning(false);

    // Clear collision highlight after 4 seconds
    setTimeout(() => {
      setAliceCollisionOutcome("idle");
      setBobCollisionOutcome("idle");
      setCollisionEntityId(undefined);
    }, 4000);
  }

  // ─── Derived ──────────────────────────────────────────────────────────────

  const availableTransitions = blueprint?.transitions ?? [];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="h-screen flex flex-col bg-slate-950 overflow-hidden">
      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm z-10">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="font-display text-base font-bold text-slate-100 tracking-tight leading-none">
              STRATUM
            </h1>
            <p className="font-mono text-[9px] text-slate-600 mt-0.5">
              engine-as-a-service · showcase
            </p>
          </div>
          <div className="w-px h-8 bg-slate-800" />
          <ProfileSelector
            active={profile}
            onChange={handleProfileChange}
            loading={loading}
          />
        </div>

        <div className="flex items-center gap-4">
          {/* Token status indicator */}
          <div className="flex items-center gap-1.5">
            {tokens ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="font-mono text-[10px] text-slate-600">
                  tokens valid
                </span>
              </>
            ) : loading ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="font-mono text-[10px] text-slate-600">
                  authenticating…
                </span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span className="font-mono text-[10px] text-rose-500">
                  auth failed
                </span>
              </>
            )}
          </div>

          <div className="font-mono text-[10px] text-slate-600">
            <span className="text-slate-500">{profile.tenantId}</span>
            <span className="mx-1 text-slate-700">·</span>
            <span>{profile.entityType}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-slow" />
            <span className="font-mono text-[10px] text-slate-600">live</span>
          </div>
        </div>
      </header>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0">
        {/* ── Blueprint inspector sidebar ───────────────────────────────── */}
        <aside className="w-64 flex-shrink-0 border-r border-slate-800 flex flex-col min-h-0 overflow-hidden">
          <BlueprintInspector
            config={blueprint}
            loading={loading}
            tenantId={profile.tenantId}
          />
        </aside>

        {/* ── Center — collision trigger + dual operator columns ────────── */}
        <main className="flex-1 flex flex-col min-h-0 min-w-0">
          <CollisionSimulator
            onSimulate={handleSimulateCollision}
            running={collisionRunning}
            disabled={loading || !tokens}
            hasEntities={entities.length > 0}
          />

          {/* Dual columns */}
          <div className="flex-1 flex min-h-0">
            {/* Alice column */}
            <div className="flex-1 border-r border-slate-800 min-h-0 overflow-hidden flex flex-col">
              <EntityTable
                entities={entities}
                actor="alice"
                loading={loading}
                collisionEntityId={collisionEntityId}
                collisionOutcome={aliceCollisionOutcome}
                onMutate={(entity) =>
                  setMutateTarget({ entity, actor: "alice" })
                }
                availableTransitions={availableTransitions}
              />
            </div>

            {/* Bob column */}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <EntityTable
                entities={entities}
                actor="bob"
                loading={loading}
                collisionEntityId={collisionEntityId}
                collisionOutcome={bobCollisionOutcome}
                onMutate={(entity) => setMutateTarget({ entity, actor: "bob" })}
                availableTransitions={availableTransitions}
              />
            </div>
          </div>
        </main>
      </div>

      {/* ── Terminal ──────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 h-52 border-t border-slate-800 relative scanlines overflow-hidden">
        <Terminal logs={logs} />
      </div>

      {/* ── Mutate modal ──────────────────────────────────────────────────── */}
      {mutateTarget && blueprint && (
        <MutateModal
          entity={mutateTarget.entity}
          transitions={blueprint.transitions}
          actor={mutateTarget.actor}
          onConfirm={handleMutateConfirm}
          onClose={() => setMutateTarget(null)}
        />
      )}
    </div>
  );
}
