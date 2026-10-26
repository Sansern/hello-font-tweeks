import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Code2,
  Copy,
  Download,
  FileType2,
  FolderOpen,
  Grid2X2,
  Info,
  Layers,
  LoaderCircle,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  initialSettings,
  type FontAsset,
  type FontInfo,
  type Settings,
} from "./types";
import { deleteFont, getFonts, loadSettings, storeFont } from "./storage";
import TypeSpecimen, { samples } from "./TypeSpecimen";

type Tab = "playground" | "glyphs" | "export";

const sizeLabel = (n: number) =>
  n > 1024 * 1024
    ? `${(n / 1024 / 1024).toFixed(1)} MB`
    : `${(n / 1024).toFixed(1)} KB`;
const message = (e: unknown) =>
  e instanceof Error ? e.message : "เกิดข้อผิดพลาด กรุณาลองใหม่";
async function responseError(r: Response) {
  const data = await r.json().catch(() => ({}));
  return new Error(
    typeof data.detail === "string"
      ? data.detail
      : "การตั้งค่าไม่ถูกต้อง หรือบริการฟอนต์ไม่พร้อมใช้งาน",
  );
}
async function inspect(file: File): Promise<FontInfo> {
  const body = new FormData();
  body.append("file", file);
  const r = await fetch("/api/inspect", { method: "POST", body });
  if (!r.ok) throw await responseError(r);
  return r.json();
}
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Range({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (n: number) => void;
}) {
  return (
    <div className="range-field">
      <div className="field-line">
        <label>{label}</label>
        <span className="number-wrap">
          <input
            aria-label={`${label} value`}
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => {
              if (e.target.value && Number.isFinite(e.target.valueAsNumber))
                onChange(Math.min(max, Math.max(min, e.target.valueAsNumber)));
            }}
          />
          <small>{unit}</small>
        </span>
      </div>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={
          {
            "--range": `${((value - min) / (max - min)) * 100}%`,
          } as CSSProperties
        }
      />
    </div>
  );
}
function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: () => void;
}) {
  return (
    <button
      className="toggle-row"
      role="switch"
      aria-checked={value}
      onClick={onChange}
    >
      <span>
        {label}
        {description && <small>{description}</small>}
      </span>
      <span className={`switch ${value ? "on" : ""}`}>
        <i />
      </span>
    </button>
  );
}
function Section({
  title,
  children,
  badge,
}: {
  title: string;
  children: ReactNode;
  badge?: string;
}) {
  return (
    <section className="control-section">
      <div className="section-heading">
        <h3>{title}</h3>
        {badge && <span className="micro-badge">{badge}</span>}
      </div>
      {children}
    </section>
  );
}

