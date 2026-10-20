# อัปเดตเป็น 3.0.0 บน GitHub + Cloudflare

1. แตกไฟล์ **interactive-image-hotspots-github-update-3.0.0.zip**
2. เข้า repository `MrHowz/interactive-image-hotspots` → Add file → Upload files
3. ลากไฟล์และโฟลเดอร์ทั้งหมดข้างใน ZIP ลง root เดิม โดยให้ `package.json`, `src/`, `public/` อยู่ระดับหลัก ไม่ซ้อนโฟลเดอร์ชื่อ ZIP
4. Commit changes ลง main
5. รอ Cloudflare Pages deployment ใหม่สำเร็จ (build `npm run build`, output `dist`, Node 24)
6. เปิด https://interactive-image-hotspots.pages.dev/manifest.json ตรวจ version เป็น 3.0.0
7. รีเฟรชห้อง Owlbear แล้วเปิด Image Links จะเห็น Point, Rectangle, Ellipse, Freehand, Grid cells และ Explore

การสร้าง: เลือกเครื่องมือ → คลิก/ลากพื้นที่ → เลือกภาพ → Save → Explore → คลิกพื้นที่ครั้งเดียว
Grid cells เลือกหลายช่องแล้วกด Done · choose image
ซ่อนกรอบ: Edit → ปิด Show border to GM / Show border to players ตามต้องการ พื้นที่ยังกดได้
Token เดิม: Select Token → Link an existing token or object → Link image → Save → Explore แล้วคลิก Token

อย่าลบ Scene item เดิมเพื่ออัปเดต Extension ลิงก์เก่ายังคงอยู่ใน metadata ของ Scene
ไฟล์ CellPicker/control เก่าใน ZIP เป็น migration stub เพื่อแทนที่เวอร์ชันเก่าเมื่ออัปโหลดผ่านเว็บ ไม่ใช่ฟังก์ชัน production ที่รอ implementation

ไฟล์ที่ส่งเป็นแพ็กเกจในเครื่อง ยังไม่ได้อัปโหลด GitHub หรือ deploy ให้เอง
