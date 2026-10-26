import { useId, useState } from "react";
import { Info } from "lucide-react";

const explanations: Record<string, string> = {
  "Custom Font": "เลือกฟอนต์ที่ต้องการปรับแต่ง ค่าขนาด สัดส่วน และ metrics จะใช้กับ Custom Font ส่วน Default ใช้เป็นตัวเทียบโดยไม่ผ่าน Fine-tune",
  "Base font size": "ขนาดตัวอักษรฐาน หน่วย px ใช้ใน CSS ที่ส่งออก และใช้คำนวณขนาดทั้ง Custom และ Default ในตาราง เช่น Base 16px จะแสดงแถว BASE ที่ 16px",
  "Export weight": "น้ำหนักตัวอักษรเริ่มต้นใน CSS ที่ส่งออก: 400 คือ Regular และ 700 คือ Bold ค่านี้ไม่เปลี่ยนคอลัมน์ 400–700 ใน Preview และไม่เพิ่มน้ำหนักใหม่ให้ไฟล์ฟอนต์",
  "Line height": "ความสูงบรรทัดเป็นสัดส่วนของขนาดตัวอักษร เช่น 1.65 ที่ขนาด 16px เท่ากับ 26.4px เพิ่มค่าเพื่อเว้นพื้นที่ให้สระและวรรณยุกต์ ใช้กับ Custom Font ส่วน Default คงค่า 1.65",
  "Letter spacing": "เพิ่มหรือลดระยะห่างระหว่างตัวอักษรของ Custom Font หน่วย px ค่า 0 ใช้ระยะปกติ ค่าบวกทำให้โปร่งขึ้น ค่าลบทำให้แน่นขึ้น ควรตรวจคำภาษาไทยและวรรณยุกต์ด้วย",
  "Size adjust": "ปรับสัดส่วน Custom Font ผ่าน size-adjust โดยไม่เปลี่ยนขนาดฐาน เช่น 110% ขยายเป็น 1.1 เท่า ใช้เทียบขนาดที่มองเห็นกับ Default ซึ่งยังคงสัดส่วนต้นฉบับ",
  "Override font metrics": "เปิดเพื่อกำหนด Ascent, Descent และ Line gap แทนค่าจากฟอนต์ มีผลต่อการจัดบรรทัดของ Custom Font โดยไม่เปลี่ยนรูปทรงตัวอักษร ปิดเพื่อใช้ metrics ต้นฉบับ",
  Ascent: "พื้นที่เหนือเส้นฐานของ Custom Font คิดเป็นเปอร์เซ็นต์ของขนาดฟอนต์ ใช้กำหนดพื้นที่ด้านบนสำหรับตัวอักษร สระ และวรรณยุกต์ ควรตรวจการซ้อนทับเมื่อปรับค่านี้",
  Descent: "พื้นที่ใต้เส้นฐานของ Custom Font คิดเป็นเปอร์เซ็นต์ของขนาดฟอนต์ ใช้กำหนดพื้นที่ด้านล่าง เช่น สระอุ สระอู และส่วนหางของตัวอักษรอังกฤษ",
  "Line gap": "ช่องว่างเพิ่มเติมระหว่างบรรทัดใน metrics ของ Custom Font คิดเป็นเปอร์เซ็นต์ของขนาดฟอนต์ ค่า 0 ไม่เพิ่มช่องว่างส่วนนี้ ผลที่เห็นยังขึ้นอยู่กับ Line height ที่กำหนด",
  Kerning: "ใช้ข้อมูลจากฟอนต์เพื่อปรับระยะห่างเฉพาะคู่ตัวอักษร เช่น AV หรือ To ให้สมดุลขึ้น มีผลเมื่อฟอนต์มีข้อมูล kerning และแตกต่างจาก Letter spacing ที่เพิ่มระยะทั้งข้อความ",
  "Standard ligatures": "อนุญาตให้ฟอนต์ใช้รูปตัวอักษรเชื่อมมาตรฐาน เช่น fi และ fl เมื่อมีข้อมูลรองรับ การปิดตัวเลือกนี้ไม่ได้ปิดการจัดรูปอักษรภาษาไทยที่จำเป็น",
  "Subset ไทย + Latin": "ลดขนาดไฟล์ส่งออกโดยเก็บช่วงอักษรไทย ละติน และเครื่องหมายทั่วไป พร้อมข้อมูลจัดรูปอักษร ปิดเมื่อต้องใช้ภาษาอื่นหรือสัญลักษณ์ที่อยู่นอกช่วงเหล่านี้",
  "Font family name": "ชื่อฟอนต์ที่จะใช้ใน @font-face และ CSS ที่ส่งออก ใช้ชื่อภาษาอังกฤษขึ้นต้นด้วย A–Z ตามด้วยตัวอักษร ตัวเลข ช่องว่าง - หรือ _ ไม่เกิน 64 ตัวอักษร",
  "Default font": "เลือกฟอนต์สำหรับเทียบ: System sans-serif ใช้ฟอนต์ระบบ ส่วน Original font ใช้ไฟล์ฟอนต์ที่เลือกก่อนปรับ Fine-tune ทั้งสองแบบแสดงที่ขนาดและน้ำหนักเดียวกับ Custom Font",
};

export default function SettingHelp({ label }: { label: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 12, top: 12 });
  const explanation = explanations[label];
  if (!explanation) return null;
  return (
    <>
      <button
        type="button"
        className="setting-help-button"
        aria-label={`ข้อมูล ${label}`}
        aria-expanded={open}
        aria-controls={id}
        aria-describedby={open ? id : undefined}
        popoverTarget={id}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setPosition({
            left: Math.max(12, Math.min(rect.left, window.innerWidth - 292)),
            top: Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - 232)),
          });
        }}
        onKeyDown={(event) => {
          if (open && event.key === "Escape") event.stopPropagation();
        }}
      >
        <Info size={14} aria-hidden="true" />
      </button>
      <span
        id={id}
        popover="auto"
        className="setting-help-popover"
        style={position}
        onToggle={(event) => setOpen(event.newState === "open")}
      >
        <strong>{label}</strong>
        <span className="setting-help-description">{explanation}</span>
      </span>
    </>
  );
}
