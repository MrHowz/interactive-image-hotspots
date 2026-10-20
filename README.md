# Interactive Image Hotspots / Image Links 2.0.0

Owlbear Rodeo extension using React, TypeScript, Vite and the installed SDK **3.1.0**. Images now attach to existing shared scene objects: tokens, drawings, shapes, paths, text and other selectable items. One image per object; different objects may use the same URL. No backend or database.

## วิธีใช้งานใหม่

1. เปิด Scene ด้วยบัญชี GM แล้วใช้เครื่องมือ Select ของ Owlbear เลือก **วัตถุเดียว** เช่น Token หรือรูปที่สร้างจาก Draw
2. เปิดแผง **Image Links** จะเห็นชื่อวัตถุใน Selected on map แล้วกด **Link image** หรือใช้ **Link / edit image** ในเมนูที่แสดงเมื่อเลือกวัตถุ
3. ตั้งชื่อภาพ วาง HTTPS image URL แล้วกด Preview URL หรือเลือกไฟล์ / Browse Assets
4. กด **Save image link** ชื่อภาพเป็นชื่อของลิงก์ ไม่เปลี่ยนชื่อ Token หรือ Drawing
5. เปิดภาพจาก **Open image** ในแผง หรือ **Open linked image** ในเมนูของวัตถุ เฉพาะคนที่เปิดจะเห็นภาพ
6. ใช้ปุ่ม + / −, Reset, ลากภาพ หรือ pinch บนจอสัมผัส ปิดด้วย ✕ หรือ Escape
7. **Edit** ใช้เปลี่ยนภาพ/ชื่อ/สิทธิ์; ปิด Enabled เพื่อหยุด Player เปิด หรือปิด Players may open this image เพื่อให้ GM ดูเท่านั้น
8. **Unlink → Confirm unlink** เอาเฉพาะลิงก์ออก วัตถุบนแผนที่ยังอยู่

ถ้าต้องการพื้นที่ 3 ช่องติดกัน ให้ใช้ Draw สร้างสี่เหลี่ยมหรือรูปทรงคลุมพื้นที่นั้นแล้วผูกภาพกับรูปที่วาด ไม่ต้องใช้เครื่องมือ Select cells เดิม การย้าย/หมุน/ปรับขนาดวัตถุใช้เครื่องมือ Owlbear ตามปกติ ลิงก์ติดอยู่กับ ID ของวัตถุ การซ่อนกรอบ/สีให้ปรับ Style ของ Drawing ใน Owlbear; ลิงก์ไม่แก้รูปลักษณ์วัตถุ การเลือกวัตถุโปร่งใส/ล็อก/disableHit ขึ้นกับ hit-testing ของ Owlbear และยังเปิดภาพจากรายการได้ตามสิทธิ์

Player เลือกวัตถุที่มีลิงก์แล้วใช้ Open linked image หรือเปิดผ่านรายการ Available links ในแผง ไม่ต้องเข้าโหมดพิเศษ การคลิกปกติยังใช้เลือกและย้าย Token ตามพฤติกรรม Owlbear; Extension ไม่ดัก global click หรือบังคับเปิดภาพจากทุกคลิก

## ภาพและการจัดเก็บ

- HTTPS URLs ไม่มี username/password; ตรวจด้วยการโหลดภาพจริงก่อนบันทึก แหล่งภาพต้องอนุญาตให้ฝังภาพและเข้าถึงได้โดยผู้เล่นด้วย
- PNG, JPEG, WebP, GIF สูงสุด 20 MB; Choose file แสดง preview ชั่วคราว แล้ว **Upload & choose** จะอัปโหลดไป Owlbear Assets จากนั้นเลือกภาพที่บันทึกแล้วใน picker อีกครั้ง SDK uploadImages คืนค่า void จึงไม่สมมติ URL จากผล upload
- หลังเลือก Assets บันทึก durable HTTPS URL เท่านั้น ไม่เก็บ Blob URL, binary หรือ base64 ใน Metadata
- ปัญหา private/expired URL, hotlink protection, browser policy หรือเครือข่ายจะแสดง error ไม่มี proxy หลีกเลี่ยงข้อจำกัดเบราว์เซอร์
- เก็บข้อมูลรุ่น 3 ที่ item.metadata['io.github.interactive-image-hotspots/v1'] ได้แก่ title, url, enabled, players; ใช้ namespace เดิมเพื่ออ่านข้อมูลรุ่นเก่าได้
- Scene metadata เก็บเพียง scene identity สำหรับกันบันทึกข้าม Scene ไม่มี localStorage เป็นฐานข้อมูล Production
- เมื่อวัตถุถูกลบ metadata ของลิงก์ถูกลบไปด้วย ไม่มีตารางแยกที่ต้องตามล้าง
- Legacy circle/cell items ยังแสดงในรายการเพื่อเปิด/แก้ลิงก์/Unlink ไม่ลบวัตถุเก่าอัตโนมัติ เมื่อแก้ลิงก์จะเปลี่ยนเป็น schema รุ่น 3 บนวัตถุเดิม ระบบเลือกช่อง/Explore เดิมยุติแล้ว

