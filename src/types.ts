export interface FontInfo {
  name: string;
  style: string;
  filename: string;
  size: number;
  glyph_count: number;
  units_per_em: number;
  axes: { tag: string; min: number; max: number; default: number }[];
  features: string[];
  weight_min: number;
  weight_max: number;
  italic: boolean;
  ascent: number;
  descent: number;
  line_gap: number;
  thai_count: number;
  thai_coverage: number;
  latin_count: number;
  codepoints: number[];
  license: string;
  license_url: string;
  embedding_restricted: boolean;
}
export interface FontAsset {
  id: string;
  file: File;
  info: FontInfo;
  url: string;
}
export interface FaceSettings {
  id: string;
  scale: number;
  ascent: number;
  descent: number;
  line_gap: number;
  override_metrics: boolean;
}
export interface Settings {
  family: string;
  font: FaceSettings;
  subset: boolean;
  font_size: number;
  line_height: number;
  letter_spacing: number;
  weight: number;
  kerning: boolean;
  ligatures: boolean;
}
export const initialSettings: Settings = {
  family: "My Project Font",
  font: {
    id: "demo-thai",
    scale: 100,
    ascent: 106.1,
    descent: 45,
    line_gap: 0,
    override_metrics: false,
  },
  subset: true,
  font_size: 16,
  line_height: 1.65,
  letter_spacing: 0,
  weight: 400,
  kerning: true,
  ligatures: true,
};
