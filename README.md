# Font Tweeks

เครื่องมือ local สำหรับปรับแต่ง Custom Font ไฟล์เดียว และเปรียบเทียบกับ Default ผ่านข้อความไทย–อังกฤษหลายขนาดและน้ำหนัก ก่อนส่งออกฟอนต์และ CSS สำหรับโปรเจกต์เว็บ

`project-overview` ที่ได้รับเป็นไฟล์ว่าง เวอร์ชันนี้จึงเริ่มจากขอบเขตการใช้งานด้านล่าง โดยไม่ได้แก้ไขไฟล์ข้อกำหนดต้นฉบับ

## เริ่มใช้งาน

ต้องมี Node.js 22.12+ และ Python 3.10+ (ทดสอบด้วย Node 24 และ Python 3.13)

```sh
npm install
npm run setup
npm run dev
```

เปิด http://127.0.0.1:5173 — คำสั่งเดียวเปิดทั้ง Vite และ FastAPI บน `127.0.0.1:8000` กด Ctrl+C เพื่อหยุดทั้งคู่

ติดตั้ง dependencies และฟอนต์ตัวอย่างไว้ใน workspace นี้แล้ว สามารถเริ่มด้วย `npm run dev` ได้เลย

## สิ่งที่ทำได้

เมนู Playground, Font inspector, Export & use และ Font library อยู่บน Nav Bar ส่วน Fine-tune เป็น sidebar ด้านซ้าย โดยเลื่อนเนื้อหาภายในแยกจากพื้นที่ preview ได้ บนจอเล็กเปิด sidebar ด้วยปุ่ม Fine-tune บน Nav Bar

