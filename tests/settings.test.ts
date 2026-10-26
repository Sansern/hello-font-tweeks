import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSettings } from "../src/storage.ts";
import { initialSettings } from "../src/types.ts";

function load(raw: unknown) {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: () => JSON.stringify(raw) },
  });
  return loadSettings(initialSettings);
}

test("migrates a paired workspace to one font without losing its file ID or metrics", () => {
  const { font, ...settings } = initialSettings;
  const migrated = load({
    ...settings,
    font_size: 32,
    thai: { ...font, id: "my-upload", scale: 112 },
    latin: { ...font, id: "other-upload" },
  });
  assert.equal(migrated.font.id, "my-upload");
  assert.equal(migrated.font.scale, 112);
  assert.equal(migrated.font_size, 16);
  assert.equal("thai" in migrated, false);
  assert.equal("latin" in migrated, false);
});

test("preserves single-font settings after reload", () => {
  const saved = {
    ...initialSettings,
    font_size: 20,
    font: {
      ...initialSettings.font,
      id: "custom-upload",
      override_metrics: true,
    },
  };
  assert.deepEqual(load(saved), saved);
});

test("invalid stored metrics fall back to usable defaults", () => {
  const saved = {
    ...initialSettings,
    font: { ...initialSettings.font, scale: 0 },
  };
  assert.deepEqual(load(saved), initialSettings);
});
