# Interactive Image Hotspots · 3.0.0

React + TypeScript + Vite extension for Owlbear Rodeo, using the installed SDK **3.1.0**. Draw clickable image areas or attach an image to an existing token/object. No backend or database.

## วิธีใช้งานสำหรับ GM

1. เปิด Scene แล้วเปิดแผง **Image Links**
2. เลือกวิธีสร้างพื้นที่:
   - **Point**: คลิกจุดบนแผนที่หนึ่งครั้ง
   - **Rectangle / Ellipse**: ลากสร้างสี่เหลี่ยมหรือวงรี แล้วปล่อยเมาส์
   - **Freehand**: ลากล้อมบริเวณที่ต้องการแล้วปล่อย ระบบปิดรูปให้ กดได้ทั้งพื้นที่ภายใน ไม่ใช่เฉพาะเส้น
   - **Grid cells**: คลิกช่องเพื่อเพิ่ม/เอาออก เลือก 3 ช่องหรือหลายช่องร่วมภาพเดียวกันได้ แล้วกด **Done · choose image** ในแผงหรือปุ่ม ✓ ในแถบเครื่องมือ (Enter ใช้ได้เมื่อแผนที่มี focus)
3. เมื่อหน้าต่าง Image area เปิด ให้ตั้งชื่อและใส่ HTTPS image URL → Preview URL หรือ Choose file / Browse Assets
4. เลือก **Show border to GM** และ **Show border to players** แยกกัน ค่าเริ่มต้น GM เห็นกรอบ ผู้เล่นไม่เห็น **ปิดกรอบแล้วยังกดได้**
5. กด **Save image link** พื้นที่ถูกบันทึกลง Scene ตอนนี้เท่านั้น
6. เลือก **Explore · click to open** แล้วคลิกพื้นที่หนึ่งครั้งเพื่อเปิดภาพเฉพาะตัวเอง ไม่ต้องคลิกขวา

Escape ยกเลิกร่างที่กำลังวาด; Cancel drawing ยกเลิกแล้วกลับ Explore ปิดหน้าต่าง Image area โดยไม่ Save จะไม่สร้างพื้นที่ค้าง

### เก็บระบบ Link กับ Token / Drawing เดิม

ใช้เครื่องมือ Select ของ Owlbear เลือกวัตถุเดียว → เปิด **Link an existing token or object** ในแผง → **Link image** → เลือกภาพแล้วบันทึก จากนั้นใช้ Explore คลิกวัตถุเพื่อเปิดภาพได้เลย

ลิงก์ติดอยู่กับ ID ของวัตถุ เมื่อย้าย/หมุน/ปรับขนาด Token ลิงก์ยังอยู่ การลบวัตถุลบลิงก์ไปด้วย **Unlink → Confirm unlink** เอาเฉพาะลิงก์ออก ไม่ลบ Token ไม่แก้รูปลักษณ์หรือชื่อของวัตถุเดิม เมนู Link / edit image เป็นทางเลือกสำหรับ GM ไม่ใช่ขั้นตอนเปิดภาพ

### แก้ไขพื้นที่และสิทธิ์

- **Edit**: เปลี่ยนชื่อ ภาพ Enabled และสิทธิ์ Players; สำหรับพื้นที่ใหม่มีสวิตช์กรอบ GM/ผู้เล่น และตำแหน่ง x/y กับ scaleX/scaleY
- **Delete area → Confirm delete**: ลบเฉพาะพื้นที่ที่ Extension สร้าง; Keep link ยกเลิกการลบ
- **Enabled** ปิดการเปิดจากแผนที่; GM ยังดู preview จากรายการได้
- **Players may open this image** ปิดเพื่อให้ GM ดูได้คนเดียวผ่าน Extension
- การปิดกรอบต่างจากการซ่อน Scene item ทั้งชิ้น: item ที่ visible=false ผู้เล่นจะเปิดไม่ได้
- รูปทรงใหม่เป็นพื้นที่โปร่งใสและล็อกไว้ ไม่ขวางการเลือก Token กรอบเป็น local overlay แยกตามบทบาท
- หากต้องการเปลี่ยนรูปทรงโดยวาดใหม่ ให้สร้างพื้นที่ใหม่แล้วลบพื้นที่เดิม; รุ่นนี้แก้ตำแหน่งและสเกลได้ แต่ไม่มีตัวแก้ไข vertex

