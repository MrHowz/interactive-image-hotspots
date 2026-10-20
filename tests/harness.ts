// Development-only simulated SDK host; excluded from production build.
import { type Item, type Metadata } from "@owlbear-rodeo/sdk";
import { NS, SCENE_KEY } from "../src/model";
const panel = document.querySelector<HTMLIFrameElement>("#panel")!;
const modal = document.querySelector<HTMLIFrameElement>("#modal")!;
const background = document.createElement("iframe");
background.id = "background";
document.body.append(background);
const frames = [panel, modal, background];
const base = {
  createdUserId: "gm-test",
  lastModified: "2026-10-20",
  lastModifiedUserId: "gm-test",
  position: { x: 100, y: 100 },
  rotation: 0,
  scale: { x: 1, y: 1 },
  visible: true,
  locked: false,
  disableHit: false,
  zIndex: 1,
  metadata: { other: { keep: true } },
};
const token = {
  ...base,
  id: "token",
  type: "IMAGE",
  name: "Guardian token",
  layer: "CHARACTER",
  image: {
    url: "https://placehold.co/80/png",
    mime: "image/png",
    width: 80,
    height: 80,
  },
  grid: { dpi: 100, offset: { x: 0, y: 0 } },
} as Item;
const drawing = {
  ...base,
  id: "drawing",
  type: "SHAPE",
  name: "Secret door drawing",
  layer: "DRAWING",
  shapeType: "RECTANGLE",
  width: 300,
  height: 100,
  style: {
    fillColor: "#aaaaaa",
    fillOpacity: 0.1,
    strokeColor: "#ffffff",
    strokeOpacity: 1,
    strokeWidth: 2,
    strokeDash: [],
  },
} as Item;
const scenes: Record<string, { items: Item[]; metadata: Metadata }> =
  JSON.parse(localStorage.getItem("object-links-test-v2") || "null") || {
    "test-a": { items: [token, drawing], metadata: { [SCENE_KEY]: "test-a" } },
    "test-b": { items: [], metadata: { [SCENE_KEY]: "test-b" } },
  };
let scene = "test-a",
  role = "GM",
  mode = "DARK",
  selection: string[] = [],
  writes = 0;
const current = () => scenes[scene];
function persist() {
  localStorage.setItem("object-links-test-v2", JSON.stringify(scenes));
}
function event(id: string, data: unknown) {
  for (const f of frames)
    f.contentWindow?.postMessage({ id, data }, location.origin);
}
function player() {
  event("OBR_PLAYER_EVENT_CHANGE", { player: { role, selection } });
}
function change() {
  persist();
  event("OBR_SCENE_ITEMS_EVENT_CHANGE", { items: current().items });
  status();
}
function status() {
  document.querySelector("#status")!.textContent =
    `${role} · ${scene} · ${current().items.length} objects · ${writes} writes`;
}
const map = document.createElement("section");
map.style.cssText =
  "position:absolute;left:470px;top:90px;max-width:480px;padding:20px;background:#152126;border-radius:10px";
map.innerHTML =
  '<h2>Simulated map objects</h2><p>Select an object, then use the extension panel or selection menu.</p><button id="token">Select token</button> <button id="drawing">Select drawing</button> <button id="multi">Select both</button><p><button id="menu-link">Menu: Link / edit image</button> <button id="menu-open">Menu: Open linked image</button></p><p><button id="move">Move selected</button> <button id="hide">Toggle object visibility</button> <button id="delete">Delete selected object</button></p><p id="message" role="status"></p>';
document.body.append(map);
for (const id of ["token", "drawing"])
  document.querySelector(`#${id}`)!.addEventListener("click", () => {
    selection = [id];
    player();
  });
document.querySelector("#multi")!.addEventListener("click", () => {
  selection = ["token", "drawing"];
  player();
});
for (const [id, suffix] of [
  ["menu-link", "link-object"],
  ["menu-open", "open-object"],
])
  document.querySelector(`#${id}`)!.addEventListener("click", () =>
    event("OBR_CONTEXT_MENU_EVENT_CLICK", {
      id: `${NS}/${suffix}`,
      context: {
        items: current().items.filter((i) => selection.includes(i.id)),
      },
      elementId: id,
    }),
  );
document.querySelector("#move")!.addEventListener("click", () => {
  current()
    .items.filter((i) => selection.includes(i.id))
    .forEach((i) => (i.position.x += 100));
  change();
});
document.querySelector("#hide")!.addEventListener("click", () => {
  current()
    .items.filter((i) => selection.includes(i.id))
    .forEach((i) => (i.visible = !i.visible));
  change();
});
document.querySelector("#delete")!.addEventListener("click", () => {
  current().items = current().items.filter((i) => !selection.includes(i.id));
  selection = [];
  player();
  change();
});
function url(view: string) {
  return `/index.html?${new URLSearchParams({ view, scene, obrref: btoa(`${location.origin} test-room`) })}`;
}
for (const f of frames)
  f.onload = () =>
    f.contentWindow?.postMessage(
      { id: "OBR_READY", data: { ref: "test", userId: "gm-test" } },
      location.origin,
    );
panel.src = url("");
background.src = `/background.html?obrref=${encodeURIComponent(btoa(`${location.origin} test-room`))}`;
window.addEventListener("message", (e) => {
  if (
    e.origin !== location.origin ||
    !frames.some((f) => f.contentWindow === e.source)
  )
    return;
  const { id, data, nonce } = e.data;
  if (!nonce) return;
  let response: unknown = {};
  switch (id) {
    case "OBR_ASSETS_DOWNLOAD_IMAGES":
      response = { images: [] };
      break;
    case "OBR_PLAYER_GET_SELECTION":
      response = { selection };
      break;
    case "OBR_PLAYER_GET_ROLE":
      response = { role };
      break;
    case "OBR_SCENE_IS_READY":
      response = { ready: true };
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
    case "OBR_SCENE_ITEMS_UPDATE_ITEMS":
      writes++;
      for (const u of data.updates) {
        const i = current().items.find((i) => i.id === u.id);
        if (i) Object.assign(i, u);
      }
      change();
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
    case "OBR_NOTIFICATION_SHOW":
      document.querySelector("#message")!.textContent = data.message;
      response = { id: "notice" };
      break;
  }
  (e.source as Window).postMessage(
    { id: `${id}_RESPONSE${nonce}`, data: response },
    location.origin,
  );
  status();
});
document.querySelector("#create")!.remove();
document.querySelector("#role")!.addEventListener("click", () => {
  role = role === "GM" ? "PLAYER" : "GM";
  player();
  status();
});
document.querySelector("#scene")!.addEventListener("click", () => {
  scene = scene === "test-a" ? "test-b" : "test-a";
  selection = [];
  event("OBR_SCENE_EVENT_READY_CHANGE", { ready: false });
  event("OBR_SCENE_EVENT_READY_CHANGE", { ready: true });
  player();
  status();
});
document.querySelector("#theme")!.addEventListener("click", () => {
  mode = mode === "DARK" ? "LIGHT" : "DARK";
  event("OBR_THEME_EVENT_CHANGE", { theme: { mode } });
});
status();
