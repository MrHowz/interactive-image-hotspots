# อัปเดตเป็น Image Links 2.0.0

1. แตก interactive-image-hotspots-github-update-2.0.0.zip
2. เปิด repository MrHowz/interactive-image-hotspots → Add file → Upload files
3. อัปโหลดไฟล์และโฟลเดอร์ภายใน ZIP ทับตำแหน่งเดิม ให้ package.json, src, public อยู่ root อย่าอัปโหลด ZIP ทั้งก้อน
4. Commit main แล้วรอ Cloudflare Pages deploy สำเร็จ (npm run build / output dist)
5. เปิด https://interactive-image-hotspots.pages.dev/manifest.json ตรวจ version 2.0.0
6. ปิดแท็บห้อง Owlbear ซ้ำให้เหลือแท็บเดียวแล้ว Refresh หนึ่งครั้ง หากชื่อ Action ยังเก่าให้อัปเดต/ติดตั้ง Manifest เดิมในหน้าจัดการ Extensions และเปิดใช้ในห้อง
7. แผงใหม่ชื่อ Image Links มีข้อความ v2.0.0 ด้านล่าง ใช้ Owlbear Select เลือก Token หรือ Drawing หนึ่งชิ้น → Link image → ใส่ภาพ → Save image link
8. เปิดภาพด้วย Open image หรือ Open linked image ในเมนูของวัตถุ ไม่ใช้ Select cells / Explore เดิม

ลิงก์เดิมยังอยู่ในรายการ Unlink ไม่ลบวัตถุเดิม หากจะเอารูป Marker เก่าออกจากแผนที่ ให้ตรวจว่าเป็น Marker ที่ไม่ใช้แล้วแล้วลบเองด้วยเครื่องมือ Owlbear
