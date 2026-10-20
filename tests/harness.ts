// Development-only simulated SDK host; excluded from production build.
import { type Item, type Metadata } from "@owlbear-rodeo/sdk";
import { NS, SCENE_KEY, TOOL, VIEW } from "../src/model";
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
  JSON.parse(localStorage.getItem("image-areas-test-v3") || "null") || {
    "test-a": { items: [token, drawing], metadata: { [SCENE_KEY]: "test-a" } },
    "test-b": { items: [], metadata: { [SCENE_KEY]: "test-b" } },
  };
let scene = "test-a",
  role = "GM",
  mode = "DARK",
  selection: string[] = [],
  writes = 0;
let activeMode = VIEW,
  locals: Item[] = [],
  zoom = 1,
  pan = { x: 0, y: 0 };
const current = () => scenes[scene];
function persist() {
  localStorage.setItem("image-areas-test-v3", JSON.stringify(scenes));
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
  renderMap();
}
function status() {
  document.querySelector("#status")!.textContent =
    `${role} · ${scene} · ${current().items.length} objects · ${writes} writes`;
}
const map = document.createElement("section");
map.style.cssText =
  "position:absolute;left:470px;top:90px;max-width:540px;padding:20px;background:#152126;border-radius:10px";
map.innerHTML =
  '<h2>Simulated map objects</h2><p>Select an object, then use the extension panel or selection menu.</p><button id="token">Select token</button> <button id="drawing">Select drawing</button> <button id="multi">Select both</button><p><button id="menu-link">Menu: Link / edit image</button></p><p><button id="move">Move selected</button> <button id="hide">Toggle object visibility</button> <button id="delete">Delete selected object</button></p><p id="message" role="status"></p>';
document.body.append(map);
const board = document.createElementNS("http://www.w3.org/2000/svg", "svg");
board.id = "map-board";
board.setAttribute("width", "500");
board.setAttribute("height", "400");
board.setAttribute("tabindex", "0");
board.setAttribute("aria-label", "Interactive scene test map");
board.style.cssText =
  "display:block;background:#23353b;touch-action:none;margin-top:12px;outline:1px solid #547078";
map.append(board);
for (const id of ["token", "drawing"])
  document.querySelector(`#${id}`)!.addEventListener("click", () => {
    selection = [id];
    player();
  });
document.querySelector("#multi")!.addEventListener("click", () => {
  selection = ["token", "drawing"];
  player();
});
for (const [id, suffix] of [["menu-link", "link-object"]])
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
    case "OBR_PLAYER_GET_CONNECTION_ID":
      response = { connectionId: "test-connection" };
      break;
    case "OBR_TOOL_MODE_ACTIVATE": {
      event("OBR_TOOL_MODE_EVENT_DEACTIVATE", {
        id: activeMode,
        context: { activeTool: TOOL, activeMode, metadata: {} },
      });
      activeMode = data.modeId;
      event("OBR_TOOL_MODE_EVENT_ACTIVATE", {
        id: activeMode,
        context: { activeTool: TOOL, activeMode, metadata: {} },
      });
      event("OBR_TOOL_MODE_ACTIVE_EVENT_CHANGE", { id: activeMode });
      break;
    }
    case "OBR_TOOL_MODE_GET_ACTIVE":
      response = { id: activeMode };
      break;
    case "OBR_BROADCAST_SEND_MESSAGE":
      event(`OBR_BROADCAST_MESSAGE_${data.channel}`, {
        data: data.data,
        connectionId: "test-connection",
      });
      break;
    case "OBR_SCENE_LOCAL_GET_ALL_ITEMS":
      response = { items: locals };
      break;
    case "OBR_SCENE_LOCAL_GET_ITEMS":
      response = { items: locals.filter((i) => data.ids.includes(i.id)) };
      break;
    case "OBR_SCENE_LOCAL_ADD_ITEMS":
      locals.push(...data.items);
      renderMap();
      break;
    case "OBR_SCENE_LOCAL_UPDATE_ITEMS":
      for (const u of data.updates) {
        const i = locals.find((i) => i.id === u.id);
        if (i) Object.assign(i, u);
      }
      renderMap();
      break;
    case "OBR_SCENE_LOCAL_DELETE_ITEMS":
      locals = locals.filter((i) => !data.ids.includes(i.id));
      renderMap();
      break;
    case "OBR_SCENE_GRID_GET_DPI":
      response = { dpi: 50 };
      break;
    case "OBR_SCENE_GRID_GET_TYPE":
      response = { type: "SQUARE" };
      break;
    case "OBR_SCENE_GRID_SNAP_POSITION":
      response = {
        position: {
          x: Math.floor(data.position.x / 50) * 50 + 25,
          y: Math.floor(data.position.y / 50) * 50 + 25,
        },
      };
      break;
    case "OBR_SCENE_ITEMS_ADD_ITEMS":
      writes++;
      current().items.push(...data.items);
      change();
      break;
    case "OBR_SCENE_ITEMS_DELETE_ITEMS":
      writes++;
      current().items = current().items.filter((i) => !data.ids.includes(i.id));
      change();
      break;
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
      modal.style.width = data.fullScreen
        ? "calc(100vw - 40px)"
        : `${data.width ?? 480}px`;
      modal.style.height = data.fullScreen
        ? "calc(100vh - 90px)"
        : `${Math.min(data.height ?? 760, innerHeight - 90)}px`;
      modal.style.left = "50%";
      modal.style.transform = "translateX(-50%)";
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
  locals = [];
  renderMap();
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

