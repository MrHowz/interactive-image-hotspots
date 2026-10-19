// Development-only host emulator. This file is not an input to the production build.
import type { Item, Metadata, Shape } from "@owlbear-rodeo/sdk";
import { NS, SCENE_KEY } from "../src/model";
const panel = document.querySelector<HTMLIFrameElement>("#panel")!;
const modal = document.querySelector<HTMLIFrameElement>("#modal")!;
let role = "GM",
  scene = "test-a",
  mode = "DARK";
const seed = {
  id: "sample",
  createdUserId: "gm-test",
  lastModified: "2026-10-20",
  lastModifiedUserId: "gm-test",
  type: "SHAPE",
  shapeType: "CIRCLE",
  name: "The hidden garden",
  width: 80,
  height: 80,
  position: { x: 320, y: 240 },
  rotation: 0,
  scale: { x: 1, y: 1 },
  visible: true,
  locked: true,
  layer: "MAP",
  zIndex: 1,
  style: {
    fillColor: "#7dd3fc",
    fillOpacity: 0.14,
    strokeColor: "#38bdf8",
    strokeOpacity: 1,
    strokeWidth: 3,
    strokeDash: [],
  },
  metadata: {
    [NS]: {
      version: 1,
      url: "https://placehold.co/1200x800/png",
      enabled: true,
      players: true,
    },
  },
} as Shape;
const scenes: Record<string, { items: Item[]; metadata: Metadata }> =
  JSON.parse(localStorage.getItem("hotspot-test-harness") || "null") || {
    "test-a": { items: [seed], metadata: { [SCENE_KEY]: "test-a" } },
    "test-b": { items: [], metadata: { [SCENE_KEY]: "test-b" } },
  };
const current = () => scenes[scene];
function persist() {
  localStorage.setItem("hotspot-test-harness", JSON.stringify(scenes));
}
function url(view: string, extra: Record<string, string> = {}) {
  return `/index.html?${new URLSearchParams({ view, scene, obrref: btoa(`${location.origin} test-room`), ...extra })}`;
}
function ready(frame: HTMLIFrameElement) {
  frame.onload = () =>
    frame.contentWindow?.postMessage(
      { id: "OBR_READY", data: { ref: "test", userId: "gm-test" } },
      location.origin,
    );
}
[panel, modal].forEach(ready);
panel.src = url("");
function event(id: string, data: unknown) {
  for (const frame of [panel, modal])
    frame.contentWindow?.postMessage({ id, data }, location.origin);
}
function status() {
  document.querySelector("#status")!.textContent =
    `${role} · ${scene} · ${current().items.length} items`;
}
window.addEventListener("message", (e) => {
  if (
    e.origin !== location.origin ||
    ![panel.contentWindow, modal.contentWindow].includes(e.source as Window)
  )
    return;
  const { id, data, nonce } = e.data;
  if (!nonce) return;
  let response: unknown = {};
  switch (id) {
    case "OBR_SCENE_IS_READY":
      response = { ready: true };
      break;
    case "OBR_PLAYER_GET_ROLE":
      response = { role };
      break;
    case "OBR_THEME_GET_THEME":
      response = { theme: { mode } };
      break;
    case "OBR_SCENE_GET_METADATA":
      response = { metadata: current().metadata };
      break;
    case "OBR_SCENE_ITEMS_GET_ALL_ITEMS":
      response = { items: current().items };
      break;
    case "OBR_SCENE_ITEMS_GET_ITEMS":
      response = {
        items: current().items.filter((i) => data.ids.includes(i.id)),
      };
      break;
    case "OBR_SCENE_ITEMS_ADD_ITEMS":
      current().items.push(...data.items);
      persist();
      event("OBR_SCENE_ITEMS_EVENT_CHANGE", { items: current().items });
      break;
    case "OBR_SCENE_ITEMS_UPDATE_ITEMS":
      for (const update of data.updates) {
        const item = current().items.find((i) => i.id === update.id);
        if (item) Object.assign(item, update);
      }
      persist();
      event("OBR_SCENE_ITEMS_EVENT_CHANGE", { items: current().items });
      break;
    case "OBR_SCENE_ITEMS_DELETE_ITEMS":
      current().items = current().items.filter((i) => !data.ids.includes(i.id));
      persist();
      event("OBR_SCENE_ITEMS_EVENT_CHANGE", { items: current().items });
      break;
    case "OBR_MODAL_OPEN":
      modal.hidden = false;
      modal.src =
        new URL(data.url).pathname +
        new URL(data.url).search +
        `&obrref=${encodeURIComponent(btoa(`${location.origin} test-room`))}`;
      break;
    case "OBR_MODAL_CLOSE":
      modal.hidden = true;
      modal.src = "about:blank";
      break;
  }
  (e.source as Window)?.postMessage(
    { id: `${id}_RESPONSE${nonce}`, data: response },
    location.origin,
  );
  status();
});
document.querySelector("#create")!.addEventListener("click", () => {
  modal.hidden = false;
  modal.src = url("editor", { x: "320", y: "240" });
});
document.querySelector("#role")!.addEventListener("click", () => {
  role = role === "GM" ? "PLAYER" : "GM";
  event("OBR_PLAYER_EVENT_CHANGE", { player: { role } });
  status();
});
document.querySelector("#scene")!.addEventListener("click", () => {
  scene = scene === "test-a" ? "test-b" : "test-a";
  event("OBR_SCENE_EVENT_READY_CHANGE", { ready: false });
  event("OBR_SCENE_EVENT_READY_CHANGE", { ready: true });
  status();
});
document.querySelector("#theme")!.addEventListener("click", () => {
  mode = mode === "DARK" ? "LIGHT" : "DARK";
  event("OBR_THEME_EVENT_CHANGE", { theme: { mode } });
});
status();
