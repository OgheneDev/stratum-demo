import { useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { WS_URL } from "@/types/dashboard";
import type { LogEntry, WsEntityUpdatedPayload } from "@/types";
import { makeLog } from "@/lib/logger";

export function useWebSocketManager() {
  const addLog = useCallback((log: LogEntry) => {
    // This will be connected to parent's log state
    // We'll use a callback pattern
  }, []);

  function makeSocket(
    token: string,
    actor: "alice" | "bob",
    profileId: string,
    tenantId: string,
    onEntityUpdate: (payload: WsEntityUpdatedPayload) => void,
  ): Socket {
    const socket = io(WS_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () =>
      addLog(
        makeLog(
          "info",
          `WebSocket authenticated — tenant: ${tenantId}`,
          actor,
          `socket_id: ${socket.id}`,
        ),
      ),
    );

    socket.on("connect_error", (err) =>
      addLog(
        makeLog("error", `WebSocket connection failed: ${err.message}`, actor),
      ),
    );

    socket.on("entity:updated", onEntityUpdate);

    socket.on("mutation:collision", (payload) =>
      addLog(
        makeLog(
          "collision",
          `mutation:collision — entity: ${payload.entity_id?.slice(0, 8)}…`,
          actor,
          `stale_version: ${payload.stale_version}`,
        ),
      ),
    );

    socket.on("disconnect", (reason) =>
      addLog(makeLog("telemetry", `WebSocket disconnected: ${reason}`, actor)),
    );

    return socket;
  }

  return { makeSocket };
}
