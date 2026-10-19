# Interactive Image Hotspots

React + TypeScript extension for Owlbear Rodeo, using SDK **3.1.0**. Place circular scene hotspots that open a personal, full-screen image viewer. Production code has no backend, database, mock SDK, or localStorage dependency.

## Quick start

Requires Node.js 24 and npm. Run from this directory:

```sh
npm ci
npm run dev
npm test
npm run lint
npm run build
npm run preview
```

`dev` serves http://127.0.0.1:5173. For embedding in the HTTPS Owlbear site, use `npm run dev:https` and the HTTPS address printed by Vite. If the browser rejects the development certificate, trust it yourself, or use a trusted HTTPS host. Never disable browser security. Opening the panel directly outside Owlbear shows a connection screen; the SDK requires an Owlbear parent.

## Install in Owlbear

1. Deploy the **contents of `dist/`** to an HTTPS static host.
2. In Owlbear Rodeo's extension management, add a custom extension using the manifest URL, then enable it in the room.
3. Install URL format: `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/manifest.json`.
4. Open a scene as GM. In room permissions, **disable player MAP_CREATE, MAP_UPDATE and MAP_DELETE**. Hotspot markers use the MAP layer.
5. Open Image Hotspots from the extension action. The background page registers the map tool for every connected user, even while the action panel is closed.

For HTTPS development, install `https://localhost:5173/manifest.json` if the development server and certificate are reachable and trusted on your device. The local address only works for users on that machine; multiplayer testing needs a shared HTTPS deployment.

## GM workflow

1. Click **Place hotspot**, then click a scene position. Placement switches back to Explore after one click, preventing accidental repeated creation.
2. Set the name and image. Use **Preview URL**, **Browse Assets**, or **Choose file → Upload & choose**.
3. For uploads, preview the local file, confirm Owlbear's upload destination, then select the newly saved asset in Owlbear's picker. The SDK's `uploadImages()` returns `Promise<void>`, so the second picker is required to obtain its permanent URL. If upload was canceled, cancel the picker too; no hotspot is saved.
4. Set radius, visibility, enabled state and whether players may open it. Save.
5. Edit the hotspot from the list. Change X/Y to move its scene position, and radius to resize the click area. Coordinates use scene pixels. Delete requires confirmation.

Supported local files: PNG, JPEG, WebP and GIF, up to 20 MB before platform limits. Browser/Owlbear storage limits can still reject an upload. GIF animation depends on the asset format retained by Owlbear; use an HTTPS GIF URL if the library transforms it. Uploaded assets are not automatically deleted when a hotspot is removed because they may be shared elsewhere. Deleting an asset from Owlbear storage can break its hotspots.

## Player workflow

Select the **Image Hotspots** toolbar tool (Open image mode), or click **Explore hotspots** in the panel. Click a visible circle on the map, or open an allowed image from the list. The viewer opens only for the clicking user. Mouse wheel/buttons zoom, drag pans, and two fingers pinch to zoom. Reset restores fit; Close or Escape exits. There is no room-wide broadcast feature in this version.

**The Hotspots tool must be active for map clicks.** There is no verified global map-click callback in this SDK. Clicking markers while using other tools does not open the viewer. Markers do not intercept normal selection.

## Persistence and architecture

```text
src/model.ts        Versioned metadata parsing, validation, permissions and hit testing
src/sdk.ts          GM checks, scene guards, item CRUD and personal modal routing
src/background.ts   Persistent tool registration and one-click placement
src/useScene.ts     Scene/role/theme subscriptions and cleanup
src/images.ts       Browser image validation and Owlbear Assets integration
src/App.tsx         Scene list, delete confirmation and explore/place controls
src/Editor.tsx      Name, image, coordinates, radius and access form
src/Viewer.tsx      Fit, zoom, pan, touch, loading, retry and error handling
src/style.css       Responsive dark/light UI
public/             Manifest and SVG tool icon
tests/              Automated business tests and development-only SDK host harness
```

Each hotspot is one locked circle Shape item on the MAP layer. Its position, dimensions and visibility live in standard item properties; `{ version, url, enabled, players }` lives under the namespace `io.github.interactive-image-hotspots/v1`. Deleting the item removes the hotspot and metadata together. Hotspots naturally follow Owlbear's scene persistence and sync; editing separate hotspots does not rewrite a shared array. Same-hotspot edits by multiple GMs follow Owlbear's last-write behavior.

