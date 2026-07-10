// ShadingForm.tsx
import { useMemo, useState } from "react";
import ClickOutside from "./ClickOutside";

interface SelectedColor {
  colorName: string;
  hexValue: string;
}

interface ShadingFormProps {
  selectedColor: SelectedColor;
  onConfirm: (colors: SelectedColor[]) => void;
  onCancel: () => void;
}

interface Swatch {
  key: string;
  hex: string;
}

interface Category {
  id: string;
  title: string;
  description: string;
  swatches: Swatch[];
}

// ---------------------------------------------------------------
// Color math helpers (hex <-> hsl)
// ---------------------------------------------------------------
const clamp = (v: number) => Math.min(100, Math.max(0, v));

function hexToHsl(hex: string): [number, number, number] {
  let clean = hex.replace("#", "");
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToHex(hue: number, sat: number, light: number): string {
  const h = ((hue % 360) + 360) % 360;
  const s = clamp(sat) / 100;
  const l = clamp(light) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ---------------------------------------------------------------
// ShadingForm
// ---------------------------------------------------------------
const ShadingForm = ({ selectedColor, onConfirm, onCancel }: ShadingFormProps) => {
  const [h, s, l] = useMemo(() => hexToHsl(selectedColor.hexValue), [selectedColor.hexValue]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const categories: Category[] = useMemo(() => {
    const mk = (id: string, hexes: string[]): Swatch[] =>
      hexes.map((hex, i) => ({ key: `${id}-${i}`, hex }));

    const steps = [0.2, 0.4, 0.6, 0.8];

    return [
      {
        id: "shade",
        title: "Shade Color Variation",
        description: "Shade: mixes the color with black to darken it, keeping the same hue.",
        swatches: mk("shade", steps.map((a) => hslToHex(h, s, clamp(l * (1 - a))))),
      },
      {
        id: "tint",
        title: "Tint Color Variation",
        description: "Tint: mixes the color with white to lighten it, keeping the same hue.",
        swatches: mk("tint", steps.map((a) => hslToHex(h, s, clamp(l + (100 - l) * a)))),
      },
      {
        id: "tone",
        title: "Tone Color Variation",
        description: "Tone: mixes the color with gray to mute saturation, keeping hue and lightness.",
        swatches: mk("tone", steps.map((a) => hslToHex(h, clamp(s * (1 - a)), l))),
      },
      {
        id: "monochromatic",
        title: "Monochromatic Color",
        description: "Monochromatic: variations of the same hue using different lightness and saturation.",
        swatches: mk("mono", [
          hslToHex(h, s, clamp(l - 30)),
          hslToHex(h, clamp(s * 0.7), clamp(l - 15)),
          hslToHex(h, clamp(s * 0.7), clamp(l + 15)),
          hslToHex(h, s, clamp(l + 30)),
        ]),
      },
      {
        id: "complementary",
        title: "Complementary Color",
        description: "Complementary: the color directly opposite the base on the wheel (180°), for high contrast.",
        swatches: mk("comp", [hslToHex(h + 180, s, l)]),
      },
      {
        id: "tetradic",
        title: "Tetradic Color",
        description: "Tetradic: two complementary pairs (90° apart), forming a rectangle on the color wheel.",
        swatches: mk("tetra", [
          hslToHex(h + 90, s, l),
          hslToHex(h + 180, s, l),
          hslToHex(h + 270, s, l),
        ]),
      },
      {
        id: "analogous",
        title: "Analogous Color",
        description: "Analogous: colors neighboring the base on the wheel (±30°), for a harmonious, low-contrast palette.",
        swatches: mk("analog", [hslToHex(h - 30, s, l), hslToHex(h + 30, s, l)]),
      },
      {
        id: "split-complementary",
        title: "Split Complementary Color",
        description: "Split Complementary: the two colors next to the base's complement (150° / 210°), contrast with less tension.",
        swatches: mk("split", [hslToHex(h + 150, s, l), hslToHex(h + 210, s, l)]),
      },
      {
        id: "triadic",
        title: "Triadic Color",
        description: "Triadic: three colors evenly spaced around the wheel (120° apart), vibrant yet balanced.",
        swatches: mk("triad", [hslToHex(h + 120, s, l), hslToHex(h + 240, s, l)]),
      },
    ];
  }, [h, s, l]);

  const swatchByKey = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => c.swatches.forEach((sw) => map.set(sw.key, sw.hex)));
    return map;
  }, [categories]);

  const toggleSwatch = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleAdd = () => {
    const colors: SelectedColor[] = Array.from(selectedKeys).map((key, i) => ({
      colorName: `${selectedColor.colorName} (${i + 1})`,
      hexValue: swatchByKey.get(key)!,
    }));
    onConfirm(colors);
  };

  return (
    <div className="fixed inset-0 z-80 backdrop-blur-xs flex items-center justify-center p-4 animate-popUp">
      <ClickOutside
        className="animate-popUp border-Primary-4 border-2 border-custom-black shadowCorner bg-Primary rounded-[2px] shadow-lg max-w-lg w-full [corner-shape:notch] flex flex-col h-fit max-h-[85vh]"
        onOutsideClick={onCancel}>

        {/* ---- Header ---- */}
        <div className="flex flex-row justify-between items-center p-3 gap-3 border-b-3 border-custom-black shadowCorner">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-8 h-8 shrink-0 rounded-[2px] border-2 border-custom-black [corner-shape:notch]"
              style={{ backgroundColor: selectedColor.hexValue }}
            />
            <h3 className="text-lg font-DogicaPixelBold truncate">{selectedColor.colorName} Shading</h3>
          </div>
          <span className="text-xs opacity-70 shrink-0">{selectedKeys.size} selected</span>
        </div>

        {/* ---- Categories ---- */}
        <div className="flex flex-col gap-3 px-3 py-3 overflow-y-auto">
          {categories.map((cat) => (
            <div key={cat.id} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-DogicaPixelBold">{cat.title}</span>
                <button
                  type="button"
                  title={cat.description}
                  aria-label={cat.description}
                  className="w-5 h-5 shadowCorner shrink-0 rounded-[2px] border-2 [corner-shape:notch] border-custom-black bg-Tertiary text-xs leading-none flex items-center justify-center cursor-help">
                  ?
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {cat.swatches.map((sw) => {
                  const isSelected = selectedKeys.has(sw.key);
                  return (
                    <button
                      type="button"
                      key={sw.key}
                      title={sw.hex}
                      onClick={() => toggleSwatch(sw.key)}
                      className={`relative w-9 h-9 shrink-0 rounded-[2px] border-2 border-custom-black [corner-shape:notch]  cursor-pointer hover:-translate-y-0.5 active:translate-y-0.5 ${
                        isSelected ? "ring-2 ring-offset-1 ring-Tertiary" : ""
                      }`}
                      style={{ backgroundColor: sw.hex }}>
                      {isSelected && (
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white bg-black/30 rounded-[2px]">
                          ✓
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
            className={`${selectedKeys.size > 9 ? "whitespace-normal" : "whitespace-nowrap"} shadowCorner py-1 px-3 rounded-[2px] border-2 border-custom-black bg-Secondary [corner-shape:notch] cursor-pointer hover:-translate-y-0.5 active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed`}
            onClick={handleAdd}>
            Add ({selectedKeys.size})
          </button>
        </div>
      </ClickOutside>
    </div>
  );
};

export default ShadingForm;