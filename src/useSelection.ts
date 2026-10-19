import { useEffect, useState } from "react";
import OBR from "@owlbear-rodeo/sdk";
import { control, localControl } from "./control";
import { controlState, type ControlState } from "./controlProtocol";
export function useSelection() {
  const [state, set] = useState<ControlState>({ active: false, count: 0 });
  useEffect(() => {
    let live = true,
      revision = 0,
      stop = () => {};
    OBR.onReady(() => {
      if (!live) return;
      stop = localControl.subscribe((value) => {
        if (
          !value ||
          typeof value !== "object" ||
          (value as { kind?: string }).kind !== "state"
        )
          return;
        const next = controlState((value as { state?: unknown }).state);
        if (live && next) {
          revision++;
          set(next);
        }
      });
      const r = revision;
      void control("status")
        .then((next) => {
          if (live && r === revision) set(next);
        })
        .catch(() => {
          /* Explicit commands display actionable failures. */
        });
    });
    return () => {
      live = false;
      stop();
    };
  }, []);
  return state;
}
