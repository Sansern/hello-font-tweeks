import { useState, type CSSProperties } from "react";
import { CheckCircle2, ChevronDown, Grid2X2, Info, Type } from "lucide-react";
import type { FontAsset, Settings } from "./types";

export const samples = {
  mixed:
    "การออกแบบที่ดี เริ่มต้นจากตัวอักษรที่อ่านง่าย ภาษาไทยและ English อยู่ด้วยกันอย่างลงตัว Aa กข ญฐ น้ำ ปี่ กุ้ง ตกลง OK ยกเลิก Cancel 0123456789",
  thai: "ภาษาไทยมีเสน่ห์ในทุกตัวอักษร น้ำค้างยามเช้าบนกิ่งไม้สีเขียว ปู่ย่าซื้อก๋วยเตี๋ยวให้เด็ก ๆ ตัวอักษรที่อ่านง่ายช่วยให้เรื่องราวชัดเจนขึ้น กขคง ญฐ ฎฏ ๐๑๒๓๔๕๖๗๘๙",
  english:
    "Good typography makes every detail count. The quick brown fox jumps over the lazy dog. Aa Bb Cc, office, affinity, fluent. Confirm OK · Cancel · 0123456789",
  marks:
    "กิ กี กึ กื กุ กู ก่ ก้ ก๊ ก๋ ปี่ ปี้ ปื้ น้ำ นี่ นี้ นึ้ นื้ ญู ฐู ปู่ย่าซื้อก๋วยเตี๋ยว กุ้งเผา น้ำผึ้ง ฤๅ ฿ ๐๑๒๓๔๕๖๗๘๙ 0123456789",
};
const sizes = [
  ["4XS", 11],
  ["3XS", 12],
  ["2XS", 13],
  ["XS", 14],
  ["SM", 15],
  ["BASE", 16],
  ["LG", 18],
  ["XL", 20],
  ["2XL", 24],
  ["3XL", 30],
  ["4XL", 36],
] as const;
const weights = [
  [400, "Regular"],
  [500, "Medium"],
  [600, "Semibold"],
  [700, "Bold"],
] as const;

interface Props {
  settings: Settings;
  selected?: FontAsset;
  text: string;
  sample: keyof typeof samples;
  onTextChange: (text: string) => void;
  onSampleChange: (sample: keyof typeof samples) => void;
  missing: string[];
}