- นำเข้า TTF, OTF, WOFF, WOFF2 ไม่เกิน 20 MB ต่อไฟล์ ด้วยการลากวางหรือเลือกไฟล์
- เก็บฟอนต์ใน IndexedDB และค่าปรับแต่งใน localStorage ให้กลับมาทำต่อหลังรีเฟรชได้
- เลือก Custom Font ไฟล์เดียวสำหรับทุกภาษา ไม่ต้องจับคู่ฟอนต์
- ทดลองข้อความที่พิมพ์เอง พร้อมตัวอย่างไทย อังกฤษ ข้อความผสม และสระ–วรรณยุกต์
- แสดงกริดตามแนวทาง [Test Fonts Template](https://codepen.io/mintsw/pen/wvbGewx): 11 ขนาด (11, 12, 13, 14, 15, 16, 18, 20, 24, 30, 36px ที่ base 16px) × 4 น้ำหนัก (400, 500, 600, 700)
- ทุกช่องแสดง Custom Font และ Default ด้วยข้อความ ขนาด และน้ำหนักเดียวกัน
- Default เริ่มต้นเป็น `sans-serif` ของระบบ หรือเลือกฟอนต์ต้นฉบับก่อน Fine-tune เป็นตัวเทียบได้
- ปรับ base font size, line height, letter spacing และ size-adjust เฉพาะ Custom Font โดย Default ไม่รับ Fine-tune
- ปรับ ascent/descent/line-gap ด้วย CSS font metrics overrides
- เปิดเส้นบรรทัด และดูบนพื้นหลังสว่างหรือเข้ม
- สำรวจ glyph, Unicode, ความครอบคลุมภาษา, variable axes, OpenType features และ license จากไฟล์จริง
- แจ้งตัวอักษรที่ไม่มีในฟอนต์จากข้อความตัวอย่าง
- ส่งออก ZIP ที่มี `fonts/custom.woff2` ไฟล์เดียว, CSS, JSON preset, license ที่มีในต้นฉบับ และคำแนะนำ
- เลือก subset ไทย/Latin เพื่อลดขนาดไฟล์ โดยเก็บ OpenType layout features รวมถึง mark positioning
- บันทึก/นำเข้า preset และคัดลอกหรือดาวน์โหลด CSS แยกได้

## ใช้ไฟล์ที่ส่งออก

คัดลอก `fonts.css` และ `fonts/` ไปไว้ใน public directory เดียวกัน เช่น `/typography/`

```html
<link rel="stylesheet" href="/typography/fonts.css" />
<article class="font-project">สวัสดี Hello, world.</article>
```

หรือใช้ตัวแปร CSS กับ typography system ของโปรเจกต์เอง:

```css
body {
  font-family: var(--font-project);
}
```

Preset เก็บเฉพาะการตั้งค่า เมื่อนำเข้าจะใช้กับฟอนต์ที่เลือกอยู่ใน workspace ปัจจุบัน ไม่ฝังไฟล์ฟอนต์ไว้ใน JSON การตั้งค่าจากเวอร์ชัน Font Pairing เดิมจะย้ายค่าฟอนต์ไทยมาเป็น Custom Font ที่เลือก พร้อมรักษาไฟล์ในไลบรารีไว้

`Export weight` เป็นน้ำหนักเริ่มต้นใน CSS ที่ส่งออก ส่วนกริดแสดงน้ำหนัก 400–700 พร้อมกันเสมอ ขนาดในกริดคำนวณจาก base font size เช่น base 20px ทำให้แถว 16px เดิมแสดงเป็น 20px

## ขอบเขต

การปรับขนาดและ metrics ใช้ CSS descriptors โดยรักษาเส้นตัวอักษรต้นฉบับ เครื่องมือนี้ยังไม่ใช่ editor สำหรับวาด glyph หรือแก้จุด anchor ภายในฟอนต์ น้ำหนักที่แสดงได้จริงขึ้นกับน้ำหนัก/แกน `wght` ของไฟล์ต้นฉบับ และ browser อาจสร้างน้ำหนักจำลองสำหรับ static font

Subset เก็บอักษรไทย `U+0E00–0E7F`, Latin `U+0020–024F` และเครื่องหมายทั่วไปตาม `server/app.py` หากต้องใช้ภาษาอื่น emoji หรือสัญลักษณ์เพิ่มเติมให้ปิด subset การตรวจ missing glyph อ้างอิง cmap ของไฟล์ต้นฉบับ ควรทดสอบชุด WOFF2 กับข้อความจริงหลัง export ด้วย

การอ่านและแปลงไฟล์ทำในหน่วยความจำของ Python บนเครื่องนี้ ไม่มี database หรือที่เก็บ upload ฝั่ง server และไม่มีการส่งฟอนต์ไปบริการภายนอก การล้าง site data ใน browser จะล้างไลบรารีและการตั้งค่า

`npm run build` สร้าง frontend ใน `dist/` แต่การ inspect/export ยังต้องใช้ Python API ไม่สามารถนำเฉพาะ `dist/` ไปใช้เป็น static site แล้วใช้ฟังก์ชันทั้งหมดได้ ส่วน `npm run preview` ต้องเปิด API แยกด้วย `.venv/bin/python -m uvicorn server.app:app --host 127.0.0.1 --port 8000`

## ตรวจสอบ

```sh
npm run build
npm test
```

Integration tests ใช้ฟอนต์จริง ตรวจ metadata, TTF/OTF/WOFF/WOFF2, CSS, subset, Thai mark/mkmk, variable weight, ไฟล์ ZIP ที่เปิดกลับได้, และการจัดการไฟล์/ค่าที่ไม่ถูกต้อง

API docs: http://127.0.0.1:8000/api/docs

## โครงสร้าง

```text
src/                 React + TypeScript UI และ browser storage
server/app.py        FastAPI + fontTools สำหรับอ่านและส่งออกฟอนต์
public/fonts/        Inter และ Noto Sans Thai พร้อม OFL licenses
scripts/             setup และ dev process runner
tests/               integration tests ของ font pipeline
```

ใช้ API จากเอกสาร [fontTools](https://fonttools.readthedocs.io/en/latest/) และ [FastAPI](https://fastapi.tiangolo.com/tutorial/request-files/)

ฟอนต์ตัวอย่างมาจาก [Google Fonts — Noto Sans Thai](https://github.com/google/fonts/tree/main/ofl/notosansthai) และ [Inter](https://github.com/google/fonts/tree/main/ofl/inter) ภายใต้ SIL OFL 1.1 มีไฟล์ license เต็มแนบไว้ใน `public/fonts/` และรวมใน ZIP เมื่อ export ฟอนต์ตัวอย่าง