Scene metadata stores only a generated identity under `io.github.interactive-image-hotspots/v1/scene`, initialized by a GM. Editor/viewer routes carry this identity, so changing scenes invalidates stale windows. No binary image data is stored in metadata. A temporary Blob URL is used only for local-file preview and is revoked; it is never saved. The SDK does not expose atomic scene-specific write transactions: a scene switch exactly between the final guard and an SDK write remains a platform race, so wait for a save/upload to finish before switching scenes. Duplicating a scene can copy its identity; close modal windows before switching between scene copies.

Images load lazily in list thumbnails and on demand in the viewer. Normal selection changes do not trigger full data reloads. Subscriptions are disposed on UI unmount, image validation has a timeout, and all writes require a fresh GM and scene check.

## Permissions, visibility and privacy

The UI, editor routes, placement callbacks and mutation functions check the GM role. MAP-layer permissions provide the platform boundary for marker edits; locked items alone are not an authorization boundary. **The SDK has no per-extension private metadata ACL**. A modified client or another extension may read shared URLs, and clients with room-granted MAP editing permissions may alter these items. This frontend-only extension cannot promise isolation from a malicious SDK client beyond Owlbear's room permissions. A stricter adversarial security model needs platform support or a trusted service.

Hidden, disabled and GM-only hotspots are excluded from player interaction and the player list. A GM may still inspect all images through the manager. Hidden/disabled points never react to scene clicks, even for the GM. Visibility is **not encryption**. Hotspots are independent of fog-of-war and may appear over concealed regions; explicitly hide or disable unrevealed points. Do not store secret links in a shared scene.

HTTPS URL validation rejects embedded credentials and non-HTTPS schemes. The browser tests an actual image load rather than a CORS `fetch`/HEAD request. Displaying a cross-origin `<img>` usually does not require CORS permission; private origins, hotlink restrictions, expired links, CSP/CORP or network failures may still prevent display. The UI reports these possibilities without pretending to identify CORS from an opaque image error. There is no proxy, canvas extraction, security bypass or automatic upload of remote images. Image requests use `no-referrer`; their hosting server still receives the request. Prefer stable public image URLs or Owlbear Assets. Repeated external source changes, deletion or expiring URLs are outside the extension's control.

## Testing and validation

`npm test` runs Node's built-in test runner over validation, schema parsing, circle/ellipse hit testing, visibility/role restrictions, overlap ordering and metadata serialization. `npm run build` performs strict TypeScript checking and a Vite production build. `npm run lint` runs Oxlint.

For browser development, open `http://127.0.0.1:5173/tests/harness.html` while Vite is running. This explicitly labeled **simulated host** exercises the real installed SDK client and React screens, not Owlbear's servers. It is outside Vite's production build inputs and is absent from `dist/`. Its localStorage is only a disposable fixture store. Do not treat it as proof of real multiplayer synchronization or asset uploads. Clear its `hotspot-test-harness` localStorage entry to reset fixtures.

See [TESTING.md](TESTING.md) for the executed results and remaining live-room checklist. Real Owlbear asset upload/picker, tool coordinates, server permissions and multi-client refresh require a live room; they are not claimed as passed.

## GitHub Pages

1. Create a repository and put **this directory's files at its root**, including `.github/workflows/deploy.yml`.
2. Push to `main`.
3. Set repository **Settings → Pages → Source → GitHub Actions**.
4. Run the supplied workflow (or push again). It installs from the lockfile, tests, lints, builds and deploys `dist/`.
5. Add `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/manifest.json` to Owlbear.

Vite uses `base: './'`. Manifest paths are relative; runtime modal and icon paths resolve relative to the deployed page, so repository subpaths and custom domains work. No SPA rewrite rule is needed. No repository or hosting credentials were supplied; the project is prepared for deployment but has not been published.

## Official references checked

- [Assets API](https://docs.owlbear.rodeo/extensions/apis/assets/) — upload returns void; downloadImages returns selected image content.
- [Tool API](https://docs.owlbear.rodeo/extensions/apis/tool/) — custom modes and scene pointer events.
- [Scene Items API](https://docs.owlbear.rodeo/extensions/apis/scene/items/) — item persistence and updates.
- [Modal API](https://docs.owlbear.rodeo/extensions/apis/modal/) — personal viewer/editor frames.
- [Manifest reference](https://docs.owlbear.rodeo/extensions/reference/manifest/).
- [Room layer permissions](https://docs.owlbear.rodeo/extensions/reference/permission/).

Installed package declarations in `node_modules/@owlbear-rodeo/sdk/lib/` are the source of truth for method signatures; all production calls compile against pinned SDK 3.1.0.
