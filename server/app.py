"""Local-only font inspection, CSS generation and OpenType-aware subsetting."""
from io import BytesIO
from hashlib import sha256
from pathlib import Path
import json
import re
from zipfile import ZipFile, ZIP_DEFLATED
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from fontTools import subset
from fontTools.ttLib import TTFont
from pydantic import BaseModel, Field, ValidationError

app = FastAPI(title="Font Tweeks", docs_url="/api/docs", openapi_url="/api/openapi.json")
MAX_FONT_BYTES = 20 * 1024 * 1024
THAI = set(range(0x0E00, 0x0E80))
LATIN = set(range(0x20, 0x0250)) | set(range(0x2000, 0x2070)) | {0x20AC, 0x2122, 0x2190, 0x2191, 0x2192, 0x2193, 0x2212, 0xFEFF, 0xFFFD}
THAI_REQUIRED = set(range(0x0E01, 0x0E3B)) | set(range(0x0E3F, 0x0E5C))
FONT_DIR = Path(__file__).resolve().parents[1] / "public" / "fonts"
DEMO_LICENSES = {
    sha256((FONT_DIR / f"{name}.ttf").read_bytes()).digest(): (FONT_DIR / f"{name}-OFL.txt").read_text()
    for name in ("NotoSansThai", "Inter")
}

class Face(BaseModel):
    script: str = Field(pattern="^(custom|thai|latin)$")
    file_index: int = Field(ge=0, le=49)
    scale: float = Field(default=100, ge=50, le=200)
    ascent: float = Field(default=110, ge=0, le=300)
    descent: float = Field(default=35, ge=0, le=150)
    line_gap: float = Field(default=0, ge=0, le=100)
    override_metrics: bool = False
    weight_min: int = Field(default=400, ge=1, le=1000)
    weight_max: int = Field(default=400, ge=1, le=1000)
    style: str = Field(default="normal", pattern="^(normal|italic)$")

class Project(BaseModel):
    family: str = Field(default="My Project Font", min_length=1, max_length=64, pattern=r"^[A-Za-z][A-Za-z0-9 _-]*$")
    faces: list[Face] = Field(min_length=1, max_length=2)
    subset: bool = True
    font_size: int = Field(default=32, ge=12, le=96)
    line_height: float = Field(default=1.65, ge=1, le=2.5)
    letter_spacing: float = Field(default=0, ge=-2, le=5)
    weight: int = Field(default=400, ge=100, le=900)
    kerning: bool = True
    ligatures: bool = True

def parse_font(data: bytes) -> TTFont:
    if not data or len(data) > MAX_FONT_BYTES:
        raise HTTPException(413, "ไฟล์ฟอนต์ต้องมีขนาดไม่เกิน 20 MB")
    try:
        font = TTFont(BytesIO(data), recalcTimestamp=False)
        for table in ("head", "hhea", "maxp", "cmap", "name"):
            font[table]
        return font
    except Exception as exc:
        raise HTTPException(422, "ไม่สามารถอ่านฟอนต์นี้ได้ กรุณาใช้ไฟล์ TTF, OTF, WOFF หรือ WOFF2 ที่สมบูรณ์") from exc

def font_name(font: TTFont, name_id: int) -> str:
    return font["name"].getDebugName(name_id) or ""

def inspect_font(data: bytes, filename: str) -> dict:
    font = parse_font(data)
    try:
        cmap = font.getBestCmap() or {}
        units = font["head"].unitsPerEm
        axes = [{"tag": a.axisTag, "min": a.minValue, "default": a.defaultValue, "max": a.maxValue} for a in font["fvar"].axes] if "fvar" in font else []
        features = sorted({r.FeatureTag for t in ("GSUB", "GPOS") if t in font and font[t].table.FeatureList for r in font[t].table.FeatureList.FeatureRecord})
        weight = font["OS/2"].usWeightClass if "OS/2" in font else 400
        weight_axis = next((a for a in axes if a["tag"] == "wght"), None)
        return {"name": font_name(font, 16) or font_name(font, 1) or filename,
            "style": font_name(font, 17) or font_name(font, 2) or "Regular", "filename": filename, "size": len(data),
            "glyph_count": font["maxp"].numGlyphs, "units_per_em": units, "axes": axes, "features": features,
            "weight_min": int(weight_axis["min"]) if weight_axis else weight, "weight_max": int(weight_axis["max"]) if weight_axis else weight,
            "italic": bool(font["head"].macStyle & 2), "ascent": round(font["hhea"].ascent / units * 100, 2),
            "descent": round(abs(font["hhea"].descent) / units * 100, 2), "line_gap": round(font["hhea"].lineGap / units * 100, 2),
            "thai_count": len(set(cmap) & THAI), "thai_coverage": round(len(set(cmap) & THAI_REQUIRED) / len(THAI_REQUIRED) * 100),
            "latin_count": len(set(cmap) & set(range(0x20, 0x7F))), "codepoints": sorted(cmap),
            "license": font_name(font, 13), "license_url": font_name(font, 14),
            "embedding_restricted": bool(font["OS/2"].fsType & 2) if "OS/2" in font else False}
    except Exception as exc:
        raise HTTPException(422, "ข้อมูลภายในไฟล์ฟอนต์ไม่สมบูรณ์") from exc
    finally:
        font.close()

