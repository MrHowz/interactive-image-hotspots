import { NS, type Selection } from "./model.ts";
export const CONTROL = `${NS}/control`;
export type ControlState = { active: boolean; count: number; scene?: string };
export type ControlCommand =
  "start" | "finish" | "cancel" | "explore" | "status";
export type ControlRequest = {
  kind: "request";
  requestId: string;
  command: ControlCommand;
  selection?: Selection;
};
export type ControlReply = {
  kind: "reply";
  requestId: string;
  ok: boolean;
  state?: ControlState;
  error?: string;
};
export type ControlPort = {
  subscribe: (callback: (data: unknown) => void) => () => void;
  send: (data: unknown) => Promise<void>;
};
export function controlState(value: unknown): ControlState | undefined {
  if (!value || typeof value !== "object") return;
  const s = value as ControlState;
  if (
    typeof s.active === "boolean" &&
    Number.isSafeInteger(s.count) &&
    s.count >= 0 &&
    s.count <= 512 &&
    (s.scene === undefined || typeof s.scene === "string")
  )
    return s;
}
export function requestControl(
  port: ControlPort,
  command: ControlCommand,
  selection?: Selection,
  timeoutMs = 7000,
): Promise<ControlState> {
  const request: ControlRequest = {
    kind: "request",
    requestId: crypto.randomUUID(),
    command,
    ...(selection ? { selection } : {}),
  };
  return new Promise((resolve, reject) => {
    let done = false,
      stop: () => void = () => {};
    const timer = setTimeout(
      () =>
        finish(
          new Error(
            "Hotspot background did not respond. Refresh the room once after deployment and reopen the panel.",
          ),
        ),
      timeoutMs,
    );
    function finish(error?: Error, state?: ControlState) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      stop();
      if (error) reject(error);
      else resolve(state!);
    }
    stop = port.subscribe((value) => {
      if (!value || typeof value !== "object") return;
      const reply = value as ControlReply;
      if (reply.kind !== "reply" || reply.requestId !== request.requestId)
        return;
      const state = controlState(reply.state);
      if (reply.ok && state) finish(undefined, state);
      else
        finish(
          new Error(
            typeof reply.error === "string"
              ? reply.error
              : "Invalid response from the hotspot background.",
          ),
        );
    });
    try {
      void port
        .send(request)
        .catch((e) =>
          finish(
            e instanceof Error
              ? e
              : new Error("Could not send hotspot command."),
          ),
        );
    } catch (e) {
      finish(
        e instanceof Error ? e : new Error("Could not send hotspot command."),
      );
    }
  });
}
