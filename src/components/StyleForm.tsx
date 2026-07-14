// StyleForm.tsx
import { useMemo, useState } from "react";
import ClickOutside from "./ClickOutside";

interface SelectedColor {
  colorName: string;
  hexValue: string;
}

interface StyleFormProps {
  selectedColors: SelectedColor[];
  onConfirm: (colors: SelectedColor[]) => void;
  onCancel: () => void;
}

interface Swatch {
  key: string;
  hex: string;
}

interface ColorGroup {
  sourceIndex: number;
  source: SelectedColor;
  swatches: Swatch[];
}

interface StyleDefinition {
  id: string;
  label: string;
  description: string;
  generate: (h: number, s: number, l: number) => string[];
}

// ---------------------------------------------------------------
// Color conversion helpers (self-contained — no external color utils needed)
// ---------------------------------------------------------------

const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));
const wrapHue = (h: number) => ((h % 360) + 360) % 360;

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean.split("").map((c) => c + c).join("")
      : clean.padEnd(6, "0");
  const bigint = parseInt(full, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

function rgbToHex(r: number, g: number, b: number) {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
      .join("")
  );
}

function hexToHsl(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s * 100, l * 100] as const;
}

function hslToHex(h: number, s: number, l: number) {
  h = wrapHue(h);
  s = clamp(s) / 100;
  l = clamp(l) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

// Blend a hue toward a target hue by a % amount (shortest angular path)
function blendHue(h: number, target: number, amount: number) {
  let diff = wrapHue(target - h);
  if (diff > 180) diff -= 360;
  return wrapHue(h + diff * amount);
}

// ---------------------------------------------------------------
// Style definitions
// Each style takes a base H/S/L and returns a handful of hex swatches
// that reinterpret that color in the given aesthetic.
// ---------------------------------------------------------------

const STYLES: StyleDefinition[] = [
  {
    id: "pastel",
    label: "Pastel",
    description: "Soft, washed-out tones — lower saturation, pushed toward high lightness.",
    generate: (h, s, l) => {
      const hues = [h - 20, h, h + 20, h + 40];
      return hues.map((hh) => hslToHex(hh, clamp(s * 0.5, 20, 55), clamp(Math.max(l, 78), 70, 92)));
    },
  },
  {
    id: "steampunk",
    label: "Steampunk",
    description: "Brass, copper, and rust — hue pulled toward amber, darker and slightly desaturated.",
    generate: (h, s, l) => {
      const amber = 34;
      const base = blendHue(h, amber, 0.6);
      return [
        hslToHex(base, clamp(s * 0.7, 30, 70), clamp(l * 0.5, 15, 35)),
        hslToHex(base, clamp(s * 0.6, 25, 60), clamp(l * 0.7, 25, 45)),
        hslToHex(base + 8, clamp(s * 0.65, 30, 65), clamp(l * 0.85, 35, 55)),
        hslToHex(base - 6, clamp(s * 0.5, 20, 50), clamp(l * 0.4, 12, 28)),
      ];
    },
  },
  {
    id: "neon",
    label: "Neon",
    description: "Vivid, glowing tones — saturation maxed out, lightness tuned for punch.",
    generate: (h,  l) => {
      const hues = [h, h + 30, h - 30, h + 150];
      return hues.map((hh, i) => hslToHex(hh, 95, i === 0 ? clamp(l, 50, 62) : 55));
    },
  },
  {
    id: "retro",
    label: "Retro",
    description: "70s-inspired warm mid-tones — mustard, teal, and burnt orange energy.",
    generate: (h, s, l) => {
      const warm = 35;
      const hues = [blendHue(h, warm, 0.4), h + 150, h - 15, h + 45];
      return hues.map((hh) => hslToHex(hh, clamp(s * 0.75, 40, 65), clamp(l * 0.9, 40, 60)));
    },
  },
  {
    id: "vintage",
    label: "Vintage",
    description: "Faded, sepia-tinted tones — desaturated and slightly darkened, like old film.",
    generate: (h, s, l) => {
      const sepia = 40;
      const hues = [blendHue(h, sepia, 0.5), blendHue(h, sepia, 0.3), h];
      return hues.map((hh, i) =>
        hslToHex(hh, clamp(s * 0.35, 15, 35), clamp(l * (i === 2 ? 0.6 : 0.75), 25, 55))
      );
    },
  },
  {
    id: "cyberpunk",
    label: "Cyberpunk",
    description: "High-contrast electric tones — magenta/cyan bias against near-black.",
    generate: (h, s) => {
      const magenta = 320;
      const cyan = 185;
      return [
        hslToHex(blendHue(h, magenta, 0.7), 90, 55),
        hslToHex(blendHue(h, cyan, 0.7), 90, 50),
        hslToHex(h, clamp(s, 60, 90), 15),
        hslToHex(h, 85, 60),
      ];
    },
  },
  {
    id: "earthy",
    label: "Earthy",
    description: "Natural, grounded tones — olive, clay, and moss with muted saturation.",
    generate: (h, s, l) => {
      const olive = 70;
      const clay = 25;
      return [
        hslToHex(blendHue(h, olive, 0.5), clamp(s * 0.6, 25, 50), clamp(l * 0.8, 30, 50)),
        hslToHex(blendHue(h, clay, 0.5), clamp(s * 0.65, 30, 55), clamp(l * 0.75, 35, 55)),
        hslToHex(h, clamp(s * 0.4, 15, 35), clamp(l * 0.6, 20, 40)),
        hslToHex(blendHue(h, olive, 0.3), clamp(s * 0.5, 20, 45), clamp(l * 0.95, 50, 70)),
      ];
    },
  },
];

// ---------------------------------------------------------------
// StyleForm
// ---------------------------------------------------------------
const StyleForm = ({ selectedColors, onConfirm, onCancel }: StyleFormProps) => {
  const [styleId, setStyleId] = useState<string>(STYLES[0].id);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const activeStyle = useMemo(() => STYLES.find((st) => st.id === styleId) ?? STYLES[0], [styleId]);

  // One swatch group per selected base color, all generated under the same active style.
  const groups: ColorGroup[] = useMemo(() => {
    return selectedColors.map((source, sourceIndex) => {
      const [h, s, l] = hexToHsl(source.hexValue);
      const hexes = activeStyle.generate(h, s, l);
      const swatches = hexes.map((hex, i) => ({
        key: `${sourceIndex}-${activeStyle.id}-${i}`,
        hex,
      }));
      return { sourceIndex, source, swatches };
    });
  }, [selectedColors, activeStyle]);

  const swatchByKey = useMemo(() => {
    const map = new Map<string, { hex: string; sourceIndex: number }>();
    groups.forEach((g) => g.swatches.forEach((sw) => map.set(sw.key, { hex: sw.hex, sourceIndex: g.sourceIndex })));
    return map;
  }, [groups]);

  const handleStyleChange = (id: string) => {
    setStyleId(id);
    // Selections from the previous style don't carry meaning under a new palette
    setSelectedKeys(new Set());
  };

  const toggleSwatch = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleAllForGroup = (group: ColorGroup) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      const allSelected = group.swatches.every((sw) => next.has(sw.key));
      group.swatches.forEach((sw) => (allSelected ? next.delete(sw.key) : next.add(sw.key)));
      return next;
    });
  };

  const handleAdd = () => {
    // Per-swatch numbering restarts per source color, so names read as
    // "Red (Neon 1)", "Red (Neon 2)", "Blue (Neon 1)" rather than a global counter.
    const perSourceCounters = new Map<number, number>();
    const colors: SelectedColor[] = Array.from(selectedKeys).map((key) => {
      const entry = swatchByKey.get(key)!;
      const count = (perSourceCounters.get(entry.sourceIndex) ?? 0) + 1;
      perSourceCounters.set(entry.sourceIndex, count);
      const sourceName = selectedColors[entry.sourceIndex].colorName;
      return {
        colorName: `${sourceName} (${activeStyle.label} ${count})`,
        hexValue: entry.hex,
      };
    });
    onConfirm(colors);
  };

  return (
    <div className="fixed inset-0 z-80 backdrop-blur-xs flex items-center justify-center p-4 animate-popUp">
      <ClickOutside
        className="animate-popUp border-Primary-4 border-2 border-custom-black shadowCorner bg-Quaternary rounded-[2px] shadow-lg max-w-lg w-full [corner-shape:notch] flex flex-col h-fit max-h-[85vh]"
        onOutsideClick={onCancel}>

        {/* ---- Header ---- */}
        <div className="flex flex-row justify-between items-center p-3 gap-3 border-b-3 border-custom-black shadowCorner">
          <div className="flex items-center gap-1.5 min-w-0">
            {selectedColors.length === 1 && (
            selectedColors.slice(0, 5).map((c, i) => (
              <div
                key={i}
                className="w-6 h-6 shrink-0 rounded-[2px] border-2 border-custom-black [corner-shape:notch]"
                style={{ backgroundColor: c.hexValue }}
              />
            ))
            )}
            <h3 className="text-lg font-DogicaPixelBold truncate ml-1">
              {selectedColors.length === 1 ? selectedColors[0].colorName : `${selectedColors.length} Colors`} Restyle
            </h3>
          </div>
          <span className="text-xs opacity-70 shrink-0">{selectedKeys.size} selected</span>
        </div>

        {/* ---- Style picker ---- */}
        <div className="flex flex-col gap-2 px-3 pt-3">
          <div className="flex items-center gap-2">
            <label htmlFor="style-select" className="text-xs font-DogicaPixelBold shrink-0">
              Style
            </label>
            <select
              id="style-select"
              value={styleId}
              onChange={(e) => handleStyleChange(e.target.value)}
              className="flex-1 outline-none bg-Secondary rounded-[2px] shadowCorner border-2 border-custom-black [corner-shape:notch] py-2 px-2 text-sm cursor-pointer">
              {STYLES.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs opacity-70">{activeStyle.description}</p>
        </div>

        {/* ---- Swatch groups, one per selected color ---- */}
        <div className="flex flex-col gap-3 px-3 py-3 overflow-y-auto">
          {groups.map((group) => (
            <div key={group.sourceIndex} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div
                    className="w-4 h-4 shrink-0 rounded-[2px] border-2 border-custom-black [corner-shape:notch]"
                    style={{ backgroundColor: group.source.hexValue }}
                  />
                  <span className="text-xs font-DogicaPixelBold truncate">{group.source.colorName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleAllForGroup(group)}
                  className="text-[10px] opacity-70 hover:opacity-100 cursor-pointer shrink-0">
                  Select all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {group.swatches.map((sw) => {
                  const isSelected = selectedKeys.has(sw.key);
                  return (
                    <button
                      type="button"
                      key={sw.key}
                      title={sw.hex}
                      onClick={() => toggleSwatch(sw.key)}
                      className={`relative w-11 h-11 shrink-0 rounded-[2px] border-2 border-custom-black [corner-shape:notch] cursor-pointer hover:-translate-y-0.5 active:translate-y-0.5 ${
                        isSelected ? "ring-1 ring-offset-2 ring-offset-Tertiary" : ""
                      }`}
                      style={{ backgroundColor: sw.hex }}>
                      {isSelected && (
                        <span className="absolute inset-0 flex items-center justify-center text-custom-black rounded-[2px]">
                          X
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* ---- Footer ---- */}
        <div className="flex justify-end gap-2 border-t-3 border-t-Primary-3 p-2 shadowCorner">
          <button
            type="button"
            className="shadowCorner py-1 px-3 rounded-[2px] border-2 border-custom-black bg-Tertiary [corner-shape:notch] cursor-pointer hover:-translate-y-0.5 active:translate-y-0.5"
            onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            disabled={selectedKeys.size === 0}
            className={`${selectedKeys.size > 9 ? "whitespace-normal" : "whitespace-nowrap"} shadowCorner py-1 px-3 rounded-[2px] border-2 border-custom-black bg-custom-green [corner-shape:notch] cursor-pointer hover:-translate-y-0.5 active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed`}
            onClick={handleAdd}>
            Add ({selectedKeys.size})
          </button>
        </div>
      </ClickOutside>
    </div>
  );
};

export default StyleForm;