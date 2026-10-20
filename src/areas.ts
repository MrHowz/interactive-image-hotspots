import type { Vector2, PathCommand, Item } from "@owlbear-rodeo/sdk";
export type AreaKind = "point" | "rectangle" | "ellipse" | "freehand" | "cells";
export type Area = { kind: AreaKind; polygons: Vector2[][] };
export type AreaDraft = { area: Area; position: Vector2 };
export const kinds: AreaKind[] = [
  "point",
  "rectangle",
  "ellipse",
  "freehand",
  "cells",
];
const finitePoint = (p: Vector2) =>
  p &&
  Number.isFinite(p.x) &&
  Number.isFinite(p.y) &&
  Math.abs(p.x) <= 1e7 &&
  Math.abs(p.y) <= 1e7;
export function validArea(a: Area): boolean {
  return (
    !!a &&
    kinds.includes(a.kind) &&
    Array.isArray(a.polygons) &&
    a.polygons.length > 0 &&
    a.polygons.length <= 256 &&
    a.polygons.every(
      (p) =>
        Array.isArray(p) &&
        p.length >= 3 &&
        p.length <= 256 &&
        p.every(finitePoint),
    ) &&
    a.polygons.reduce((n, p) => n + p.length, 0) <= 1024
  );
}
export function parseArea(raw: string | null): AreaDraft | undefined {
  try {
    const d = JSON.parse(raw || "null");
    return d && validArea(d.area) && finitePoint(d.position) ? d : undefined;
  } catch {
    return;
  }
}
export function normalizeArea(
  kind: AreaKind,
  polygons: Vector2[][],
): AreaDraft {
  const all = polygons.flat();
  const x = Math.min(...all.map((p) => p.x)),
    y = Math.min(...all.map((p) => p.y));
  const draft = {
    position: { x, y },
    area: {
      kind,
      polygons: polygons.map((poly) =>
        poly.map((p) => ({
          x: Math.round((p.x - x) * 100) / 100,
          y: Math.round((p.y - y) * 100) / 100,
        })),
      ),
    },
  };
  if (!validArea(draft.area))
    throw new Error(
      "Choose a valid area (up to 256 cells or 256 freehand points).",
    );
  return draft;
}
export function shapeArea(
  kind: AreaKind,
  start: Vector2,
  end: Vector2,
  points: Vector2[] = [],
): AreaDraft {
  if (kind === "freehand") {
    if (points.length < 3)
      throw new Error("Draw a closed area, not a single line.");
    const x =
      Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x));
    const y =
      Math.max(...points.map((p) => p.y)) - Math.min(...points.map((p) => p.y));
    if (x < 4 || y < 4) throw new Error("Draw a wider area.");
    return normalizeArea(kind, [points]);
  }
  const point = kind === "point";
  const x = point ? start.x - 32 : Math.min(start.x, end.x),
    y = point ? start.y - 32 : Math.min(start.y, end.y);
  const w = point ? 64 : Math.abs(end.x - start.x),
    h = point ? 64 : Math.abs(end.y - start.y);
  if (w < 4 || h < 4)
    throw new Error("Drag an area at least 4 pixels wide and tall.");
  const poly =
    kind === "rectangle"
      ? [
          { x, y },
          { x: x + w, y },
          { x: x + w, y: y + h },
          { x, y: y + h },
        ]
      : Array.from({ length: 48 }, (_, i) => ({
          x: x + w / 2 + (Math.cos((i * Math.PI) / 24) * w) / 2,
          y: y + h / 2 + (Math.sin((i * Math.PI) / 24) * h) / 2,
        }));
  return normalizeArea(kind, [poly]);
}
export function cellArea(centers: Vector2[], size: number): AreaDraft {
  if (!Number.isFinite(size) || size < 12 || size > 2000)
    throw new Error("Unsupported grid size.");
  return normalizeArea(
    "cells",
    centers.map((p) => [
      { x: p.x - size / 2, y: p.y - size / 2 },
      { x: p.x + size / 2, y: p.y - size / 2 },
      { x: p.x + size / 2, y: p.y + size / 2 },
      { x: p.x - size / 2, y: p.y + size / 2 },
    ]),
  );
}
export function areaCommands(a: Area): PathCommand[] {
  return a.polygons.flatMap(
    (poly) =>
      [
        [0, poly[0].x, poly[0].y],
        ...poly.slice(1).map((p) => [1, p.x, p.y]),
        [5],
      ] as PathCommand[],
  );
}
export function polygonContains(poly: Vector2[], p: Vector2): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[j],
      b = poly[i],
      cross = (p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x);
    if (
      Math.abs(cross) < 1e-6 &&
      p.x >= Math.min(a.x, b.x) - 1e-6 &&
      p.x <= Math.max(a.x, b.x) + 1e-6 &&
      p.y >= Math.min(a.y, b.y) - 1e-6 &&
      p.y <= Math.max(a.y, b.y) + 1e-6
    )
      return true;
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}
export function areaContains(item: Item, area: Area, p: Vector2): boolean {
  if (!item.scale.x || !item.scale.y) return false;
  const angle = (-item.rotation * Math.PI) / 180,
    dx = p.x - item.position.x,
    dy = p.y - item.position.y;
  const local = {
    x: (dx * Math.cos(angle) - dy * Math.sin(angle)) / item.scale.x,
    y: (dx * Math.sin(angle) + dy * Math.cos(angle)) / item.scale.y,
  };
  return area.polygons.some((poly) => polygonContains(poly, local));
}
