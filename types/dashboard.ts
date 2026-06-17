import { Socket } from "socket.io-client";
import type { WorkflowEntity, BlueprintConfig, ProfileTokens } from "@/types";

export interface ProfileCache {
  tokens: ProfileTokens;
  blueprint: BlueprintConfig;
  entities: WorkflowEntity[];
  aliceSocket: Socket;
  bobSocket: Socket;
}

export interface MutateTarget {
  entity: WorkflowEntity;
  actor: "alice" | "bob";
}

export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:4000";
