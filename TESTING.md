# Validation — Image Links 2.0.0

## Executed

- npm run lint — passed (oxlint).
- npm run build — passed (TypeScript strict checking and Vite production build).
- npm test — 28 tests passed: 8 metadata link tests, schema rejection, URL/file validation, manifest path regression and legacy data/geometry compatibility. Legacy geometry tests verify data compatibility, not a retained Select cells UI.
- Playwright through persistent Node REPL: Chromium headless, real React and installed Owlbear SDK client inside the development host emulator.
- Selected token → editor → public HTTPS image preview → save → personal viewer. Public placehold.co image loaded successfully. Reload restored item metadata; moving the token retained the link.
- Drawing → Link / edit image selection-menu callback → save. Open linked image callback opened its personal viewer.
- Edit title, Enabled off/on, Players on/off, GM/Player transition, hidden object visibility off/on, multiple selection disabled, scene A/B/A, unlink cancellation and confirmation all exercised through UI.
- Unlink left the original object present (2 objects before and after); deleting the drawing while its editor was open displayed the missing-object message. Unit tests independently compare every original object field after attach/edit/unlink.
- Unsafe HTTP URL and unsupported local-file type rejected. Local PNG preview and cancellation exercised. Browse Assets cancellation used a simulated empty SDK picker response; this is not a native upload/picker integration test.
- Viewer: open/close/Escape, zoom +/−, reset, mouse drag pan. Observed 125% zoom and translate(40px,20px), reset to 100%. Failure/retry exercised with a controlled HTTPS response fixture.
- Fixed a discovered bug: canvas pointer capture swallowed Retry clicks. Pointer capture now ignores button targets; actual Retry click recovered a visible image.
- Exploratory checks covered multi-selection, deleted objects, long title editing, URL failure, local file rejection/cancel, keyboard focus and role/scene transitions.
- Separate visual pass: initial and populated panel, dark/light themes, editor top/bottom and personal viewer. Panel widths 420 and 320 px; editor/viewer 360 px. Numeric document widths matched viewport widths (420/420, 320/320, 360/360); primary controls fit. Forms intentionally scroll vertically. No unintended horizontal overflow, overlapping controls, distorted image ratio or clipped primary panel action found in reviewed screenshots.
- Clean-session final pageerror collection was empty. The initial harness had an SDK builder-before-ready error; fixtures were corrected and the final session reloaded before checking console errors.

Screenshots are delivered outside the source tree in ../qa-object-links-2.0.0/.

## Still requires a real Owlbear room

The emulator cannot prove native context-menu placement/selection behavior across layers, server permissions, Assets upload/picker persistence, multiplayer on another device, touch pinch or fog behavior. No real-room pass is claimed. Headed downloaded Chromium failed to launch on this host (spawn UNKNOWN); UI QA used headless Chromium with explicit viewport screenshots.

Smoke test after deployment:

1. Confirm manifest version 2.0.0 and refresh the room once.
2. As GM select a token, then a Draw shape. Link a URL to each through the panel and selection menu.
3. Upload PNG/JPEG/WebP/GIF to Owlbear Assets, select the saved result, save and refresh both GM/player sessions. Confirm the saved HTTPS URL remains usable.
4. Move/rotate/scale original items; verify links open with original object appearance unchanged.
5. As Player check allowed, GM-only, disabled and hidden objects; no edit/unlink UI should appear.
6. Delete an object; its link disappears. Unlink another; the original object stays.
7. Switch scenes while editor/viewer is open; old-scene editing/opening must be unavailable.
8. Verify locked/transparent drawings using Owlbear selection behavior; use panel list if the item cannot be hit normally.

## Dependencies

npm audit fix updated source-map-js. The installed Owlbear SDK still brings an upstream uuid moderate advisory; npm reports 2 moderate entries including the SDK parent, with no compatible fix offered. No unverified major dependency override was applied.