def stylesheet(project: Project) -> str:
    if len(project.faces) > 1 and any(f.script == "custom" for f in project.faces):
        raise HTTPException(422, "Custom Font ใช้ไฟล์เดียวสำหรับทุกภาษา")
    if len({f.script for f in project.faces}) != len(project.faces):
        raise HTTPException(422, "เลือกฟอนต์ได้หนึ่งไฟล์ต่อภาษา")
    blocks = ["/* Generated with Font Tweeks · UTF-8 */"]
    for face in project.faces:
        weight = str(face.weight_min) if face.weight_min == face.weight_max else f"{face.weight_min} {face.weight_max}"
        lines = ["@font-face {", f'  font-family: "{project.family}";', f'  src: url("./fonts/{face.script}.woff2");', f"  font-style: {face.style};", f"  font-weight: {weight};", "  font-display: swap;", f"  size-adjust: {face.scale:g}%;"]
        if face.override_metrics:
            lines += [f"  ascent-override: {face.ascent:g}%;", f"  descent-override: {face.descent:g}%;", f"  line-gap-override: {face.line_gap:g}%;"]
        if len(project.faces) > 1:
            lines += ["  unicode-range: U+0E00-0E7F;" if face.script == "thai" else "  unicode-range: U+0000-0DFF, U+0E80-10FFFF;"]
        lines += ["}"]
        blocks.append("\n".join(lines))
    blocks.append(f':root {{\n  --font-project: "{project.family}", sans-serif;\n}}\n\n.font-project {{\n  font-family: var(--font-project);\n  font-size: {project.font_size}px;\n  font-weight: {project.weight};\n  line-height: {project.line_height:g};\n  letter-spacing: {project.letter_spacing:g}px;\n  font-kerning: {"normal" if project.kerning else "none"};\n  font-variant-ligatures: {"common-ligatures" if project.ligatures else "none"};\n}}')
    return "\n\n".join(blocks) + "\n"

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.post("/api/inspect")
def inspect(file: UploadFile = File(...)):
    return inspect_font(file.file.read(MAX_FONT_BYTES + 1), file.filename or "font")

@app.post("/api/stylesheet")
def css(project: Project):
    return {"css": stylesheet(project), "config": project.model_dump()}

@app.post("/api/export")
def export(config: str = Form(...), files: list[UploadFile] = File(...)):
    try:
        project = Project.model_validate_json(config)
    except (ValidationError, ValueError) as exc:
        raise HTTPException(422, "การตั้งค่าโปรเจกต์ไม่ถูกต้อง") from exc
    css_text = stylesheet(project)
    if any(face.file_index >= len(files) for face in project.faces):
        raise HTTPException(422, "ไม่พบไฟล์ฟอนต์ที่เลือก")
    output = BytesIO()
    with ZipFile(output, "w", ZIP_DEFLATED) as archive:
        for face in project.faces:
            source = files[face.file_index]
            source.file.seek(0)
            data = source.file.read(MAX_FONT_BYTES + 1)
            font = parse_font(data)
            try:
                if "OS/2" in font and font["OS/2"].fsType & 2:
                    raise HTTPException(422, "ฟอนต์นี้ระบุข้อจำกัดการฝังฟอนต์ กรุณาตรวจสอบสิทธิ์กับเจ้าของฟอนต์")
                if project.subset:
                    if "OS/2" in font and font["OS/2"].fsType & 0x0100:
                        raise HTTPException(422, "ฟอนต์นี้ไม่อนุญาตให้ subset กรุณาปิดตัวเลือก subset")
                    options = subset.Options()
                    options.layout_features = ["*"]
                    options.name_IDs = ["*"]
                    options.name_legacy = True
                    options.name_languages = ["*"]
                    subsetter = subset.Subsetter(options=options)
                    keep = THAI if face.script == "thai" else LATIN
                    if len(project.faces) == 1:
                        keep = THAI | LATIN
                    subsetter.populate(unicodes=keep)
                    subsetter.subset(font)
                font.flavor = "woff2"
                buf = BytesIO()
                font.save(buf)
                archive.writestr(f"fonts/{face.script}.woff2", buf.getvalue())
                license_text = DEMO_LICENSES.get(sha256(data).digest(), font_name(font, 13))
                if license_text:
                    archive.writestr(f"licenses/{face.script}.txt", license_text + "\n" + font_name(font, 14))
            except HTTPException:
                raise
            except Exception as exc:
                raise HTTPException(422, "แปลงฟอนต์ไม่สำเร็จ กรุณาตรวจสอบไฟล์ต้นฉบับ") from exc
            finally:
                font.close()
        archive.writestr("fonts.css", css_text)
        archive.writestr("font-tweeks.json", json.dumps(project.model_dump(), ensure_ascii=False, indent=2))
        archive.writestr("README.md", f'# {project.family}\n\n1. Copy fonts.css and fonts/ into the same public directory.\n2. Load fonts.css using a stylesheet link.\n3. Apply class="font-project" to your container.\n\nUse --font-project in your own typography system.\nMetrics and size adjustments are CSS descriptors; original outlines are preserved.\nKeep original font licenses with redistributed files.\nSubsetting retains Thai shaping features; test with your actual content.\n')
    slug = re.sub(r"[^a-z0-9]+", "-", project.family.lower()).strip("-") or "font-project"
    return Response(output.getvalue(), media_type="application/zip", headers={"Content-Disposition": f'attachment; filename="{slug}.zip"'})
