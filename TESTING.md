# Validation · 3.0.0 · 2026-10-20

## Commands actually run

- `npm test`: **36 passed, 0 failed** (geometry, schema/permissions, URLs/files, token attach/edit/detach, legacy shapes/cells, manifest paths).
- `npm run lint`: passed without diagnostics.
- `npm run build`: passed TypeScript and Vite production compilation. A missing-field error in the new test fixture was corrected before the final successful build.
- SDK API methods checked against installed 3.1.0 declarations and implementation; custom-tool pointer usage compared with official tutorial.

## Playwright browser validation actually performed

Used persistent Playwright Chromium headless and the real React UI/SDK client inside `tests/harness.html`. The parent host, Scene, roles and SDK transport responses are **simulated**, not an authenticated Owlbear room. Image URL was a deterministic HTTPS SVG response fulfilled by Playwright; file preview used an in-memory PNG. Only test harness uses localStorage. Browser actions used normal buttons, clicks, drag gestures, fields and keyboard.

Passed observations:

- Rectangle and ellipse dragged on test map; point clicked; concave freehand drawn and saved. Each opened the real editor.
- Three grid cells selected; middle cell removed/re-added; count changed 3→2→3; Done opened editor and saved one area.
- Single map click opened rectangle, freehand, cells and linked Token viewers; freehand concave cutout did not open.
- Player saw no borders with default settings but opened the hidden freehand area/cells. GM-only mutation controls absent.
- Changed one area's GM border off / player border on. Local outline counts changed from 4 for GM to 1 for Player (five saved areas).
- Token linked using panel; moved with simulated host control; click at new location opened original linked image. Confirm unlink preserved Token.
- Area x/y and scaleX/scaleY edited; click at transformed location opened it.
- Scene B empty; returning to Scene A restored links; browser reload restored six saved links from the simulated persistent Scene.
- Cancel drawing / Escape cleared draft without creating shared items; scene switch cleared selected cells; canceled image editor created no orphan.
- Switching Scene while editor was open displayed an access/scene error and disabled Save.
- Disabled area did not open from map and disappeared from Player's list.
- Failed image URL displayed useful error; local PNG preview rendered; file cancel and canceled native picker response returned safely.
- Delete area required confirmation; Keep link canceled; Confirm delete removed area. Token remained.
- Viewer Zoom in reached 125%, Reset returned to 100%, Close and Escape worked.
- Simulated map zoom 2x + pan still opened the correct cells.
- File selection initially emitted a React empty-src warning; changed the pending preview src to undefined, reran the file-preview browser flow, and confirmed preview rendered with no empty-src warning.
- No uncaught JavaScript errors recorded in tested flows. Intentionally aborted bad-image network request is expected.

## Visual review

Inspected screenshots separately from interaction tests:
- Dark panel at 420×620 and image editor at 480×760: readable controls, vertical scrolling for long content.
- Light panel at 320px: body scrollWidth equals clientWidth (320), no horizontal overflow.
- Large viewer in light mode: image retained ratio, close/zoom/reset controls visible.
- Screenshots are saved beside the project in `qa-image-areas-3.0.0/`.

## Still requires real Owlbear testing

These are not claimed passed by the simulated host:

1. Install production manifest in a real room with separate GM and Player sessions.
2. Native tool activation and pointer delivery for all five modes; real grid alignment/offset and browser zoom. Non-square grid rejection is implemented but not exercised in this browser session.
3. Native Explore dragging/panning and distinction between drag and click. No global Move interception exists.
4. Independent local overlays on the real renderer, Fog interactions, actual Token target hit testing and permission enforcement by Owlbear.
5. Actual file upload into durable Owlbear Assets, picker selection, storage quota/cancel, then reload and another Player loading that URL.
6. Touch pinch/pan, mobile Owlbear layout, high-resolution/portrait/GIF images, real server hotlink/CORS policy, viewer retry recovery.
7. Real simultaneous edits, disconnect/reconnect, and server rate-limit behavior. Tests do not prove a fix for the previously reported Realtime 4003.
8. Draw cancellation during a slow SDK response and deletion of a target while saving. Local generation checks and fresh guards are implemented; real transport concurrency remains a manual gate.

No GitHub push or Cloudflare deployment was performed in this change. The ZIP artifacts are ready to upload.

## Reproduce locally

```sh
npm ci
npm test
npm run lint
npm run build
npm run dev
```

Open `http://127.0.0.1:5173/tests/harness.html`. Use extension buttons and the grid test map. Host controls switch roles/scenes/theme, select/move/delete objects, and change map pan/zoom. Do not install the harness into Owlbear or publish it as the extension entry point; Vite's production inputs are only index.html and background.html.
