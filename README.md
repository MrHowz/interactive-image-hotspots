# Interactive Image Hotspots 1.1.1

React + TypeScript + Vite extension using Owlbear Rodeo SDK **3.1.0**. Link one image to any connected group of square grid cells. Markings can be hidden while the cells remain clickable. Existing circle hotspots continue to work.

## Install and develop

Requires Node.js 24:

```sh
npm ci
npm run dev
npm test
npm run lint
npm run build
```

For an HTTPS development server use `npm run dev:https` and trust the development certificate yourself if required. Never disable browser security. The extension requires an Owlbear parent; opening index.html directly shows a connection screen. The development-only SDK host at `http://127.0.0.1:5173/tests/harness.html` tests the real SDK client against simulated responses and is excluded from production builds.

## ใช้งานแบบเลือกช่อง

1. เปิด Scene ที่ใช้กริด **Square** แล้วเปิดแผง Image Hotspots ด้วยบัญชี GM
2. กด **Select cells** แล้วคลิกช่องบนแผนที่ที่ต้องการ เช่น 3 ช่องติดกัน หรือรูปตัว L คลิกช่องเดิมอีกครั้งเพื่อนำออก
3. แผงจะแสดงจำนวนช่องที่เลือก กด **Done · choose image ในแผง** หรือใช้เครื่องหมาย ✓ บนแถบเครื่องมือแผนที่
4. ตั้งชื่อ เลือกภาพจาก HTTPS URL, Owlbear Assets หรืออัปโหลดไฟล์ใหม่ แล้วกด Save
5. ใช้ **Explore** แล้วคลิกช่องใดก็ได้ในชุดนั้นเพื่อเปิดภาพเดียวกัน เฉพาะคนที่คลิกจะเห็น Viewer
6. ใช้ **Hide marks / Show marks** ในแต่ละรายการ หรือ **Hide all markings / Show all markings** เพื่อซ่อน/แสดงสีและกรอบ โดยยังคลิกช่องได้
7. ถ้าต้องการหยุดการคลิกจริง ๆ ให้เข้า Edit แล้วปิด **Enabled** ถ้าต้องการให้เฉพาะ GM ดู ให้ปิด **Players may open this image**
8. ใน Edit สามารถใช้ปุ่ม + เพิ่มช่องข้างเคียง หรือคลิกช่องที่เลือกเพื่อลบ เปลี่ยน X/Y เพื่อย้ายทั้งชุด หรือใช้ **Reselect cells** เพื่อเลือกบนแผนที่ใหม่

รองรับ 1–512 ช่องต่อภาพ โดยช่องต้องเชื่อมต่อกันตามด้าน (ติดกันเฉพาะมุมไม่ถือว่าเชื่อมต่อ) รุ่นนี้ไม่รองรับการเลือกช่องแบบ Hex/Isometric/Dimetric ขนาดช่องอ้างอิงจาก DPI ของ Scene ตอนสร้าง ระหว่างเลือกอย่าเปลี่ยนชนิดหรือขนาดกริด หากเปลี่ยนกริดหลังบันทึกแล้ว พื้นที่จะยังอยู่ที่พิกัดและขนาดเดิม ให้สร้างพื้นที่ใหม่หากต้องการใช้กริดขนาดใหม่

**การซ่อนกรอบไม่ใช่การซ่อนข้อมูลลับ** ผู้เล่นที่มีสิทธิ์ยังเปิดภาพจากช่องหรือรายการได้ Hotspots ไม่อิง Fog of War จึงต้องปิด Enabled/Players สำหรับข้อมูลที่ยังไม่ควรเปิดเผย

## Images and viewer

- PNG, JPEG, WebP and GIF uploads, up to 20 MB before Owlbear's own plan/platform limits.
- Choose file previews locally. **Upload & choose** uploads through Owlbear, then opens its asset picker to retrieve the saved image URL. `uploadImages()` returns void, so this second selection is required. Cancel the picker if upload was canceled.
- Temporary Blob URLs are preview-only and revoked. Persistent metadata contains HTTPS URLs, never image bytes. Deleting a hotspot does not delete a potentially shared library asset.
- GIF animation depends on whether the asset library preserves the uploaded format. A direct HTTPS GIF URL is another option.
- URL preview uses an actual image load without a CORS fetch/HEAD request. Private, expired, missing or embedding-restricted images show an error; the browser cannot reliably distinguish CORS/CORP, hotlink restrictions and network failures from an image error. No proxy or browser-security bypass is used.
- Viewer fits the image, supports button/wheel/pinch zoom, drag pan, Reset, Close/Escape, loading, timeout and retry. It opens for the clicking user only. No room-wide broadcast is implemented.

## Persistence and architecture

```text
src/model.ts        Versioned circle/cell metadata, validation, connectivity, hit geometry
src/sdk.ts          GM/scene guards, item CRUD, marker toggles and modal routing
src/background.ts   Explore/select modes, Done/Cancel actions and local selection preview
src/control.ts      LOCAL-only command transport between panel and background
src/controlProtocol.ts Request/reply matching, errors, timeout and listener cleanup
src/useSelection.ts Live selected-cell count and panel Done/Cancel controls
src/useScene.ts     Scene, role and theme subscriptions without recursive reload polling
src/CellPicker.tsx  Keyboard-accessible editing of connected cells
src/Editor.tsx      Name, image, region, coordinates and access settings
src/App.tsx         Scene list and individual/all-region marking toggles
src/images.ts       Browser image validation and Owlbear Assets integration
src/Viewer.tsx      Personal zoomable image viewer
public/             Manifest and tool/action icons
```