## Permissions และข้อจำกัด

UI และทุก mutation ตรวจ GM role และ scene ใหม่ก่อนเขียน Player ไม่เห็นคำสั่งแก้ไข Extension ปฏิเสธการเปิดผ่าน UI เมื่อวัตถุซ่อนอยู่, Enabled ปิด หรือ Players ปิด (GM ยังเปิด preview ได้)

SDK ไม่มี ACL เฉพาะ namespace ของ Extension ผู้ที่มีสิทธิ์แก้ไขวัตถุผ่านระบบห้องอาจแก้ shared metadata ได้ด้วย จึงไม่สามารถรับประกันการกันแก้ metadata จาก client อื่นด้วย frontend ล้วน ปรับสิทธิ์แก้ไขวัตถุตามห้องและอย่าใช้ URL เป็นข้อมูลลับ Fog of War ไม่ได้จำกัดรายการโดยอัตโนมัติ ต้องปิด Players/Enabled สำหรับภาพที่ยังไม่ควรให้ดู

รองรับ shared scene items เท่านั้น ไม่ผูกกับ local-only item และเลือกครั้งละหนึ่งวัตถุ Native selection/context menu และ Asset Picker ต้องทดสอบในห้องจริงก่อนใช้งานเกมสำคัญ

## Development / testing

Requires Node.js 24:

```sh
npm ci
npm run dev
npm test
npm run lint
npm run build
```

`npm run dev:https` ใช้ HTTPS สำหรับทดสอบกับ Owlbear และต้อง trust development certificate ตามเบราว์เซอร์ อย่าปิด browser security เปิด index.html ตรง ๆ จะแสดง Connecting เพราะต้องมี Owlbear parent

`http://127.0.0.1:5173/tests/harness.html` เป็น simulated SDK host สำหรับ UI QA ใช้ SDK client จริงกับ postMessage responses จำลองและ fixture localStorage เฉพาะการทดสอบ ไม่อยู่ใน Production Build อ่าน QA-INVENTORY.md และ TESTING.md สำหรับขอบเขตผลทดสอบ

## Cloudflare Pages ผ่าน GitHub

1. อัปโหลดเนื้อหาใน ZIP github-update-2.0.0 ลง root ของ repository เดิม โดยให้ package.json, src/, public/ อยู่ระดับหลัก แล้ว Commit main
2. Cloudflare Pages → Git repository เลือก repository นี้ ตั้ง Production branch เป็น main
3. Build command: `npm run build` / Build output directory: `dist` / Root directory: ว่าง / Node version: 24
4. รอ Deploy สำเร็จ; public/manifest.json ถูกคัดลอกเป็น dist/manifest.json และ Vite base './' รองรับโดเมน root ของ Pages
5. ตรวจ `https://interactive-image-hotspots.pages.dev/manifest.json` ว่า version เป็น 2.0.0
6. ใน Owlbear จัดการ Extensions → Add extension ด้วย Manifest URL ด้านล่าง เปิดใช้ในห้อง จากนั้นปิดแท็บห้องซ้ำและ Refresh หนึ่งครั้ง

```text
https://interactive-image-hotspots.pages.dev/manifest.json
```

หากใช้ชื่อโครงการอื่น เปลี่ยน hostname ตาม URL ที่ Cloudflare ให้ อย่าใช้ URL หน้า GitHub หรือ index.html เป็น Manifest

## GitHub Pages (ทางเลือก)

ใช้ workflow ที่ให้ใน .github/workflows/deploy.yml แล้วตั้ง Settings → Pages → Source เป็น GitHub Actions หาก deploy ใต้ /repository/ ต้องเปลี่ยน public/manifest.json ทุก asset/action/background path ให้ขึ้นต้น /repository/ ก่อน build (Manifest ใช้ absolute paths เพื่อกันปัญหาโดเมนต่อกับ index.html) และติดตั้งด้วย https://USERNAME.github.io/REPOSITORY/manifest.json ชุด github-update สำหรับ Cloudflare ไม่รวม workflow นี้

## Architecture

- src/model.ts — versioned schema, URL/file validation, metadata-only attach/detach, player availability, legacy reading
- src/sdk.ts — scene/role guards, save/unlink, editor/viewer modals
- src/background.ts — native object selection-menu registration and scene identity; no grid tools, polling or control broadcasts
- src/useScene.ts — scene/items/selection/theme subscriptions with cleanup and stale-load guards
- src/App.tsx — selected-object card and link manager
- src/Editor.tsx / images.ts — URL preview, Owlbear assets upload/picker and image validation
- src/Viewer.tsx — personal fullscreen image, zoom/pan/pinch/loading/retry
- tests/ — unit tests and development-only SDK host

Empty retired modules replace old files during browser-based GitHub uploads; they are not imported by the production entry points.

API references verified against installed SDK declarations and official docs: [Context menu](https://docs.owlbear.rodeo/extensions/apis/context-menu/), [Player selection](https://docs.owlbear.rodeo/extensions/apis/player/), [Scene items](https://docs.owlbear.rodeo/extensions/apis/scene/), [Assets](https://docs.owlbear.rodeo/extensions/apis/assets/).