export default function App() {
  const [settings, setSettings] = useState<Settings>(() =>
    loadSettings(initialSettings),
  );
  const [fonts, setFonts] = useState<FontAsset[]>([]);
  const [tab, setTab] = useState<Tab>("playground");
  const [sample, setSample] = useState<keyof typeof samples>("mixed");
  const [text, setText] = useState<string>(samples.mixed);
  const [css, setCss] = useState("");
  const [busy, setBusy] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [dragging, setDragging] = useState(false);
  const [glyphFilter, setGlyphFilter] = useState("thai");
  const [query, setQuery] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [showTune, setShowTune] = useState(false);
  const libraryMenu = useRef<HTMLDetailsElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const settingsInput = useRef<HTMLInputElement>(null);
  const urls = useRef<string[]>([]);
  const selected = fonts.find((f) => f.id === settings.font.id);
  const face = settings.font;
  const validFamily = /^[A-Za-z][A-Za-z0-9 _-]{0,63}$/.test(settings.family);

  useEffect(() => {
    const closeLibrary = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !libraryMenu.current?.contains(event.target) &&
        libraryMenu.current
      )
        libraryMenu.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (libraryMenu.current) libraryMenu.current.open = false;
      setShowTune(false);
    };
    document.addEventListener("pointerdown", closeLibrary);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", closeLibrary);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  useEffect(() => {
    if (!showTune) return;
    const viewport = window.matchMedia("(max-width: 800px)");
    if (!viewport.matches) {
      setShowTune(false);
      return;
    }
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const panel = document.getElementById("fine-tune");
    const closeButton = panel?.querySelector<HTMLButtonElement>(".tune-close");
    closeButton?.focus();
    document.body.style.overflow = "hidden";
    const resize = () => {
      if (!viewport.matches) setShowTune(false);
    };
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusable = panel?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input, select, [tabindex="0"]',
      );
      if (!focusable?.length) return;
      const first = focusable[0],
        last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    viewport.addEventListener("change", resize);
    document.addEventListener("keydown", trapFocus);
    return () => {
      document.body.style.overflow = previousOverflow;
      viewport.removeEventListener("change", resize);
      document.removeEventListener("keydown", trapFocus);
      previous?.focus();
    };
  }, [showTune]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const saved = await getFonts();
        const demos = await Promise.all(
          [
            ["demo-thai", "NotoSansThai.ttf"],
            ["demo-latin", "Inter.ttf"],
          ].map(async ([id, name]) => {
            const r = await fetch(`/fonts/${name}`);
            if (!r.ok) throw new Error("โหลดฟอนต์ตัวอย่างไม่สำเร็จ");
            const file = new File([await r.blob()], name);
            return { id, file, info: await inspect(file) };
          }),
        );
        if (cancelled) return;
        const assets = [...demos, ...saved].map((f) => {
          const url = URL.createObjectURL(f.file);
          urls.current.push(url);
          return { ...f, url };
        });
        setFonts(assets);
        setSettings((prev) => ({
          ...prev,
          font: assets.some((f) => f.id === prev.font.id)
            ? prev.font
            : initialSettings.font,
        }));
      } catch (e) {
        if (!cancelled)
          setError(
            `${message(e)} — กรุณารัน npm run dev เพื่อเปิดทั้งเว็บและบริการฟอนต์`,
          );
      } finally {
        if (!cancelled) setBusy(false);
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(
    () => () => {
      urls.current.forEach((u) => URL.revokeObjectURL(u));
    },
    [],
  );
  useEffect(() => {
    try {
      localStorage.setItem("font-tweeks-settings", JSON.stringify(settings));
    } catch {
      setToast("บันทึกการตั้งค่าไม่ได้: พื้นที่จัดเก็บเบราว์เซอร์เต็ม");
    }
  }, [settings]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!showHelp) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const buttons = dialog?.querySelectorAll<HTMLButtonElement>("button");
    buttons?.[0]?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowHelp(false);
      if (event.key === "Tab" && buttons?.length) {
        const first = buttons[0],
          last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      previous?.focus();
    };
  }, [showHelp]);

  const activeFonts = useMemo(() => (selected ? [selected] : []), [selected]);
  const config = useMemo(
    () => ({
      family: settings.family,
      subset: settings.subset,
      font_size: settings.font_size,
      line_height: settings.line_height,
      letter_spacing: settings.letter_spacing,
      weight: settings.weight,
      kerning: settings.kerning,
      ligatures: settings.ligatures,
      faces: selected
        ? [
            {
              ...settings.font,
              script: "custom",
              file_index: 0,
              weight_min: selected.info.weight_min,
              weight_max: selected.info.weight_max,
              style: selected.info.italic ? "italic" : "normal",
            },
          ]
        : [],
    }),
    [settings, selected],
  );
  useEffect(() => {
    if (!config.faces.length || !validFamily) return;
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch("/api/stylesheet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
          signal: controller.signal,
        });
        if (!r.ok) throw await responseError(r);
        setCss((await r.json()).css);
      } catch (e) {
        if (!controller.signal.aborted) setError(message(e));
      }
    }, 100);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [config, validFamily]);

  const previewCss = useMemo(
    () =>
      css
        .replaceAll(`"${settings.family}"`, '"TweeksPreview"')
        .replaceAll(".font-project", ".live-type")
        .replaceAll("./fonts/custom.woff2", selected?.url ?? ""),
    [css, settings.family, selected],
  );
  const rawCss = selected
    ? `@font-face{font-family:TweeksOriginal;src:url("${selected.url}");font-weight:${selected.info.weight_min} ${selected.info.weight_max};font-style:${selected.info.italic ? "italic" : "normal"};}`
    : "";
  const missing = useMemo(
    () => [
      ...new Set(
        Array.from(text).filter(
          (c) =>
            !/\s/.test(c) &&
            !selected?.info.codepoints.includes(c.codePointAt(0)!),
        ),
      ),
    ],
    [text, selected],
  );
  const glyphs = useMemo(
    () =>
      selected?.info.codepoints
        .filter((n) =>
          glyphFilter === "thai"
            ? n >= 0xe00 && n <= 0xe7f
            : glyphFilter === "latin"
              ? n >= 32 && n <= 0x24f
              : true,
        )
        .filter(
          (n) =>
            !query ||
            String.fromCodePoint(n).includes(query) ||
            n.toString(16).includes(query.toLowerCase().replace("u+", "")),
        ) ?? [],
    [selected, glyphFilter, query],
  );
  const patch = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings((p) => ({ ...p, [key]: value }));
  const patchFace = (key: string, value: number | boolean) =>
    setSettings((p) => ({ ...p, font: { ...p.font, [key]: value } }));
  const assign = (id: string) => {
    const f = fonts.find((a) => a.id === id);
    if (!f) return;
    setSettings((p) => ({
      ...p,
      font: {
        id,
        scale: 100,
        ascent: f.info.ascent,
        descent: f.info.descent,
        line_gap: Math.max(0, f.info.line_gap),
        override_metrics: false,
      },
    }));
  };
  async function upload(list: FileList | File[]) {
    setBusy(true);
    setError("");
    try {
      for (const file of Array.from(list)) {
        if (!/\.(ttf|otf|woff2?)$/i.test(file.name))
          throw new Error("รองรับไฟล์ .ttf, .otf, .woff และ .woff2 เท่านั้น");
        if (file.size > 20 * 1024 * 1024)
          throw new Error("ไฟล์ฟอนต์ต้องมีขนาดไม่เกิน 20 MB");
        const info = await inspect(file);
        const id = crypto.randomUUID();
        const url = URL.createObjectURL(file);
        urls.current.push(url);
        await storeFont({ id, file, info });
        setFonts((p) => [...p, { id, file, info, url }]);
        setSettings((p) => ({
          ...p,
          font: {
            id,
            scale: 100,
            ascent: info.ascent,
            descent: info.descent,
            line_gap: Math.max(0, info.line_gap),
            override_metrics: false,
          },
        }));
        setToast(`เพิ่ม ${info.name} แล้ว`);
      }
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  async function remove(f: FontAsset) {
    try {
      await deleteFont(f.id);
      setFonts((p) => p.filter((a) => a.id !== f.id));
      setSettings((p) => ({
        ...p,
        font: p.font.id === f.id ? initialSettings.font : p.font,
      }));
      setToast("ลบฟอนต์ออกจากไลบรารีแล้ว");
    } catch (e) {
      setError(message(e));
    }
  }
  async function exportZip() {
    if (!validFamily || !selected) return;
    setExporting(true);
    setError("");
    try {
      const body = new FormData();
      body.append("config", JSON.stringify(config));
      activeFonts.forEach((f) => body.append("files", f.file));
      const r = await fetch("/api/export", { method: "POST", body });
      if (!r.ok) throw await responseError(r);
      download(
        await r.blob(),
        `${settings.family.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.zip`,
      );
      setToast("ส่งออกชุดฟอนต์สำเร็จ");
    } catch (e) {
      setError(message(e));
    } finally {
      setExporting(false);
    }
  }
  async function copyCss() {
    try {
      await navigator.clipboard.writeText(css);
      setToast("คัดลอก CSS แล้ว");
    } catch {
      download(new Blob([css], { type: "text/css" }), "fonts.css");
    }
  }
  async function importSettings(file: File) {
    try {
      const input = JSON.parse(await file.text());
      const r = await fetch("/api/stylesheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!r.ok) throw new Error("ไฟล์การตั้งค่าไม่ถูกต้อง");
      const normalized = (await r.json()).config;
      const next = {
        ...initialSettings,
        ...Object.fromEntries(
          Object.keys(initialSettings)
            .filter((k) => k !== "font" && k in normalized)
            .map((k) => [k, normalized[k]]),
        ),
      };
      next.font = {
        ...settings.font,
        ...normalized.faces[0],
        id: settings.font.id,
      };
      setSettings(next);
      setToast("นำเข้าการตั้งค่าแล้ว โดยใช้ฟอนต์ที่เลือกอยู่");
    } catch (e) {
      setError(message(e));
    } finally {
      if (settingsInput.current) settingsInput.current.value = "";
    }
  }

  return (
    <div className="app-shell">
      <style>
        {previewCss}
        {rawCss}
        {selected
          ? `@font-face{font-family:TweeksInspector;src:url("${selected.url}");font-weight:${selected.info.weight_min} ${selected.info.weight_max};}`
          : ""}
      </style>
      <input
        ref={fileInput}
        type="file"
        multiple
        accept=".ttf,.otf,.woff,.woff2"
        className="sr-only"
        aria-label="นำเข้าไฟล์ฟอนต์"
        onChange={(e) => e.target.files && upload(e.target.files)}
      />
      <input
        ref={settingsInput}
        type="file"
        accept=".json"
        className="sr-only"
        aria-label="นำเข้าการตั้งค่า"
        onChange={(e) =>
          e.target.files?.[0] && importSettings(e.target.files[0])
        }
      />
      <header className="topbar">
        <a className="brand" href="/" aria-label="Font Tweeks home">
          <img src="/favicon.svg" alt="" />
          <span>
            font<span className="brand-light">tweeks</span>
            <sup>β</sup>
          </span>
        </a>
        <nav className="top-nav" aria-label="เครื่องมือ">
          <button
            className={tab === "playground" ? "active" : ""}
            onClick={() => {
              setTab("playground");
              setShowTune(false);
              if (libraryMenu.current) libraryMenu.current.open = false;
            }}
          >
            <SlidersHorizontal size={18} />
            Playground<span>01</span>
          </button>
          <button
            className={tab === "glyphs" ? "active" : ""}
            onClick={() => {
              setTab("glyphs");
              setShowTune(false);
              if (libraryMenu.current) libraryMenu.current.open = false;
            }}
          >
            <Grid2X2 size={18} />
            Font inspector<span>02</span>
          </button>
          <button
            className={tab === "export" ? "active" : ""}
            onClick={() => {
              setTab("export");
              setShowTune(false);
              if (libraryMenu.current) libraryMenu.current.open = false;
            }}
          >
            <Code2 size={18} />
            Export & use<span>03</span>
          </button>
        </nav>
        <div className="top-actions">
          <button
            className="button small tune-toggle"
            aria-label="เปิดหรือปิด Fine-tune"
            aria-controls="fine-tune"
            aria-expanded={showTune}
            onClick={() => setShowTune(!showTune)}
          >
            <SlidersHorizontal size={17} />
            <span>Fine-tune</span>
          </button>
          <details className="font-library-menu" ref={libraryMenu}>
            <summary className="button small" aria-label="Font library">
              <Layers size={16} />
              <span>Font library</span>
              <ChevronDown size={13} />
            </summary>
            <div className="font-library-popover">
              {" "}
              <div className="workspace-label">
                YOUR WORKSPACE <span>LOCAL</span>
              </div>
              <div className="project-card">
                <span className="project-icon">
                  <FolderOpen size={18} />
                </span>
                <div>
                  <strong>My font project</strong>
                  <small>Thai & English typography</small>
                </div>
                <span className="status-dot" />
              </div>
              <div className="library-heading">
                <span>FONT LIBRARY</span>
                <span>{fonts.length.toString().padStart(2, "0")}</span>
              </div>
              <div className="font-list">
                {fonts.map((f) => (
                  <div
                    key={f.id}
                    className={`font-item ${selected?.id === f.id ? "selected" : ""}`}
                  >
                    <button
                      className="font-select"
                      onClick={() => assign(f.id)}
                    >
                      <span
                        className={`font-monogram ${f.info.thai_coverage >= 50 ? "thai" : ""}`}
                      >
                        {f.info.thai_coverage >= 50 ? "ก" : "Aa"}
                      </span>
                      <span>
                        <strong>{f.info.name}</strong>
                        <small>
                          {f.info.axes.length ? "Variable" : f.info.style}{" "}
                          <i>·</i> {sizeLabel(f.info.size)}
                        </small>
                      </span>
                    </button>
                    {!f.id.startsWith("demo-") ? (
                      <button
                        className="icon-button remove-font"
                        title={`ลบ ${f.info.name}`}
                        onClick={() => remove(f)}
                      >
                        <Trash2 size={13} />
                      </button>
                    ) : (
                      <span className="demo-dot" title="ฟอนต์ตัวอย่าง" />
                    )}
                  </div>
                ))}
              </div>
              <button
                className={`upload-zone ${dragging ? "dragging" : ""}`}
                disabled={busy}
                onClick={() => fileInput.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  if (!busy) upload(e.dataTransfer.files);
                }}
              >
                <span className="upload-icon">
                  {busy ? (
                    <LoaderCircle className="spin" size={19} />
                  ) : (
                    <Plus size={21} />
                  )}
                </span>
                <strong>{busy ? "กำลังอ่านฟอนต์…" : "เพิ่มฟอนต์ของคุณ"}</strong>
                <span>ลากไฟล์มาวาง หรือคลิกเพื่อเลือก</span>
                <small>TTF, OTF, WOFF, WOFF2 · สูงสุด 20 MB</small>
              </button>
              <div className="library-footer">
                <div className="local-note">
                  <span className="local-symbol">
                    <Layers size={17} />
                  </span>
                  <p>
                    Made for your type.<small>ไฟล์ของคุณอยู่บนเครื่องนี้</small>
                  </p>
                  <span className="status-dot" />
                </div>
                <button onClick={() => setShowHelp(true)}>
                  <BookOpen size={15} /> คู่มือการใช้งาน{" "}
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </details>
          <span className="autosave">
            <CheckCircle2 size={14} />
            บันทึกบนเครื่องอัตโนมัติ
          </span>
          <button
            className="button small"
            onClick={() => {
              download(
                new Blob([JSON.stringify(config, null, 2)], {
                  type: "application/json",
                }),
                "font-tweeks.json",
              );
            }}
            disabled={!css}
          >
            <Download size={14} />
            Save preset
          </button>
          <button
            className="button primary small"
            aria-label="Export fonts"
            onClick={exportZip}
            disabled={exporting || !selected || !validFamily}
          >
            {exporting ? (
              <LoaderCircle size={14} className="spin" />
            ) : (
              <ArrowDownToLine size={15} />
            )}
            <span className="export-label">Export fonts</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </header>
      {showTune && (
        <button
          className="tune-backdrop"
          aria-label="ปิด Fine-tune"
          onClick={() => setShowTune(false)}
        />
      )}
      <aside
        id="fine-tune"
        className={`controls-panel ${showTune ? "is-open" : ""}`}
        aria-label="Fine-tune"
        role={showTune ? "dialog" : undefined}
        aria-modal={showTune || undefined}
      >
        <div className="controls-header">
          <div>
            <SlidersHorizontal size={17} />
            <strong>Fine-tune</strong>
          </div>
          <button
            className="icon-button"
            title="รีเซ็ตค่าปรับแต่ง"
            onClick={() => {
              setSettings((p) => ({
                ...initialSettings,
                font: { ...p.font, scale: 100, override_metrics: false },
              }));
              setToast("รีเซ็ตค่าปรับแต่งแล้ว");
            }}
          >
            <RotateCcw size={15} />
          </button>
          <button
            className="icon-button tune-close"
            aria-label="ปิด Fine-tune"
            onClick={() => setShowTune(false)}
          >
            <X size={18} />
          </button>
        </div>
        <div className="control-caption">ONE FONT · ALL LANGUAGES</div>
        <div
          className="controls-content"
          tabIndex={0}
          role="region"
          aria-label="ตัวเลือกปรับแต่งฟอนต์"
        >
          <Section title="Font source">
            <label className="select-label">
              Custom Font
              <span className="select-wrap">
                <select
                  value={face.id}
                  onChange={(e) => assign(e.target.value)}
                >
                  {fonts.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.info.name} — {f.info.style}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} />
              </span>
            </label>
            {selected && (
              <p className="font-support">
                <CheckCircle2 size={12} />
                ไทย {selected.info.thai_coverage}% · Basic Latin{" "}
                {selected.info.latin_count}/95
              </p>
            )}
          </Section>
          <Section title="Typography" badge="BASE">
            <Range
              label="Base font size"
              value={settings.font_size}
              min={12}
              max={96}
              unit="px"
              onChange={(v) => patch("font_size", v)}
            />
            <Range
              label="Export weight"
              value={settings.weight}
              min={100}
              max={900}
              step={100}
              onChange={(v) => patch("weight", v)}
            />
            <Range
              label="Line height"
              value={settings.line_height}
              min={1}
              max={2.5}
              step={0.05}
              onChange={(v) => patch("line_height", v)}
            />
            <Range
              label="Letter spacing"
              value={settings.letter_spacing}
              min={-2}
              max={5}
              step={0.1}
              unit="px"
              onChange={(v) => patch("letter_spacing", v)}
            />
          </Section>
          <Section title="Font metrics" badge="CUSTOM">
            <Range
              label="Size adjust"
              value={face.scale}
              min={50}
              max={200}
              step={0.5}
              unit="%"
              onChange={(v) => patchFace("scale", v)}
            />
            <p className="helper">
              ปรับสัดส่วน Custom Font โดย Default ยังคงขนาดและ metrics ต้นฉบับ
            </p>
            <Toggle
              label="Override font metrics"
              value={face.override_metrics}
              onChange={() =>
                patchFace("override_metrics", !face.override_metrics)
              }
            />
            {face.override_metrics && (
              <div className="metrics-fields">
                <Range
                  label="Ascent"
                  value={face.ascent}
                  min={0}
                  max={300}
                  step={0.5}
                  unit="%"
                  onChange={(v) => patchFace("ascent", v)}
                />
                <Range
                  label="Descent"
                  value={face.descent}
                  min={0}
                  max={150}
                  step={0.5}
                  unit="%"
                  onChange={(v) => patchFace("descent", v)}
                />
                <Range
                  label="Line gap"
                  value={face.line_gap}
                  min={0}
                  max={100}
                  step={0.5}
                  unit="%"
                  onChange={(v) => patchFace("line_gap", v)}
                />
                <p className="helper">
                  ใช้ตัวอย่าง “สระ & วรรณยุกต์” ตรวจการซ้อนทับเมื่อปรับ metrics
                </p>
              </div>
            )}
          </Section>
          <Section title="OpenType">
            <Toggle
              label="Kerning"
              description="ระยะห่างระหว่างคู่ตัวอักษร"
              value={settings.kerning}
              onChange={() => patch("kerning", !settings.kerning)}
            />
            <Toggle
              label="Standard ligatures"
              description="เชื่อมตัวอักษร เช่น fi, fl"
              value={settings.ligatures}
              onChange={() => patch("ligatures", !settings.ligatures)}
            />
          </Section>
          <div className="tip-card">
            <Sparkles size={17} />
            <div>
              <strong>Little type tip</strong>
              <p>
                ภาษาไทยมีสระและวรรณยุกต์หลายชั้น ลองเริ่มจาก line height 1.5–1.8
                แล้วทดสอบกับข้อความจริง
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div className="main-shell">
        <main>
          {error && (
            <div className="error-banner" role="alert">
              <Info size={17} />
              <span>{error}</span>
              <button
                aria-label="ปิดข้อความผิดพลาด"
                onClick={() => setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          <div className="page-intro">
            <div>
              <div className="eyebrow">
                <span /> A LITTLE TWEAK. A BETTER TYPE.
              </div>
              <h1>
                {tab === "playground" ? (
                  <>
                    หนึ่งฟอนต์ <span>เทียบให้ชัด.</span>
                  </>
                ) : tab === "glyphs" ? (
                  <>
                    รู้จักฟอนต์ <span>ทุกตัวอักษร.</span>
                  </>
                ) : (
                  <>
                    ฟอนต์พร้อมแล้ว <span>ไปสร้างกันต่อ.</span>
                  </>
                )}
              </h1>
              <p>
                {tab === "playground"
                  ? "เปรียบเทียบ Custom Font กับ Default ผ่านข้อความเดียวกัน หลายขนาด และ 4 น้ำหนัก"
                  : tab === "glyphs"
                    ? "สำรวจตัวอักษรที่รองรับ โครงสร้างฟอนต์ และ OpenType features จากไฟล์จริง"
                    : "ส่งออกชุดฟอนต์ที่เบาลง พร้อม CSS ที่นำไปใช้ในโปรเจกต์ได้ทันที"}
              </p>
            </div>
            <div className="specimen-count">
              4 weights <span>×</span> 11 sizes
            </div>
          </div>

          <div className="workbench">
            <div className="canvas-column">
              {tab === "playground" && (
                <TypeSpecimen
                  settings={settings}
                  selected={selected}
                  text={text}
                  sample={sample}
                  onTextChange={setText}
                  onSampleChange={(key) => {
                    setSample(key);
                    setText(samples[key]);
                  }}
                  missing={missing}
                />
              )}

              {tab === "glyphs" && (
                <section className="inspector-panel">
                  <div className="panel-heading">
                    <h2>Glyph explorer</h2>
                    <span className="micro-badge">
                      {selected?.info.glyph_count.toLocaleString() ?? "—"}{" "}
                      GLYPHS
                    </span>
                  </div>
                  <div className="glyph-controls">
                    <div className="segmented">
                      {[
                        ["thai", "Thai"],
                        ["latin", "Latin"],
                        ["all", "All"],
                      ].map(([key, label]) => (
                        <button
                          key={key}
                          className={glyphFilter === key ? "active" : ""}
                          onClick={() => setGlyphFilter(key)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <input
                      aria-label="ค้นหาตัวอักษรหรือ Unicode"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="ค้นหาตัวอักษร หรือ U+0E01"
                    />
                  </div>
                  <div className="coverage-row">
                    <span>
                      Thai coverage{" "}
                      <strong>{selected?.info.thai_coverage ?? 0}%</strong>
                    </span>
                    <span>
                      Basic Latin{" "}
                      <strong>{selected?.info.latin_count ?? 0}/95</strong>
                    </span>
                  </div>
                  <div className="glyph-grid">
                    {glyphs.slice(0, 500).map((n) => (
                      <button
                        key={n}
                        title={`คัดลอก U+${n.toString(16).toUpperCase()}`}
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(
                              String.fromCodePoint(n),
                            );
                            setToast(`คัดลอก ${String.fromCodePoint(n)} แล้ว`);
                          } catch {
                            setToast("เบราว์เซอร์ไม่อนุญาตให้คัดลอก");
                          }
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "TweeksInspector, sans-serif",
                            fontSize: 29,
                          }}
                        >
                          {String.fromCodePoint(n)}
                        </span>
                        <small>
                          {n.toString(16).toUpperCase().padStart(4, "0")}
                        </small>
                      </button>
                    ))}
                  </div>
                  {!glyphs.length && (
                    <div className="empty-state">
                      ไม่พบตัวอักษรในกลุ่มนี้ ลองเลือกฟอนต์หรือกลุ่มภาษาอื่น
                    </div>
                  )}
                  {glyphs.length > 500 && (
                    <p className="helper">
                      แสดง 500 จาก {glyphs.length} ตัวอักษร
                      ใช้การค้นหาเพื่อกรองเพิ่มเติม
                    </p>
                  )}
                  <div className="font-metadata">
                    <h3>Inside the font</h3>
                    <dl>
                      <div>
                        <dt>Family</dt>
                        <dd>{selected?.info.name}</dd>
                      </div>
                      <div>
                        <dt>Units per em</dt>
                        <dd>{selected?.info.units_per_em}</dd>
                      </div>
                      <div>
                        <dt>Variable axes</dt>
                        <dd>
                          {selected?.info.axes
                            .map((a) => `${a.tag} ${a.min}–${a.max}`)
                            .join(", ") || "Static font"}
                        </dd>
                      </div>
                      <div>
                        <dt>File size</dt>
                        <dd>{selected && sizeLabel(selected.info.size)}</dd>
                      </div>
                    </dl>
                    <h4>OpenType features</h4>
                    <div className="feature-tags">
                      {selected?.info.features.map((f) => (
                        <code key={f}>{f}</code>
                      ))}
                    </div>
                    {selected?.info.license && (
                      <details>
                        <summary>Font license</summary>
                        <p>{selected.info.license}</p>
                      </details>
                    )}
                  </div>
                </section>
              )}

              {tab === "export" && (
                <section className="export-panel">
                  <div className="panel-heading">
                    <h2>Ready for your project</h2>
                    <span className="micro-badge orange">WOFF2 + CSS</span>
                  </div>
                  <p>ชุดฟอนต์พร้อมใช้ สำหรับเว็บที่พูดได้ทั้งสองภาษา</p>
                  <label className="text-field">
                    Font family name
                    <input
                      value={settings.family}
                      maxLength={64}
                      onChange={(e) => patch("family", e.target.value)}
                    />
                  </label>
                  {!validFamily && (
                    <p className="warning-text helper">
                      ใช้ชื่อภาษาอังกฤษขึ้นต้นด้วย A–Z ตามด้วยตัวอักษร ตัวเลข
                      ช่องว่าง - หรือ _
                    </p>
                  )}
                  <div className="export-files">
                    <div>
                      <FileType2 size={20} />
                      <span>
                        fonts/<small>custom.woff2</small>
                      </span>
                      <span>1 font file</span>
                    </div>
                    <div>
                      <Code2 size={20} />
                      <span>
                        fonts.css<small>@font-face + typography styles</small>
                      </span>
                      <Check size={16} />
                    </div>
                    <div>
                      <SlidersHorizontal size={20} />
                      <span>
                        font-tweeks.json
                        <small>การตั้งค่าที่นำกลับมาใช้ได้</small>
                      </span>
                      <Check size={16} />
                    </div>
                  </div>
                  <Toggle
                    label="Subset ไทย + Latin"
                    description="เก็บตัวอักษรตามภาษา พร้อม OpenType shaping และวรรณยุกต์"
                    value={settings.subset}
                    onChange={() => patch("subset", !settings.subset)}
                  />
                  <p className="helper">
                    {settings.subset
                      ? "เก็บ Thai U+0E00–0E7F, Latin U+0020–024F และเครื่องหมายทั่วไป ปิด subset หากต้องใช้ภาษาอื่นหรือสัญลักษณ์เพิ่มเติม"
                      : "เก็บตัวอักษรทั้งหมดจากไฟล์ต้นฉบับ และแปลงเป็น WOFF2"}
                  </p>
                  <button
                    className="button primary full"
                    disabled={exporting || !validFamily || !selected}
                    onClick={exportZip}
                  >
                    {exporting ? (
                      <LoaderCircle className="spin" size={17} />
                    ) : (
                      <Download size={17} />
                    )}
                    {exporting ? "กำลังเตรียมไฟล์…" : "Download font package"}
                    <ArrowRight size={17} />
                  </button>
                  <div className="code-heading">
                    <span>GENERATED CSS</span>
                    <button onClick={copyCss} disabled={!css}>
                      <Copy size={13} />
                      Copy
                    </button>
                  </div>
                  <pre className="css-preview">
                    <code>{css || "กำลังสร้าง CSS…"}</code>
                  </pre>
                  <div className="usage-note">
                    <Info size={18} />
                    <p>
                      วาง <code>fonts.css</code> และโฟลเดอร์ <code>fonts/</code>{" "}
                      ไว้ด้วยกัน แล้วเพิ่ม stylesheet และ class{" "}
                      <code>font-project</code> ในหน้าเว็บของคุณ
                    </p>
                  </div>
                  <div className="preset-actions">
                    <button
                      className="button"
                      onClick={() => settingsInput.current?.click()}
                    >
                      <Upload size={15} />
                      Import preset
                    </button>
                    <button
                      className="button"
                      onClick={() =>
                        download(
                          new Blob([css], { type: "text/css" }),
                          "fonts.css",
                        )
                      }
                      disabled={!css}
                    >
                      <Download size={15} />
                      CSS only
                    </button>
                  </div>
                </section>
              )}
              <footer className="canvas-footer">
                <span>
                  <span className="status-dot" />
                  LOCAL-FIRST WORKSPACE
                </span>
                <span>Thoughtful type, in every language.</span>
              </footer>
            </div>
          </div>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={17} />
          {toast}
        </div>
      )}
      {showHelp && (
        <div className="modal-backdrop" onClick={() => setShowHelp(false)}>
          <section
            className="help-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="icon-button modal-close"
              aria-label="ปิดคู่มือ"
              onClick={() => setShowHelp(false)}
              autoFocus
            >
              <X size={20} />
            </button>
            <div className="eyebrow">A QUICK START</div>
            <h2 id="help-title">จากไฟล์ฟอนต์ สู่โปรเจกต์ของคุณ</h2>
            <ol>
              <li>
                <strong>เพิ่มฟอนต์</strong>
                <p>
                  เปิด Font library บนแถบด้านบน แล้วลากไฟล์ฟอนต์มาวาง รองรับ
                  TTF, OTF, WOFF และ WOFF2
                </p>
              </li>
              <li>
                <strong>เลือก Custom Font</strong>
                <p>
                  เลือกไฟล์เดียวใน Font source เพื่อใช้กับทุกภาษา และเทียบกับ
                  Default ในกริดข้อความ
                </p>
              </li>
              <li>
                <strong>ปรับและทดลอง</strong>
                <p>
                  ปรับขนาด น้ำหนัก ระยะบรรทัด และ Size adjust
                  แล้วลองพิมพ์ข้อความจริง ทั้ง Custom และ Default
                  จะใช้ข้อความเดียวกัน
                </p>
              </li>
              <li>
                <strong>Export & use</strong>
                <p>
                  ดาวน์โหลด ZIP ที่มี WOFF2, CSS และ preset วาง fonts.css
                  กับโฟลเดอร์ fonts/ ไว้ด้วยกัน แล้วใช้ class font-project
                </p>
              </li>
            </ol>
            <p className="helper">
              ฟอนต์ที่เพิ่มบันทึกใน IndexedDB ของเบราว์เซอร์
              การวิเคราะห์และแปลงไฟล์ทำผ่าน Python บนเครื่องนี้
              ไม่มีการอัปโหลดไปบริการภายนอก การปรับ metrics ทำผ่าน CSS
              โดยคงเส้นตัวอักษรเดิม
            </p>
            <button
              className="button primary full"
              onClick={() => setShowHelp(false)}
            >
              เริ่มปรับฟอนต์ <ArrowRight size={16} />
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
