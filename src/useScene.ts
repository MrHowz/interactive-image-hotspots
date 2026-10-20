import { useEffect, useState } from "react";
import type { Item } from "@owlbear-rodeo/sdk";
import { OBR, sceneId } from "./sdk";
import { SCENE_KEY, type Hotspot } from "./model";
export function useScene() {
  const [state, set] = useState<{
    connected: boolean;
    ready: boolean;
    gm: boolean;
    scene: string;
    items: Hotspot[];
    selected: string[];
    error: string;
  }>({
    connected: false,
    ready: false,
    gm: false,
    scene: "",
    items: [],
    selected: [],
    error: "",
  });
  useEffect(() => {
    let live = true,
      generation = 0,
      revision = 0,
      lastRole: string | undefined;
    let latestItems: Hotspot[] | undefined;
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
      if (!live || g !== generation) return;
      const gm = (await OBR.player.getRole()) === "GM";
      if (!live || g !== generation) return;
      lastRole = gm ? "GM" : "PLAYER";
      const scene = ready ? await sceneId() : "";
      if (!live || g !== generation) return;
      const items = ready ? await OBR.scene.items.getItems() : [];
      const selected = ready ? ((await OBR.player.getSelection()) ?? []) : [];
      if (live && g === generation) {
        set({
          connected: true,
          ready,
          gm,
          scene: scene || "",
          // Item subscriptions already contain a full snapshot. Reuse it
          // instead of recursively fetching during continuous scene updates.
          items: ready ? (r !== revision ? (latestItems ?? items) : items) : [],
          selected,
          error: "",
        });
      }
    };
    OBR.onReady(() => {
      if (!live) return;
      stops.push(
        OBR.scene.onReadyChange(() => {
          revision++;
          latestItems = undefined;
          set((s) => ({
            ...s,
            ready: false,
            scene: "",
            items: [],
            selected: [],
          }));
          void read().catch(fail);
        }),
        OBR.scene.items.onChange((items: Item[]) => {
          revision++;
          latestItems = items;
          if (live) set((s) => (s.ready ? { ...s, items: latestItems! } : s));
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
          if (live) set((s) => ({ ...s, selected: player.selection ?? [] }));
          if (player.role !== lastRole) {
            lastRole = player.role;
            void read().catch(fail);
          }
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
