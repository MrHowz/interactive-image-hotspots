# Validation record

Executed on 20 October 2026 with Node.js 24.18.0, pinned Owlbear SDK 3.1.0, React 19.2.8, TypeScript 6.0.2 and Vite 8.2.0.

## Automated checks

- `npm test`: 9 tests pass (URL/file/draft validation, versioned metadata, circle/ellipse coordinates, scale and rotation, visibility, role restrictions, overlap and serialization).
- `npm run lint`: passes (Oxlint).
- `npm run build`: passes, including strict TypeScript checks and production assets.
- Production `dist/` includes manifest, icon, background, action/editor/viewer entry page and bundled assets. The test harness is excluded.

## Browser checks actually performed

Used the in-app Chromium browser with `tests/harness.html`. This is a **simulated SDK parent**, not an Owlbear server. It uses the actual installed SDK and production React components. Its disposable fixture storage is separate from production data.

- Panel fits a 420 px iframe; list and empty states render.
- Existing hotspot editor loads its name, URL, scene coordinates and radius.
- Editing and saving changes the list using SDK updateItems messages.
- Creating a new hotspot in a second simulated scene adds an item using the SDK builder and addItems messages.
- Delete first displays confirmation; confirming removes the item and its metadata.
- Switching simulated scenes shows the correct separate list and restores the original scene's hotspot on return.
- Changing simulated role to PLAYER removes edit/delete/place controls while retaining allowed image access.
- Switching simulated scenes while an editor is open disables the form and displays the stale-scene message.
- Reload retains harness fixture edits. This confirms serialization and UI reconnection, not Owlbear server persistence.
- Viewer opens, loads a real HTTPS image, zooms from 100% to 125%, resets and closes.
- Cached-image loading race was reproduced (image complete but hidden), corrected and rechecked: the cached image now renders.
- Dark and light theme switching inspected.
- One browser run returned no warning/error entries. A later browser capture reported a `MutationObserver.observe` TypeError without a source URL. Neither application source nor the installed SDK contains a MutationObserver call; attribution is unresolved. Zero-console-error status in a live Owlbear room is not claimed.

## Live-room checks still required

These cannot be claimed as passed without an authenticated Owlbear room and a second client:

1. Install the deployed HTTPS manifest, open a scene as GM and verify the background tool appears while the panel is closed.
2. Place a hotspot through the custom tool. Check the marker center and hit boundary after pan/zoom, on overlapping map items and with multiple hotspots.
3. Upload each supported file type, select its durable Owlbear asset and save. Cancel the upload destination and asset picker separately. Verify platform quota/size errors are understandable.
4. Use URL sources that succeed, return 404, time out or deny embedding. Check preview, error and Retry behavior.
5. Open the same room as PLAYER. Verify local-only viewer behavior, no GM controls and rejection of direct editor attempts.
6. With player MAP create/update/delete disabled, verify server-side item edits/deletes are denied. A frontend role check alone is not proof of server authorization.
7. Hide/disable a hotspot and mark one GM-only; verify none opens for players, including from an already-open viewer.
8. Refresh both clients, close/reopen the extension and revisit a saved scene. Confirm server persistence and asset URL durability.
9. Change scenes while editing, viewing and choosing an asset; stale editor saves should be rejected. Avoid switching precisely during the final SDK write, which has no atomic scene target.
10. Test touch pinch/pan, portrait and high-resolution images, keyboard focus/Escape, narrow mobile layout and both Owlbear themes.
11. Test actual GitHub Pages installation with a repository subpath and multiple clients. The workflow has been prepared, not run on GitHub.

No production API is mocked. The development harness does not validate Owlbear's asset storage, real tool dispatch, fog rendering or network synchronization.
