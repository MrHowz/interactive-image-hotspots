# อัปเดตเป็น 1.1.0 บน GitHub และ Cloudflare

1. แตกไฟล์ interactive-image-hotspots-github-update-1.1.0.zip
2. เปิดหน้าแรก Repository MrHowz/interactive-image-hotspots แล้วเลือก Add file → Upload files
3. ลาก **ไฟล์และโฟลเดอร์ภายใน ZIP** ลงไป ให้ src, public และ package.json อยู่ระดับเดิม อย่าลากโฟลเดอร์ครอบทั้งหมด
4. Commit changes ลง main เพื่อแทนที่ไฟล์ชื่อเดิมและเพิ่ม CellPicker/ไอคอนใหม่
5. รอ Cloudflare Pages Deploy รอบใหม่สำเร็จ (Build npm run build, Output dist, NODE_VERSION=24)
6. เปิด https://interactive-image-hotspots.pages.dev/manifest.json ตรวจว่า version เป็น 1.1.0
7. กลับ Owlbear เหลือห้องเพียงแท็บเดียว แล้วรีเฟรชหนึ่งครั้ง หาก Manifest ยังถูก cache ให้เอา Extension ออกแล้วเพิ่ม URL Manifest เดิมอีกครั้ง

วิธีใช้: Select cells → คลิกช่องติดกันบนแผนที่ → กด ✓ Done บนแถบเครื่องมือ → เลือกภาพ → Save
Hide marks / Show marks ซ่อนหรือแสดงกรอบเท่านั้น ช่องยังคลิกได้
ปิด Enabled เมื่อต้องการหยุดการคลิกจริง ๆ
ใช้กริด Square และเลือกได้สูงสุด 512 ช่องต่อภาพ ต้องต่อกันตามด้าน

ชุดนี้อัปเดตทั้งโค้ด ไม่ใช่เปลี่ยน Manifest อย่างเดียว และยังไม่ได้อัปโหลดเข้าบัญชี GitHub ของคุณอัตโนมัติ