## วิธีใช้งานสำหรับ Player

เลือก **Explore · click to open** แล้วคลิกพื้นที่/Token ที่ GM กำหนดหนึ่งครั้ง หรือเปิดจากรายการในแผง ภาพแสดงเฉพาะคนที่คลิก ใช้ +/−, Reset, ลากภาพ, scroll/pinch เพื่อซูม ปิดด้วย ✕ หรือ Escape

**ข้อจำกัดการคลิก:** SDK ที่ติดตั้งมี callback คลิกของ Custom Tool แต่ไม่มี global click listener ที่ยืนยันได้สำหรับ Move เดิม จึงต้องเลือก Explore ของ Extension เพื่อเปิดจากแผนที่ Explore ยอมให้การลากใช้พฤติกรรมเริ่มต้นของ Owlbear ผ่าน preventDrag แต่ native dragging ต้องตรวจในห้องจริง ไม่อ้างว่าดับเบิลคลิกด้วย Move เดิมเปิดภาพได้

## รูปภาพและ Persistence

- HTTPS URL ต้องเข้าถึงได้ด้วยเบราว์เซอร์ของผู้เล่นด้วย โหลดตรวจจริงก่อน Save ไม่มี proxy ข้ามข้อจำกัดของเซิร์ฟเวอร์
- PNG/JPEG/WebP/GIF สูงสุด 20 MB เลือกไฟล์ → **Upload & choose** → เลือกภาพที่อัปโหลดใน Asset Picker ของ Owlbear อีกครั้ง (SDK uploadImages คืน void ไม่คืน URL)
- Preview ไฟล์ใช้ Blob ชั่วคราวได้ แต่ข้อมูลที่บันทึกใช้ durable HTTPS URL จาก Asset Picker เท่านั้น
- เก็บ schema v4 ของพื้นที่และ schema v3 ของ Token ที่ `item.metadata["io.github.interactive-image-hotspots/v1"]`; ไม่มีข้อมูลภาพ binary/base64 ใน metadata
- Scene metadata เก็บ scene identity สำหรับป้องกันบันทึกผิด Scene ไม่มี localStorage ใน Production
- การวาด/เลือกช่องและกรอบแสดงผลใช้ scene.local; มีการเขียน shared item เมื่อ Save/Edit/Delete เท่านั้น ไม่มี network write ทุกครั้งที่ขยับเมาส์
- รองรับข้อมูล circle/cells รุ่นเก่าในรายการและ Explore; ไม่ล้างข้อมูลเดิมอัตโนมัติ
- Grid cells รองรับ square grid เท่านั้น สูงสุด 256 ช่องต่อภาพ ตำแหน่ง snap จาก SDK; Freehand จำกัด 256 vertices และลดจุดระหว่างลาก ภาพวงรีแทนด้วย polygon 48 จุด
- พื้นที่ใหม่ซ้อนกันเปิดอันที่ zIndex สูงกว่า; Token ที่โดนคลิกตรง ๆ มีความสำคัญก่อนพื้นที่ด้านหลัง

## Permissions

UI และ mutation ตรวจ GM/Scene ใหม่ก่อนเขียน Player ไม่มีปุ่มแก้ไข แต่ SDK ไม่มี ACL เฉพาะ metadata namespace: คนที่มีสิทธิ์แก้ shared object ผ่านระบบห้องอาจแก้ metadata ได้ จึงควรตั้งสิทธิ์ห้องให้เหมาะสม URL ไม่เป็นความลับ และ Fog of War ไม่ได้ซ่อนรายการลิงก์อัตโนมัติ ปิด Players/Enabled สำหรับภาพที่ยังไม่ควรเปิด

