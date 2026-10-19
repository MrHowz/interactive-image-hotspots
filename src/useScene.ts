import { useEffect, useState } from "react";
import type { Item } from "@owlbear-rodeo/sdk";
import { OBR, sceneId } from "./sdk";
import { hotspots, SCENE_KEY, type Hotspot } from "./model";
export function useScene() {
  const [state, set] = useState<{
    connected: boolean;
    ready: boolean;
    gm: boolean;
    scene: string;
    items: Hotspot[];
    error: string;
  }>({
    connected: false,
    ready: false,
    gm: false,
    scene: "",
    items: [],
    error: "",
  });
  useEffect(() => {
    let live = true,
      generation = 0,
      revision = 0,
      lastRole: string | undefined;
    const stops: (() => void)[] = [];
    const fail = (e: unknown) => {
      if (live)
        set((s) => ({
          ...s,
          error: e instanceof Error ? e.message : "Unable to connect.",
        }));
    };
    const read = async (): Promise<void> => {
      const g = ++generation,
        r = revision;
      const ready = await OBR.scene.isReady();
      const gm = (await OBR.player.getRole()) === "GM";
      lastRole = gm ? "GM" : "PLAYER";
      const scene = ready ? await sceneId() : "";
      const items = ready ? hotspots(await OBR.scene.items.getItems()) : [];
      if (live && g === generation) {
        if (r !== revision) return read();
        set({
          connected: true,
          ready,
          gm,
          scene: scene || "",
          items,
          error: "",
        });
      }
    };
    OBR.onReady(() => {
      if (!live) return;
      stops.push(
        OBR.scene.onReadyChange(() => {
          revision++;
          set((s) => ({ ...s, ready: false, scene: "", items: [] }));
          void read().catch(fail);
        }),
        OBR.scene.items.onChange((items: Item[]) => {
          revision++;
          if (live)
            set((s) => (s.ready ? { ...s, items: hotspots(items) } : s));
        }),
        OBR.scene.onMetadataChange((m) => {
          if (live)
            set((s) => ({
              ...s,
              scene:
                typeof m[SCENE_KEY] === "string"
                  ? (m[SCENE_KEY] as string)
                  : "",
            }));
        }),
        OBR.player.onChange((player) => {
          if (player.role !== lastRole) void read().catch(fail);
        }),
        OBR.theme.onChange((t) => {
          document.documentElement.dataset.theme = t.mode.toLowerCase();
        }),
      );
      void OBR.theme
        .getTheme()
        .then((t) => {
          if (live)
            document.documentElement.dataset.theme = t.mode.toLowerCase();
        })
        .catch(fail);
      void read().catch(fail);
    });
    return () => {
      live = false;
      stops.forEach((stop) => stop());
    };
  }, []);
  return state;
}
