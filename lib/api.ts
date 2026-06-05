import type { WorkflowEntity, BlueprintConfig } from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// ─── Internal helper ──────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw { status: res.status, ...data.error };
  }

  return data;
}

// ─── Tenants ──────────────────────────────────────────────────────────────────

export async function registerTenant(
  name: string,
): Promise<{ tenant: { id: string; name: string }; api_key: string }> {
  const res = await fetch(`${BASE}/tenants/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "Registration failed");
  return data.data;
}

/**
 * Exchanges a raw API key for a signed JWT.
 * Called at boot and on every profile switch — never cached to disk.
 * role and actor_id come from the dashboard's static actor definitions.
 */
export async function issueToken(
  apiKey: string,
  role: string,
  actorId: string,
): Promise<string> {
  const res = await fetch(`${BASE}/tenants/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, role, actor_id: actorId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "Token issuance failed");
  return data.data.token;
}

// ─── Blueprints ───────────────────────────────────────────────────────────────

export async function uploadBlueprint(
  token: string,
  config: BlueprintConfig,
): Promise<void> {
  await request(`/blueprints`, token, {
    method: "POST",
    body: JSON.stringify(config),
  });
}

export async function fetchActiveBlueprint(
  token: string,
): Promise<BlueprintConfig | null> {
  try {
    const data = await request<{
      data: { blueprint: { config: BlueprintConfig } };
    }>(`/blueprints/active`, token);
    return data.data.blueprint.config;
  } catch {
    return null;
  }
}

// ─── Entities ─────────────────────────────────────────────────────────────────

export async function fetchEntities(
  token: string,
  entityType?: string,
): Promise<WorkflowEntity[]> {
  try {
    const qs = entityType ? `?entity_type=${entityType}` : "";
    const data = await request<{ data: { entities: WorkflowEntity[] } }>(
      `/entities${qs}`,
      token,
    );
    return data.data.entities;
  } catch {
    return [];
  }
}

export async function createEntity(
  token: string,
  entityType: string,
  initialState: string,
  attributes: Record<string, unknown>,
): Promise<WorkflowEntity> {
  const data = await request<{ data: { entity: WorkflowEntity } }>(
    `/entities`,
    token,
    {
      method: "POST",
      body: JSON.stringify({
        entity_type: entityType,
        initial_state: initialState,
        attributes,
      }),
    },
  );
  return data.data.entity;
}

export async function mutateEntity(
  token: string,
  entityId: string,
  fromState: string,
  toState: string,
  version: number,
  payload: Record<string, unknown>,
): Promise<{
  success: boolean;
  entity?: WorkflowEntity;
  error?: { code: string; message: string; stale_version?: number };
}> {
  try {
    const data = await request<{ data: { entity: WorkflowEntity } }>(
      `/entities/${entityId}/mutate`,
      token,
      {
        method: "POST",
        body: JSON.stringify({
          from_state: fromState,
          to_state: toState,
          version,
          payload,
        }),
      },
    );
    return { success: true, entity: data.data.entity };
  } catch (err: any) {
    return {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        stale_version: err.stale_version,
      },
    };
  }
}