New regions are one locked **Path item** per image on the MAP layer. Multiple closed square paths display each chosen cell; metadata stores its cell size and relative integer cell coordinates under `io.github.interactive-image-hotspots/v1`. Schema version 2 stores the region; schema version 1 remains readable for old circle items. Item deletion removes its metadata, avoiding an orphan shared array.

Marker visibility (`marks`) is separate from interaction (`enabled`) and player access (`players`). Hiding marks sets both fill and stroke opacity to zero; it does not remove the item or its click geometry. Legacy circles retain their old item visibility behavior, but also support the new independent marking toggle. Re-enable Legacy visibility before using an old hidden circle as an invisible clickable point.

Scene coordinates, rotation and scale are respected by hit testing. Holes and unselected cells inside a region's bounding box do not respond. Overlap resolves by descending z-index, then ID. Each click tests the selected cells only; no canvas screenshot or global click interception is used. **Explore must be active for map clicks.**

Selection lives in background-owned memory and one **local-only Path preview**. Panel commands use SDK broadcast with `destination: 'LOCAL'`, matching request IDs and explicit acknowledgments; the background checks the sender's connection ID and GM/scene before starting. It also owns tool activation. No Tool Metadata exchange between frames is required. The first map click can initialize a draft even if an activation callback was not delivered. Clicks and commands are queued in order. Each click updates the local preview and panel count; there is no shared scene item write until Save. Escape/Cancel drops the draft; leaving the mode clears its preview. Metadata, geometry and name save together in one item update. The all-markings toggle uses one batched update.

A legacy circle is converted by adding the new Path first, then deleting the circle, because SDK updates retain the item type. If the scene changes or deletion fails between those operations, both may remain: the image is preserved, and the old circle can be deleted manually. Normal region edits preserve their item ID.

Scene metadata stores a small scene identity. Stale modal routes are rejected after switching scenes. There is no atomic scene-targeted write in this SDK; wait for writes to finish before switching scenes. Duplicated scenes may copy identities, so close modal windows before switching between copies. Concurrent edits to the same region follow Owlbear's update behavior. Saved hotspot data never uses localStorage; the harness uses a separate disposable fixture store for tests only.

## Permissions

Disable player **MAP_CREATE, MAP_UPDATE and MAP_DELETE** permissions in the room. UI, tool callbacks and mutation functions also require GM. Locked items alone are not an authorization boundary. The SDK has no private metadata ACL per extension: shared URLs can be read by other clients/extensions, and a client granted MAP edit permissions may edit items. Stronger protection from malicious clients requires platform support or a trusted service.

## Cloudflare Pages deployment and updates

1. Upload this project's files to your GitHub repository root. `package.json` must appear at the root. Do not upload node_modules or dist. The `.github` workflow is for GitHub Pages and can be omitted for Cloudflare.
2. Cloudflare **Workers & Pages → Create application → Pages → Connect to Git**. Choose the repository and main branch.
3. Set build command `npm run build`, output directory `dist`, root directory blank, and environment variable `NODE_VERSION=24`.
4. Deploy. Install into Owlbear using `https://YOUR-PROJECT.pages.dev/manifest.json` and enable the extension in the room.
5. For an existing installation, commit updated files to GitHub and wait for Cloudflare to deploy, then refresh the Owlbear room once. If cached manifest data remains, re-add the custom extension using the same manifest URL.

Version 1.1.1 replaces the 1.1.0 Tool Metadata handoff that could leave the background without a draft and produce “Select cells from the Hotspots panel to start.” The previous harness had shared one metadata object across frames, masking that dependency; the updated harness deliberately returns no Tool Metadata and can suppress activation callbacks. The precise live-host failure mechanism still requires confirmation after deployment, but this release removes both dependencies. The manifest slash correction and non-recursive scene loading fix are retained. This local package has not automatically updated your GitHub repository or deployed website.

## GitHub Pages alternative

The supplied workflow tests, lints, builds and deploys dist on pushes to main. Enable GitHub Actions as the Pages source. For a repository subpath, change the four paths in public/manifest.json to include `/YOUR-REPOSITORY/` before deployment (icon, background_url, action.icon, action.popover). The default paths target a domain-root deployment such as Cloudflare Pages. Runtime modal/tool URLs and Vite assets resolve relative to their deployed page; no SPA rewrite is needed.

## Validation and official references

See [TESTING.md](TESTING.md) for checks actually executed and the remaining live-room checklist. Passing simulated tests does not establish real Owlbear permissions, image asset persistence, network rate-limit behavior or multi-client sync.

API signatures were checked against the installed SDK declarations and official docs:

- [Grid](https://docs.owlbear.rodeo/extensions/apis/scene/grid/) — DPI, type and snapPosition with center-only snapping.
- [Tools](https://docs.owlbear.rodeo/extensions/apis/tool/) — modes, actions and pointer scene coordinates.
- [Local items](https://docs.owlbear.rodeo/extensions/apis/scene/local/) — local selection previews.
- [Assets](https://docs.owlbear.rodeo/extensions/apis/assets/), [Scene items](https://docs.owlbear.rodeo/extensions/apis/scene/items/), [Manifest](https://docs.owlbear.rodeo/extensions/reference/manifest/).
