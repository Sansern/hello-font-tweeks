import type { FontInfo, Settings } from "./types";
interface StoredFont {
  id: string;
  file: File;
  info: FontInfo;
}
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("font-tweeks", 1);
    r.onupgradeneeded = () =>
      r.result.createObjectStore("fonts", { keyPath: "id" });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function transaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("fonts", mode);
    const r = action(tx.objectStore("fonts"));
    tx.oncomplete = () => {
      db.close();
      resolve(r.result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
export const getFonts = () =>
  transaction("readonly", (s) => s.getAll()) as Promise<StoredFont[]>;
export const storeFont = (font: StoredFont) =>
  transaction("readwrite", (s) => s.put(font));
export const deleteFont = (id: string) =>
  transaction("readwrite", (s) => s.delete(id));
export function loadSettings(fallback: Settings): Settings {
  try {
    const raw = JSON.parse(
      localStorage.getItem("font-tweeks-settings") || "null",
    );
    if (!raw || typeof raw.family !== "string") return fallback;
    // Migrate the previous two-language workspace to one selected font.
    const font = raw.font ?? raw.thai ?? raw.latin;
    if (!font) return fallback;
    const values = [
      "font_size",
      "line_height",
      "letter_spacing",
      "weight",
    ] as const;
    if (values.some((k) => !Number.isFinite(raw[k]))) return fallback;
    if (
      raw.font_size < 12 ||
      raw.font_size > 96 ||
      raw.line_height < 1 ||
      raw.line_height > 2.5 ||
      raw.letter_spacing < -2 ||
      raw.letter_spacing > 5 ||
      raw.weight < 100 ||
      raw.weight > 900
    )
      return fallback;
    if (
      ["subset", "kerning", "ligatures"].some(
        (k) => typeof raw[k] !== "boolean",
      )
    )
      return fallback;
    if (
      typeof font.id !== "string" ||
      ["scale", "ascent", "descent", "line_gap"].some(
        (v) => !Number.isFinite(font[v]),
      ) ||
      font.scale < 50 ||
      font.scale > 200 ||
      font.ascent < 0 ||
      font.ascent > 300 ||
      font.descent < 0 ||
      font.descent > 150 ||
      font.line_gap < 0 ||
      font.line_gap > 100 ||
      typeof font.override_metrics !== "boolean"
    )
      return fallback;
    return {
      family: raw.family,
      font,
      font_size: raw.font ? raw.font_size : fallback.font_size,
      line_height: raw.line_height,
      letter_spacing: raw.letter_spacing,
      weight: raw.weight,
      subset: raw.subset,
      kerning: raw.kerning,
      ligatures: raw.ligatures,
    };
  } catch {
    return fallback;
  }
}
