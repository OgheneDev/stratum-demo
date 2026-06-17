import type {
  WorkspaceProfile,
  WorkflowEntity,
  BlueprintConfig,
  LogEntry,
  ProfileTokens,
} from "@/types";
import {
  issueToken,
  fetchActiveBlueprint,
  fetchEntities,
  uploadBlueprint,
  createEntity,
} from "@/lib/api";
import { makeLog } from "@/lib/logger";
import type { ProfileCache } from "@/types/dashboard";

export class ProfileBootService {
  constructor(
    private addLog: (log: LogEntry) => void,
    private makeSocket: (
      token: string,
      actor: "alice" | "bob",
      profileId: string,
      tenantId: string,
    ) => any,
  ) {}

  async bootProfile(
    p: WorkspaceProfile,
    onEntityUpdate: (payload: any) => void,
  ): Promise<ProfileCache | null> {
    this.addLog(
      makeLog(
        "info",
        `Booting workspace: ${p.label}`,
        "system",
        `tenant: ${p.tenantId}`,
      ),
    );

    try {
      // Issue tokens
      const tokens = await this.issueTokens(p);

      // Connect sockets
      const aliceSocket = this.makeSocket(
        tokens.alice,
        "alice",
        p.id,
        p.tenantId,
      );
      const bobSocket = this.makeSocket(tokens.bob, "bob", p.id, p.tenantId);

      // Set up entity update handlers
      aliceSocket.on("entity:updated", onEntityUpdate);
      bobSocket.on("entity:updated", onEntityUpdate);

      // Fetch blueprint and entities
      const [blueprint, entities] =
        await this.fetchOrCreateBlueprintAndEntities(p, tokens);

      // Store result
      const cache: ProfileCache = {
        tokens,
        blueprint,
        entities,
        aliceSocket,
        bobSocket,
      };

      this.addLog(
        makeLog(
          "success",
          `${p.label} — boot complete (${entities.length} entities, ${blueprint.transitions.length} transitions)`,
          "system",
        ),
      );

      return cache;
    } catch (error: any) {
      this.addLog(
        makeLog(
          "error",
          `${p.label} — boot failed: ${error.message}`,
          "system",
        ),
      );
      return null;
    }
  }

  private async issueTokens(p: WorkspaceProfile): Promise<ProfileTokens> {
    const [aliceToken, bobToken] = await Promise.all([
      issueToken(p.apiKey, p.alice.role, p.alice.id),
      issueToken(p.apiKey, p.bob.role, p.bob.id),
    ]);
    return { alice: aliceToken, bob: bobToken };
  }

  private async fetchOrCreateBlueprintAndEntities(
    p: WorkspaceProfile,
    tokens: ProfileTokens,
  ): Promise<[BlueprintConfig, WorkflowEntity[]]> {
    const [existingBlueprint, existingEntities] = await Promise.all([
      fetchActiveBlueprint(tokens.alice),
      fetchEntities(tokens.alice, p.entityType),
    ]);

    // Handle blueprint
    let blueprint: BlueprintConfig;
    if (existingBlueprint) {
      blueprint = existingBlueprint;
      this.addLog(
        makeLog(
          "telemetry",
          `${p.label} — blueprint fetched (${blueprint.transitions.length} transitions)`,
          "system",
        ),
      );
    } else {
      blueprint = await this.uploadBlueprint(p, tokens.alice);
    }

    // Handle entities
    let entities: WorkflowEntity[];
    if (existingEntities.length > 0) {
      entities = existingEntities;
      this.addLog(
        makeLog(
          "telemetry",
          `${p.label} — hydrated ${entities.length} entities`,
          "system",
        ),
      );
    } else {
      entities = await this.seedEntities(p, tokens.alice);
    }

    return [blueprint, entities];
  }

  private async uploadBlueprint(
    p: WorkspaceProfile,
    token: string,
  ): Promise<BlueprintConfig> {
    this.addLog(makeLog("info", `${p.label} — uploading blueprint…`, "system"));
    try {
      await uploadBlueprint(token, p.blueprint);
      this.addLog(
        makeLog("success", `${p.label} — blueprint uploaded`, "system"),
      );
      return p.blueprint;
    } catch (error: any) {
      this.addLog(
        makeLog(
          "error",
          `${p.label} — blueprint upload failed: ${error.message}`,
          "system",
        ),
      );
      return p.blueprint;
    }
  }

  private async seedEntities(
    p: WorkspaceProfile,
    token: string,
  ): Promise<WorkflowEntity[]> {
    this.addLog(makeLog("info", `${p.label} — seeding entities…`, "system"));
    const seeded = await Promise.all(
      p.seedEntities.map(async (seed) => {
        try {
          return await createEntity(
            token,
            p.entityType,
            seed.initial_state,
            seed.attributes,
          );
        } catch {
          return null;
        }
      }),
    );
    const entities = seeded.filter(Boolean) as WorkflowEntity[];
    this.addLog(
      makeLog(
        "success",
        `${p.label} — seeded ${entities.length} entities`,
        "system",
      ),
    );
    return entities;
  }
}