export default function TypeSpecimen({
  settings,
  selected,
  text,
  sample,
  onTextChange,
  onSampleChange,
  missing,
}: Props) {
  const [dark, setDark] = useState(false);
  const [guides, setGuides] = useState(false);
  const [baseline, setBaseline] = useState("system");
  const defaultFamily =
    baseline === "original" ? "TweeksOriginal, sans-serif" : "sans-serif";
  const isVariable = selected?.info.axes.some((axis) => axis.tag === "wght");
  return (
    <section
      className={`preview-panel specimen-panel ${dark ? "dark-canvas" : ""}`}
      aria-label="เปรียบเทียบ Custom Font กับ Default"
    >
      <div
        className="specimen-scroll"
        tabIndex={0}
        role="region"
        aria-label="Preview text และ Type Specimen เลื่อนดูได้"
      >
        <div className="preview-toolbar">
          <div className="preview-title">
            <Type size={18} />
            <strong>Preview text</strong>
            <span className="live-dot" />
          </div>
          <div className="preview-tools">
            <button
              className={`icon-button ${guides ? "enabled" : ""}`}
              title="แสดงเส้นบรรทัด"
              aria-pressed={guides}
              onClick={() => setGuides(!guides)}
            >
              <Grid2X2 size={16} />
            </button>
            <span className="tool-divider" />
            <button
              className={`color-button light ${!dark ? "picked" : ""}`}
              title="พื้นหลังสว่าง"
              onClick={() => setDark(false)}
            />
            <button
              className={`color-button night ${dark ? "picked" : ""}`}
              title="พื้นหลังเข้ม"
              onClick={() => setDark(true)}
            />
          </div>
        </div>
        <div className="specimen-fonts">
          <div className="specimen-custom-name">
            <span>
              Custom Font
              <strong>{selected?.info.name ?? "กำลังโหลดฟอนต์…"}</strong>
            </span>
          </div>
          <div className="specimen-default-source">
            <label>
              Default
              <span className="select-wrap">
                <select
                  aria-label="Default font สำหรับเปรียบเทียบ"
                  value={baseline}
                  onChange={(e) => setBaseline(e.target.value)}
                >
                  <option value="system">System sans-serif</option>
                  <option value="original">Original font · ก่อนปรับ</option>
                </select>
                <ChevronDown size={14} />
              </span>
            </label>
          </div>
        </div>
        <div className="sample-tabs">
          {(
            [
              ["mixed", "ไทย + English"],
              ["thai", "ภาษาไทย"],
              ["english", "English"],
              ["marks", "สระ & วรรณยุกต์"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              className={sample === key ? "active" : ""}
              onClick={() => onSampleChange(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="specimen-editor">
          <label htmlFor="specimen-text">
            ข้อความทดสอบ <span>ใช้ข้อความเดียวกันทุกช่อง</span>
          </label>
          <textarea
            id="specimen-text"
            aria-label="ข้อความตัวอย่าง แก้ไขได้"
            value={text}
            spellCheck={false}
            onChange={(e) => onTextChange(e.target.value)}
            rows={2}
          />
          <div className="preview-footnote">
            <span>
              <Type size={13} />
              แก้ข้อความด้านบนเพื่อเปรียบเทียบทุกขนาดพร้อมกัน
            </span>
            <span>{Array.from(text).length} characters</span>
          </div>
        </div>
        <div className="specimen-grid-caption">
          <span>TYPE SPECIMEN</span>
          <span>
            Base {settings.font_size}px · Line height {settings.line_height}
            {selected && !isVariable
              ? ` · ไฟล์นี้มีน้ำหนัก ${selected.info.weight_min}; น้ำหนักอื่นอาจถูกจำลองโดยเบราว์เซอร์`
              : ""}
          </span>
        </div>
        <table className={`specimen-table ${guides ? "show-guides" : ""}`}>
          <caption className="sr-only">
            Custom Font เทียบกับ Default: ขนาด 11 ถึง 36px ที่ base 16px
            และน้ำหนัก 400, 500, 600, 700
          </caption>
          <thead>
            <tr>
              <th scope="col">SIZE</th>
              {weights.map(([weight, label]) => (
                <th key={weight} scope="col">
                  <strong>{weight}</strong>
                  <span>{label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sizes.map(([label, size]) => {
              const pixels =
                Math.round(((size * settings.font_size) / 16) * 100) / 100;
              const common: CSSProperties = {
                fontSize: pixels,
                fontWeight: 400,
                fontStyle: selected?.info.italic ? "italic" : "normal",
              };
              return (
                <tr key={label}>
                  <th scope="row">
                    <span>{label}</span>
                    <strong>
                      {pixels}
                      <small>px</small>
                    </strong>
                  </th>
                  {weights.map(([weight]) => (
                    <td key={weight}>
                      <div
                        className="specimen-sample custom-sample"
                        style={
                          {
                            "--sample-line": `${pixels * settings.line_height}px`,
                          } as CSSProperties
                        }
                      >
                        <small>CUSTOM</small>
                        <p
                          className="live-type"
                          style={{ ...common, fontWeight: weight }}
                        >
                          {text || "\u00a0"}
                        </p>
                      </div>
                      <div
                        className="specimen-sample default-sample"
                        style={
                          {
                            "--sample-line": `${pixels * 1.65}px`,
                          } as CSSProperties
                        }
                      >
                        <small>DEFAULT</small>
                        <p
                          style={{
                            ...common,
                            fontFamily: defaultFamily,
                            fontWeight: weight,
                            fontStyle:
                              baseline === "original"
                                ? common.fontStyle
                                : "normal",
                            lineHeight: 1.65,
                            letterSpacing: 0,
                            fontKerning: "normal",
                            fontVariantLigatures: "common-ligatures",
                          }}
                        >
                          {text || "\u00a0"}
                        </p>
                      </div>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="preview-status">
          <span className={missing.length ? "warning-text" : ""}>
            {missing.length ? <Info size={14} /> : <CheckCircle2 size={14} />}
            <span>
              {!selected
                ? "กำลังอ่านฟอนต์…"
                : missing.length
                  ? `ไม่พบ ${missing.slice(0, 12).join(" ")} ใน Custom Font (${missing.length} ตัว)`
                  : "Custom Font รองรับตัวอักษรในตัวอย่างครบ"}
            </span>
          </span>
          <span>Default ใช้ขนาดเท่ากัน · ไม่ใช้ Fine-tune</span>
        </div>
      </div>
    </section>
  );
}
