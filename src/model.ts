import type {
  Item,
  Shape,
  Path,
  Vector2,
  PathCommand,
} from "@owlbear-rodeo/sdk";
export const NS = "io.github.interactive-image-hotspots/v1";
export const SCENE_KEY = `${NS}/scene`;
export const TOOL = `${NS}/tool`;
export const VIEW = `${NS}/view`;
export const PLACE = `${NS}/place`;
export const DONE = `${NS}/done`;
export const CANCEL = `${NS}/cancel`;
export type Cell = [number, number];
export type Region = { cellSize: number; cells: Cell[] };
export const MAX_CELLS = 512;
type CommonData = {
  url: string;
  enabled: boolean;
  players: boolean;
  marks?: boolean;
};
export type HotspotData = CommonData &
  ({ version: 1 } | ({ version: 2 } & Region));
export type Hotspot = (Shape | Path) & { metadata: Record<string, unknown> };
export type Draft = {
  name: string;
  url: string;
  x: number;
  y: number;
  radius: number;
  enabled: boolean;
  visible: boolean;
  players: boolean;
  marks?: boolean;
  region?: Region;
};
export type Selection = {
  scene: string;
  id?: string;
  x?: number;
  y?: number;
  cellSize: number;
  cells: Cell[];
  marks?: boolean;
};
export function selectionData(value: unknown): Selection | undefined {
  if (!value || typeof value !== "object") return;
  const s = value as Selection;
  if (
    typeof s.scene !== "string" ||
    (s.id !== undefined && typeof s.id !== "string") ||
    !Array.isArray(s.cells)
  )
    return;
  if (s.x !== undefined && (!Number.isFinite(s.x) || !Number.isFinite(s.y)))
    return;
  if (!validRegion({ ...s, cells: s.cells.length ? s.cells : [[0, 0]] }))
    return;
  return s;
}
export function selectionParam(raw: string | null): Selection | undefined {
  try {
    return raw ? selectionData(JSON.parse(raw)) : undefined;
  } catch {
    return;
  }
}
export function validRegion(region: Region): boolean {
  return (
    Number.isFinite(region.cellSize) &&
    region.cellSize >= 12 &&
    region.cellSize <= 2000 &&
    Array.isArray(region.cells) &&
    region.cells.length > 0 &&
    region.cells.length <= MAX_CELLS &&
    region.cells.every(
      (c) =>
        Array.isArray(c) &&
        c.length === 2 &&
        c.every((n) => Number.isSafeInteger(n) && Math.abs(n) <= 10000),
    ) &&
    new Set(region.cells.map((c) => c.join(","))).size === region.cells.length
  );
}
export function connected(cells: Cell[]): boolean {
  if (!cells.length) return false;
  const remaining = new Set(cells.map((c) => c.join(","))),
    queue: Cell[] = [cells[0]];
  remaining.delete(cells[0].join(","));
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i];
    for (const n of [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ] as Cell[]) {
      if (remaining.delete(n.join(","))) queue.push(n);
    }
  }
  return remaining.size === 0;
}
export function toggleCell(cells: Cell[], cell: Cell): Cell[] {
  return cells.some((c) => c[0] === cell[0] && c[1] === cell[1])
    ? cells.filter((c) => c[0] !== cell[0] || c[1] !== cell[1])
    : [...cells, cell];
}
export function regionCommands(region: Region): PathCommand[] {
  return region.cells.flatMap(([col, row]) => {
    const x = col * region.cellSize,
      y = row * region.cellSize,
      s = region.cellSize;
    return [
      [0, x, y],
      [1, x + s, y],
      [1, x + s, y + s],
      [1, x, y + s],
      [5],
    ] as PathCommand[];
  });
}
export function marksShown(item: Hotspot) {
  return data(item)?.marks !== false;
}
export function imageUrl(raw: string): string {
  const u = new URL(raw.trim());
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    u.href.length > 4096
  )
    throw new Error(
      "Use a public HTTPS image URL without credentials (maximum 4096 characters).",
    );
  return u.href;
}
export function data(item: Item): HotspotData | undefined {
  const d = item.metadata[NS] as Partial<HotspotData> | undefined;
  if (
    (item.type !== "SHAPE" && item.type !== "PATH") ||
    !d ||
    (d.version !== 1 && d.version !== 2) ||
    typeof d.enabled !== "boolean" ||
    typeof d.players !== "boolean" ||
    typeof d.url !== "string"
  )
    return;
  if (d.marks !== undefined && typeof d.marks !== "boolean") return;
  if (d.version === 1 && item.type !== "SHAPE") return;
  if (d.version === 2 && (item.type !== "PATH" || !validRegion(d as Region)))
    return;
  try {
    imageUrl(d.url);
    return d as HotspotData;
  } catch {
    return;
  }
}
export function hotspots(items: Item[]): Hotspot[] {
  return items.filter((i) => data(i)) as Hotspot[];
}
export function allowed(item: Hotspot, gm: boolean) {
  const d = data(item)!;
  return gm || ((d.version === 2 || item.visible) && d.enabled && d.players);
}
export function hit(
  items: Hotspot[],
  p: Vector2,
  gm: boolean,
): Hotspot | undefined {
  return items
    .filter((i) => {
      const d = data(i)!;
      if ((d.version === 1 && !i.visible) || !d.enabled || !allowed(i, gm))
        return false;
      const angle = (-i.rotation * Math.PI) / 180,
        dx = p.x - i.position.x,
        dy = p.y - i.position.y;
      const x = dx * Math.cos(angle) - dy * Math.sin(angle),
        y = dx * Math.sin(angle) + dy * Math.cos(angle);
      if (d.version === 2) {
        const col = Math.floor(x / i.scale.x / d.cellSize),
          row = Math.floor(y / i.scale.y / d.cellSize);
        return d.cells.some((c) => c[0] === col && c[1] === row);
      }
      if (i.type !== "SHAPE") return false;
      return (
        Math.hypot(
          x / ((i.width * Math.abs(i.scale.x)) / 2),
          y / ((i.height * Math.abs(i.scale.y)) / 2),
        ) <= 1
      );
    })
    .sort((a, b) => b.zIndex - a.zIndex || a.id.localeCompare(b.id))[0];
}
export function validate(d: Draft): Draft {
  if (!d.name.trim() || d.name.trim().length > 100)
    throw new Error("Enter a name of 1–100 characters.");
  if (
    ![d.x, d.y].every(Number.isFinite) ||
    Math.abs(d.x) > 1e7 ||
    Math.abs(d.y) > 1e7 ||
    (!d.region &&
      (!Number.isFinite(d.radius) || d.radius < 12 || d.radius > 1000))
  )
    throw new Error(
      "Enter valid scene coordinates and a radius between 12 and 1000.",
    );
  if (d.region && (!validRegion(d.region) || !connected(d.region.cells)))
    throw new Error(
      `Select 1–${MAX_CELLS} unique, edge-connected square cells.`,
    );
  return { ...d, name: d.name.trim(), url: imageUrl(d.url) };
}
export function validateFile(file: Pick<File, "size" | "type">) {
  if (
    !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)
  )
    throw new Error("Choose a PNG, JPEG, WebP or GIF image.");
  if (!file.size || file.size > 20 * 1024 * 1024)
    throw new Error("Choose an image smaller than 20 MB.");
}