function renderMap() {
  const grid = Array.from(
    { length: 21 },
    (_, i) =>
      `<path d="M${i * 50} 0V1000 M0 ${i * 50}H1000" stroke="#42555b" fill="none"/>`,
  ).join("");
  const paths = locals
    .filter((i) => i.type === "PATH")
    .map((i) => {
      const p = i as import("@owlbear-rodeo/sdk").Path;
      const d = p.commands
        .map((c) =>
          c[0] === 0
            ? `M${c[1]} ${c[2]}`
            : c[0] === 1
              ? `L${c[1]} ${c[2]}`
              : "Z",
        )
        .join(" ");
      return `<path data-local="${i.id}" d="${d}" transform="translate(${i.position.x} ${i.position.y}) rotate(${i.rotation}) scale(${i.scale.x} ${i.scale.y})" fill="${p.style.fillColor}" fill-opacity="${p.style.fillOpacity}" stroke="${p.style.strokeColor}" stroke-opacity="${p.style.strokeOpacity}" stroke-width="2" pointer-events="none"/>`;
    })
    .join("");
  const tokens = current()
    .items.filter((i) => i.id === "token" && i.visible)
    .map(
      (i) =>
        `<rect x="${i.position.x}" y="${i.position.y}" width="60" height="60" rx="12" fill="#b6edcf"/><text x="${i.position.x + 30}" y="${i.position.y + 35}" text-anchor="middle" font-size="12">Token</text>`,
    )
    .join("");
  board.innerHTML = `<g transform="translate(${pan.x} ${pan.y}) scale(${zoom})">${grid}${paths}${tokens}</g>`;
}
function point(e: PointerEvent | MouseEvent) {
  const r = board.getBoundingClientRect();
  return {
    x: (e.clientX - r.left - pan.x) / zoom,
    y: (e.clientY - r.top - pan.y) / zoom,
  };
}
function sendTool(name: string, p: { x: number; y: number }, target?: Item) {
  event(`OBR_TOOL_MODE_EVENT_${name}`, {
    id: activeMode,
    context: { activeTool: TOOL, activeMode, metadata: {} },
    event: {
      pointerPosition: p,
      target,
      altKey: false,
      shiftKey: false,
      ctrlKey: false,
      metaKey: false,
    },
  });
}
let down: { x: number; y: number } | undefined,
  drag = false,
  suppress = false;
board.addEventListener("pointerdown", (e) => {
  board.setPointerCapture(e.pointerId);
  down = point(e);
  drag = false;
  suppress = false;
});
board.addEventListener("pointermove", (e) => {
  if (!down) return;
  const p = point(e);
  if (!drag && Math.hypot(p.x - down.x, p.y - down.y) > 3) {
    drag = true;
    sendTool("TOOL_DRAG_START", down);
  }
  if (drag) sendTool("TOOL_DRAG_MOVE", p);
});
board.addEventListener("pointerup", (e) => {
  if (drag) {
    sendTool("TOOL_DRAG_END", point(e));
    suppress = true;
  }
  down = undefined;
  drag = false;
});
board.addEventListener("click", (e) => {
  if (suppress) {
    suppress = false;
    return;
  }
  const p = point(e);
  const target = current().items.find(
    (i) =>
      i.id === "token" &&
      p.x >= i.position.x &&
      p.x <= i.position.x + 60 &&
      p.y >= i.position.y &&
      p.y <= i.position.y + 60,
  );
  sendTool("TOOL_CLICK", p, target);
});
board.addEventListener("keydown", (e) =>
  event("OBR_TOOL_MODE_EVENT_KEY_DOWN", {
    id: activeMode,
    context: { activeTool: TOOL, activeMode, metadata: {} },
    event: { key: e.key, code: e.code },
  }),
);
for (const [label, action] of [
  [
    "Map zoom 2x",
    () => {
      zoom = zoom === 1 ? 2 : 1;
      renderMap();
    },
  ],
  [
    "Map pan",
    () => {
      pan = pan.x ? { x: 0, y: 0 } : { x: 40, y: 30 };
      renderMap();
    },
  ],
] as const) {
  const b = document.createElement("button");
  b.textContent = label;
  b.onclick = action;
  map.append(b);
}
renderMap();
