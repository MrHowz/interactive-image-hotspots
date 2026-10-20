import { useEffect, useState } from "react";
import { OBR } from "./sdk";
import { NS, TOOL, VIEW } from "./model";
import type { AreaKind } from "./areas";
export const CHANNEL = `${NS}/drawing-control-v3`;
export const modeId = (kind: AreaKind) => `${NS}/draw-${kind}`;
export type ToolStatus = { mode: string; count: number; message: string };
export function activate(kind: AreaKind | "explore") {
  return OBR.tool.activateMode(TOOL, kind === "explore" ? VIEW : modeId(kind));
}
export function command(action: "finish" | "cancel" | "status") {
  return OBR.broadcast.sendMessage(
    CHANNEL,
    { action },
    { destination: "LOCAL" },
  );
}
export function useToolStatus() {
  const [state, set] = useState<ToolStatus>({
    mode: "",
    count: 0,
    message: "",
  });
  useEffect(() => {
    let live = true;
    const stops: (() => void)[] = [];
    OBR.onReady(() => {
      if (!live) return;
      stops.push(
        OBR.tool.onToolModeChange((mode) => {
          if (live) set((s) => ({ ...s, mode: mode ?? "" }));
        }),
        OBR.broadcast.onMessage(CHANNEL, (event) => {
          const d = event.data as { state?: ToolStatus };
          if (live && d.state) set(d.state);
        }),
      );
      void OBR.tool.getActiveToolMode().then((mode) => {
        if (live) set((s) => ({ ...s, mode: mode ?? "" }));
      });
      void command("status");
    });
    return () => {
      live = false;
      stops.forEach((stop) => stop());
    };
  }, []);
  return state;
}