## โครงสร้าง

- `areas.ts`: polygon/ellipse/cell geometry, validation, hit tests
- `model.ts`: versioned metadata, URLs, permissions, token link operations และ legacy geometry
- `sdk.ts`: SDK guards, save/delete/link, editor/viewer modals
- `scene-tools.ts`: custom modes, local drawing previews, role-specific outlines, scene lifecycle
- `tool-state.ts`: LOCAL status/control ระหว่างแผงกับ background
- `App.tsx`, `Editor.tsx`, `Viewer.tsx`: UI; `useScene.ts`: subscriptions/cleanup
- `images.ts`: URL loading, upload and durable asset picker
- `background.ts`: tool registration และ GM link context menu
- `tests/`: unit tests และ simulated SDK browser host; ไม่รวมใน Production build

## Development

Node.js 24:

```sh
npm ci
npm run dev
npm test
npm run lint
npm run build
```

`npm run dev:https` สำหรับทดสอบกับ Owlbear ต้อง trust development certificate ตามขั้นตอนเบราว์เซอร์ อย่าปิด browser security เว็บที่เปิดตรง ๆ แสดง Connecting เพราะต้องมี Owlbear parent ทดสอบ UI จำลองที่ `http://127.0.0.1:5173/tests/harness.html` รายละเอียดผลจริงใน TESTING.md

## Cloudflare Pages ผ่าน GitHub

1. แตก `interactive-image-hotspots-github-update-3.0.0.zip` แล้วอัปโหลด **เนื้อหาข้างใน** ไป root ของ repository เดิม (package.json, src/, public/ อยู่ระดับหลัก)
2. Commit ลง main แล้วให้ Cloudflare Pages build จาก GitHub
3. Build command `npm run build`; Output `dist`; Root directory ว่าง; Environment variable `NODE_VERSION=24`
4. รอ deployment ใหม่สำเร็จ ตรวจ `/manifest.json` แสดง version `3.0.0`
5. URL ติดตั้งของโปรเจกต์นี้: `https://interactive-image-hotspots.pages.dev/manifest.json`
6. เพิ่มผ่านหน้า Extensions ของ Owlbear แล้วเปิดใช้ในห้อง หากติดตั้งแล้ว รีเฟรชห้องหลัง deploy; ถ้า manifest เดิมยังถูกเก็บไว้ ให้นำ URL เดิมเข้าใหม่และเปิดใช้ Extension อีกครั้ง

ไม่ต้องเปิด GitHub Pages เมื่อใช้ Cloudflare Pages ส่วน ZIP `deploy-3.0.0` คือเนื้อหา dist สำหรับ Cloudflare Direct Upload (ใช้กับโปรเจกต์แบบ Direct Upload)

Manifest ใช้ `/index.html`, `/background.html`, `/icon.svg` มี slash ก่อนชื่อไฟล์ ป้องกัน URL ผิดแบบ `pages.devindex.html`

### GitHub Pages (ทางเลือก)

`npm ci && npm run build` แล้ว publish dist โดยคงโครงสร้างไฟล์ หากใช้ repository subpath เช่น `/interactive-image-hotspots/` ให้เปลี่ยน manifest icon/background_url/action.icon/action.popover ให้ขึ้นต้นด้วย `/interactive-image-hotspots/` ก่อน build Vite base `./` รองรับ asset paths แบบ relative; manifest root paths ต้องปรับเองสำหรับ subpath

## API references

Verified against installed SDK 3.1.0 TypeScript declarations and implementations:
- https://docs.owlbear.rodeo/extensions/apis/tool/
- https://docs.owlbear.rodeo/extensions/tutorial-custom-tool/implement-the-line-mode/

การทดสอบในเครื่องใช้ simulated SDK host ยังต้องทดสอบห้อง Owlbear จริงสองบทบาท, native drawing/dragging, Asset upload/picker และจอสัมผัสก่อนถือว่าผ่าน end-to-end ของแพลตฟอร์ม
