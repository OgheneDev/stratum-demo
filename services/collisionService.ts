import type {
  WorkflowEntity,
  BlueprintConfig,
  ProfileTokens,
  LogEntry,
  TransitionRule,
} from "@/types";
import { fetchEntities, mutateEntity } from "@/lib/api";
import { makeLog } from "@/lib/logger";

export class CollisionService {
  constructor(private addLog: (log: LogEntry) => void) {}

  async simulateCollision(
    tokens: ProfileTokens,
    blueprint: BlueprintConfig,
    entityType: string,
    profileId: string,
    aliceRole: string,
    bobRole: string,
    onEntityUpdate: (profileId: string, entities: WorkflowEntity[]) => void,
    onOutcomeUpdate: (
      alice: "idle" | "winner" | "loser",
      bob: "idle" | "winner" | "loser",
      entityId?: string,
    ) => void,
  ): Promise<void> {
    // Fetch fresh entities
    const freshEntities = await fetchEntities(tokens.alice, entityType);
    if (freshEntities.length > 0) {
      onEntityUpdate(profileId, freshEntities);
    }

    // Find target and rule
    const { target, rule } = this.findCollisionTarget(
      freshEntities,
      blueprint,
      aliceRole,
      bobRole,
    );

    if (!target || !rule) {
      this.addLog(
        makeLog(
          "error",
          "No entity in a mutable state for current actors — all may be at terminal states",
          "system",
        ),
      );
      return;
    }

    // Set up collision state
    onOutcomeUpdate("idle", "idle", target.id);

    const alicePayload = this.buildPayload(rule, "alice");
    const bobPayload = this.buildPayload(rule, "bob");

    this.logCollisionStart(target, rule, alicePayload, bobPayload);

    // Execute parallel mutations
    const [aliceResult, bobResult] = await Promise.all([
      mutateEntity(
        tokens.alice,
        target.id,
        rule.from_state,
        rule.to_state,
        target.version,
        alicePayload,
      ),
      mutateEntity(
        tokens.bob,
        target.id,
        rule.from_state,
        rule.to_state,
        target.version,
        bobPayload,
      ),
    ]);

    // Process results
    this.processCollisionResults(
      aliceResult,
      bobResult,
      target,
      onOutcomeUpdate,
    );
  }

  private findCollisionTarget(
    entities: WorkflowEntity[],
    blueprint: BlueprintConfig,
    aliceRole: string,
    bobRole: string,
  ): { target: WorkflowEntity | null; rule: TransitionRule | null } {
    // Try to find a transition both can perform
    let target = entities.find((e) =>
      blueprint.transitions.some(
        (t) =>
          t.from_state === e.currentState &&
          t.allowed_roles.includes(aliceRole) &&
          t.allowed_roles.includes(bobRole),
      ),
    );

    let rule = target
      ? blueprint.transitions.find(
          (t) =>
            t.from_state === target!.currentState &&
            t.allowed_roles.includes(aliceRole) &&
            t.allowed_roles.includes(bobRole),
        )
      : undefined;

    // Fallback: find any transition Alice can do
    if (!target || !rule) {
      target = entities.find((e) =>
        blueprint.transitions.some(
          (t) =>
            t.from_state === e.currentState &&
            t.allowed_roles.includes(aliceRole),
        ),
      );
      rule = target
        ? blueprint.transitions.find(
            (t) =>
              t.from_state === target!.currentState &&
              t.allowed_roles.includes(aliceRole),
          )
        : undefined;
    }

    return { target: target || null, rule: rule || null };
  }

  private buildPayload(
    rule: TransitionRule,
    prefix: string,
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    Object.entries(rule.payload_schema).forEach(([key, schema]) => {
      if (schema.type === "string") {
        payload[key] = key.includes("driver")
          ? `${prefix}_driver`
          : `${prefix}_${key}`;
      } else if (schema.type === "number") {
        payload[key] = prefix === "alice" ? 100 : 200;
      } else {
        payload[key] = prefix;
      }
    });
    return payload;
  }

  private logCollisionStart(
    target: WorkflowEntity,
    rule: TransitionRule,
    alicePayload: Record<string, unknown>,
    bobPayload: Record<string, unknown>,
  ) {
    this.addLog(
      makeLog(
        "info",
        `Collision race — entity: ${target.id.slice(0, 8)}… v${target.version}`,
        "system",
        `targeting: ${rule.from_state} → ${rule.to_state}`,
      ),
    );
    this.addLog(
      makeLog(
        "info",
        `Alice payload: ${JSON.stringify(alicePayload)}`,
        "alice",
      ),
    );
    this.addLog(
      makeLog("info", `Bob payload: ${JSON.stringify(bobPayload)}`, "bob"),
    );
  }

  private processCollisionResults(
    aliceResult: any,
    bobResult: any,
    target: WorkflowEntity,
    onOutcomeUpdate: (
      alice: "idle" | "winner" | "loser",
      bob: "idle" | "winner" | "loser",
      entityId?: string,
    ) => void,
  ) {
    if (aliceResult.success) {
      onOutcomeUpdate("winner", "loser", target.id);
      this.addLog(
        makeLog(
          "success",
          `Alice committed — v${aliceResult.entity?.version}`,
          "alice",
          `state: ${aliceResult.entity?.currentState}`,
        ),
      );
    } else if (bobResult.success) {
      onOutcomeUpdate("loser", "winner", target.id);
      this.addLog(
        makeLog(
          "success",
          `Bob committed — v${bobResult.entity?.version}`,
          "bob",
          `state: ${bobResult.entity?.currentState}`,
        ),
      );
    } else {
      onOutcomeUpdate("loser", "loser", target.id);
      this.addLog(
        makeLog(
          "error",
          `Both mutations failed — entity state may have changed. Try again.`,
          "system",
        ),
      );
    }

    this.addLog(
      makeLog(
        "telemetry",
        `OCC barrier held — one atomic commit, one version rejection`,
        "system",
      ),
    );
  }
}
