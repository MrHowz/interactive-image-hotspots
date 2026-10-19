# Validation record — 1.1.0

Executed 20 October 2026 using Node.js 24.18.0, Owlbear SDK 3.1.0 and the local Vite server. This record distinguishes automated checks, browser checks against a simulated SDK host, and checks still needed in a real Owlbear room.

## Automated

- `npm test`: 19 tests pass.
- `npm run lint`: Oxlint passes.
- `npm run build`: strict TypeScript and Vite production build pass.
- Tests cover adjacent cell clicks; three cells opening the same image; hidden markings retaining player clicks; Disabled/Players gates; L-shape gaps; negative cell coordinates; rotated/scaled geometry; connectedness; duplicate/empty/oversized regions; persisted version-2 metadata; selection parsing; URL/file validation; old circle geometry/visibility; and manifest slash boundaries.
- Production entries include the action/editor/viewer page and background page. The simulated host and tests are not included in dist.

## Browser checks actually executed for 1.1.0

Used the real installed SDK client and React components with `tests/harness.html`, an explicitly labeled simulated Owlbear parent. The harness also loads the actual background entry point, dispatches the SDK's custom-tool events, emulates square-grid snapping and displays local-preview/shared-write counts.

1. Select cells in the panel, then click three adjacent simulated map cells. Count reached 3 selected, one local preview and **zero shared writes**.
2. Invoke Done through the registered SDK tool action. Editor received the same 3-cell selection and scene origin; local preview was removed.
3. Set a real HTTPS image URL, turn **Show cell markings off**, then Save. The list contained one 3-cell image region and the host recorded one shared item write.
4. Switch simulated role to PLAYER and click an **unmarked cell** on the simulated map. The background hit callback opened the correct image viewer. The image loaded and GM controls were absent.
5. Switch to GM, edit the existing region, remove a cell and add a neighboring cell. Save an L-shaped region with markings on. The item remained one region with 3 cells.
6. Reselect existing cells on the map and Cancel. The saved list stayed intact; no extra shared item write occurred and no local preview remained.
7. Reload the harness. The stored version-2 region and old circle both appeared, including the marking state. This verifies the harness fixture serialization, not Owlbear server persistence.

A test-only harness stacking problem initially caused map controls to cover editor clicks. Adding a z-index to the harness modal corrected it; deselection was then rechecked and changed 3 cells to 2 before adding the L-shaped cell. This CSS is not part of production.

## Previously checked in the browser

The earlier release's harness checks exercised create/edit/delete confirmation, personal viewer zoom/reset/close, theme changes, role changes, scene isolation and stale-editor disabling. A cached-image loading race was reproduced and fixed. A browser capture once reported a MutationObserver error without a source URL; application and installed SDK source contain no MutationObserver call, so attribution remains unresolved. Zero-console-error status in a live room is not claimed.

## Live Owlbear checks still required

- Deploy this update, install/reload its manifest and verify real custom-tool registration and Done/Cancel action placement.
- Verify center-only grid snapping and all cell boundaries against the actual map at different pan/zoom values. Test cells in a line, L shapes, holes, overlap, negatives and a larger region.
- Verify markings on/off for both GM and PLAYER while clicks remain active. Verify Enabled off and Players off prevent player access, including an already-open viewer.
- Test upload, asset-picker cancellation, image quotas and durable uploaded URLs; test remote image failure and retry.
- Verify real MAP permissions, shared item synchronization and persistence after refresh/revisiting scenes with two clients.
- Test scene/grid changes while selecting, editing or uploading, plus legacy circle conversion. Conversion is add-before-delete, not an atomic type replacement.
- Test keyboard and mobile touch gestures, both themes, and very large image layouts.
- Observe real Realtime traffic/console behavior with the other room extensions. The earlier reported 4003 rate limit has not been reproduced here and its cause is not established. This update retains the fix that removes recursive scene snapshot re-fetching.

No production SDK API is mocked. The host simulator is only test tooling. No live-room deployment or multiplayer validation was performed by the agent for this release.
