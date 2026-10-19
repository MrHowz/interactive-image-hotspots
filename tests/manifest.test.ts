import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const manifest = JSON.parse(
  readFileSync(new URL("../public/manifest.json", import.meta.url), "utf8"),
);
test("manifest paths have a slash boundary when attached to a deployment origin", () => {
  const origin = "https://interactive-image-hotspots.pages.dev";
  for (const path of [
    manifest.icon,
    manifest.background_url,
    manifest.action.icon,
    manifest.action.popover,
  ]) {
    assert.match(path, /^\/(?!\/)/);
    const url = new URL(origin + path);
    assert.equal(url.origin, origin);
    assert.equal(url.pathname, path);
    assert.ok(
      existsSync(
        new URL(
          `../${path.endsWith(".html") ? "" : "public/"}${path.split("/").pop()}`,
          import.meta.url,
        ),
      ),
    );
  }
});
