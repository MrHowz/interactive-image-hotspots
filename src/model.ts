import type { Item, Shape, Vector2 } from "@owlbear-rodeo/sdk";
export const NS = "io.github.interactive-image-hotspots/v1";
export const SCENE_KEY = `${NS}/scene`;
export const TOOL = `${NS}/tool`;
export const VIEW = `${NS}/view`;
export const PLACE = `${NS}/place`;
export type HotspotData = {
  version: 1;
  url: string;
  enabled: boolean;
  players: boolean;
};
export type Hotspot = Shape & { metadata: Record<string, unknown> };
export type Draft = {
  name: string;
  url: string;
  x: number;
  y: number;
  radius: number;
  enabled: boolean;
  visible: boolean;
  players: boolean;
};
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
    item.type !== "SHAPE" ||
    !d ||
    d.version !== 1 ||
    typeof d.enabled !== "boolean" ||
    typeof d.players !== "boolean" ||
    typeof d.url !== "string"
  )
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
  return gm || (item.visible && d.enabled && d.players);
}
export function hit(
  items: Hotspot[],
  p: Vector2,
  gm: boolean,
): Hotspot | undefined {
  return items
    .filter((i) => {
      if (!i.visible || !data(i)!.enabled || !allowed(i, gm)) return false;
      const angle = (-i.rotation * Math.PI) / 180,
        dx = p.x - i.position.x,
        dy = p.y - i.position.y;
      const x = dx * Math.cos(angle) - dy * Math.sin(angle),
        y = dx * Math.sin(angle) + dy * Math.cos(angle);
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
    ![d.x, d.y, d.radius].every(Number.isFinite) ||
    Math.abs(d.x) > 1e7 ||
    Math.abs(d.y) > 1e7 ||
    d.radius < 12 ||
    d.radius > 1000
  )
    throw new Error(
      "Enter valid scene coordinates and a radius between 12 and 1000.",
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
