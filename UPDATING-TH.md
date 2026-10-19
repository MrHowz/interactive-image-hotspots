# แก้ปัญหาเลือกช่องไม่ได้ — เวอร์ชัน 1.1.1

ชุดนี้เปลี่ยนการส่งคำสั่งระหว่างแผงกับ background ให้มีการตอบรับ ไม่ต้องอ่านชุดช่องจาก Tool Metadata และเพิ่มจำนวนช่องพร้อมปุ่ม Done/Cancel ในแผง

1. แตก ZIP interactive-image-hotspots-github-update-1.1.1.zip
2. เปิดหน้าแรก Repository MrHowz/interactive-image-hotspots → Add file → Upload files
3. ลากไฟล์และโฟลเดอร์ภายใน ZIP ทับตำแหน่งเดิม โดยให้ src, public และ package.json อยู่ที่ระดับหลัก อย่าอัปโหลด ZIP หรือโฟลเดอร์ครอบทั้งก้อน
4. Commit ลง main แล้วรอ Cloudflare Pages Deploy สำเร็จ
5. เปิด https://interactive-image-hotspots.pages.dev/manifest.json ตรวจ version 1.1.1
6. ปิดแท็บห้องซ้ำให้เหลือแท็บเดียว แล้วรีเฟรชห้องหนึ่งครั้ง แผงรุ่นใหม่จะมีข้อความ v1.1.1 ด้านล่าง

ต้องอัปเดตโค้ดทั้งชุด โดยเฉพาะ src/background.ts, src/sdk.ts, src/App.tsx และไฟล์ใหม่ src/control.ts, src/controlProtocol.ts, src/useSelection.ts ไม่ใช่แก้เฉพาะ Manifest

วิธีใช้:
Select cells → เห็น 0 cells selected → คลิกช่องบนแผนที่ → จำนวนเพิ่มขึ้น → กด Done · choose image ในแผง → ตั้งชื่อ/เลือกภาพ → Save
ถ้าแผงปิดเมื่อคลิกแผนที่ ให้เปิด Image Hotspots อีกครั้ง จำนวนช่องจะกลับมาแสดง
Hide marks ซ่อนกรอบแต่ยังกดได้ ส่วน Enabled ใช้หยุดการคลิกจริง ๆ

ชุดนี้ผ่าน automated tests และการทดสอบ SDK host จำลอง ยังไม่ได้อัปโหลดเข้า GitHub หรือยืนยันผลบนห้อง Owlbear จริงโดยอัตโนมัติ
