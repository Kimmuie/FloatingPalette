import { useState, useRef, useEffect, useMemo } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import ClickOutside from "./ClickOutside";
import { getCurrentWindow } from "@tauri-apps/api/window";

const appWindow = getCurrentWindow();

interface ColorFormProps {
  mode: "add" | "edit";
  initialName?: string;
  initialHex?: string;
  onConfirm: (name: string, hex: string) => void;
  onCancel: () => void;
}

type ColorMode = "HEX" | "RGB" | "HSL";
type BarKind = "hue" | "light";

// ---------------------------------------------------------------------------
// Color conversion helpers
// (Saturation is always treated as 100% — the picker only exposes hue + lightness)
// ---------------------------------------------------------------------------

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean.split("").map((c) => c + c).join("")
      : clean.padEnd(6, "0");
  const bigint = parseInt(full, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return (
    "#" +
    [r, g, b]
      .map((v) =>
        Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")
      )
      .join("")
  );
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: s * 100, l: l * 100 };
}

function hslToRgb(h: number, s: number, l: number) {
  s /= 100;
  l /= 100;
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
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

function isValidHex(hex: string) {
  return /^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(hex.trim());
}

// ---------------------------------------------------------------------------
// Header config per mode
// ---------------------------------------------------------------------------

const HEADER_CONFIG: Record<ColorFormProps["mode"], { icon: string; title: string; confirmLabel: string }> = {
  add: { icon: "/svg/iconAdd.svg", title: "Add Color", confirmLabel: "Add" },
  edit: { icon: "/svg/iconEdit.svg", title: "Edit Color", confirmLabel: "Done" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ColorForm = ({
  mode,
  initialName = "",
  initialHex = "#ffffff",
  onConfirm,
  onCancel,
}: ColorFormProps) => {
  const [name, setName] = useState(initialName);
  const [colorMode, setColorMode] = useState<ColorMode>("HEX");
  const [dropperSupported] = useState(() => typeof window !== "undefined" && "EyeDropper" in window);
  const [isDropping, setIsDropping] = useState(false);
  const [hue, setHue] = useState(() => {
    const { r, g, b } = hexToRgb(initialHex);
    return rgbToHsl(r, g, b).h;
  });
  const [lightness, setLightness] = useState(() => {
    const { r, g, b } = hexToRgb(initialHex);
    return rgbToHsl(r, g, b).l;
  });

  const hueBarRef = useRef<HTMLDivElement>(null);
  const lightBarRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<BarKind | null>(null);
  const isFocusedRef = useRef(false);

  const { icon, title, confirmLabel } = HEADER_CONFIG[mode];

  // Single source of truth color, derived from hue/lightness
  const currentHex = useMemo(() => {
    const { r, g, b } = hslToRgb(hue, 100, lightness);
    return rgbToHex(r, g, b);
  }, [hue, lightness]);

  // What the text field *should* show for the current mode
  const displayValue = useMemo(() => {
    const { r, g, b } = hexToRgb(currentHex);
    if (colorMode === "HEX") return currentHex;
    if (colorMode === "RGB") return `${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}`;
    const hsl = rgbToHsl(r, g, b);
    return `${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%`;
  }, [currentHex, colorMode]);

  const [inputText, setInputText] = useState(displayValue);

  // Keep the text field synced with the sliders/mode, but never fight the user while they're typing
  useEffect(() => {
    if (!isFocusedRef.current) setInputText(displayValue);
  }, [displayValue]);

  // ---- Slider dragging (window-level pointer listeners) ----

  const updateFromClientX = (bar: BarKind, clientX: number) => {
    const ref = bar === "hue" ? hueBarRef.current : lightBarRef.current;
    if (!ref) return;
    const rect = ref.getBoundingClientRect();
    const percent = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    if (bar === "hue") setHue(percent * 360);
    else setLightness(percent * 100);
  };

  const handleBarPointerDown = (bar: BarKind) => (e: ReactPointerEvent<HTMLDivElement>) => {
    draggingRef.current = bar;
    updateFromClientX(bar, e.clientX);

    const handleMove = (ev: PointerEvent) => {
      if (draggingRef.current) updateFromClientX(draggingRef.current, ev.clientX);
    };
    const handleUp = () => {
      draggingRef.current = null;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  // Cleanup in case the modal unmounts mid-drag
  useEffect(() => {
    return () => {
      draggingRef.current = null;
    };
  }, []);

  // ---- HEX / RGB / HSL toggle + text parsing ----

  const cycleColorMode = () => {
    setColorMode((m) => (m === "HEX" ? "RGB" : m === "RGB" ? "HSL" : "HEX"));
  };

  const commitTextInput = () => {
    const val = inputText.trim();

    if (colorMode === "HEX") {
      if (isValidHex(val)) {
        const { r, g, b } = hexToRgb(val);
        const hsl = rgbToHsl(r, g, b);
        setHue(hsl.h);
        setLightness(hsl.l);
        return;
      }
    } else if (colorMode === "RGB") {
      const parts = val.split(",").map((p) => parseFloat(p.trim()));
      if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
        const [r, g, b] = parts.map((n) => Math.max(0, Math.min(255, n)));
        const hsl = rgbToHsl(r, g, b);
        setHue(hsl.h);
        setLightness(hsl.l);
        return;
      }
    } else {
      // HSL — saturation is read but not stored, since the picker locks it at 100%
      const parts = val.replace(/%/g, "").split(",").map((p) => parseFloat(p.trim()));
      if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
        const [h, , l] = parts;
        setHue(((h % 360) + 360) % 360);
        setLightness(Math.max(0, Math.min(100, l)));
        return;
      }
    }

    // Invalid input — snap back to the last valid display value
    setInputText(displayValue);
  };

 const handleEyedropper = async () => {
    if (!dropperSupported || isDropping) return;
    setIsDropping(true);
    try {
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      const { r, g, b } = hexToRgb(result.sRGBHex);
      const hsl = rgbToHsl(r, g, b);
      setHue(hsl.h);
      setLightness(hsl.l);
    } catch (err) {
      console.error("Eyedropper failed:", err);
    } finally {
      try {
        await appWindow.setIgnoreCursorEvents(true);
        await appWindow.setIgnoreCursorEvents(false);
        await appWindow.setFocus();
      } catch (focusErr) {
        console.error("Focus restore failed:", focusErr);
      }
      setIsDropping(false);
    }
  };

  const handleSave = () => {
    const trimmed = name.trim();
    onConfirm(trimmed || "Unnamed", currentHex);
  };

  return (
    <div className="fixed inset-0 z-80 backdrop-blur-xs flex items-center justify-center p-4 animate-popUp">
      <ClickOutside
        className="animate-popUp border-Primary-4 border-2 border-custom-black shadowCorner bg-Primary rounded-[2px] shadow-lg max-w-sm w-full [corner-shape:notch] flex flex-col h-fit"
        onOutsideClick={onCancel}>
        <div className="px-2">
          <div className="flex flex-row justify-start items-center h-full p-3 gap-3">
            <img src={icon} className="w-8 h-8" />
            <h3 className="text-lg">{title}</h3>
          </div>

          {/* ---- Swatch + Hue/Lightness bars ---- */}
          <div className="flex gap-2 items-center">
            <div
              className="w-10 h-10 rounded-[2px] border-2 border-custom-black [corner-shape:notch] shrink-0"
              style={{ backgroundColor: currentHex }}
            />
            <div className="flex-1 flex flex-col gap-2">
              {/* Hue bar */}
              <div
                ref={hueBarRef}
                onPointerDown={handleBarPointerDown("hue")}
                className="relative h-4 rounded-[2px] border-2 border-custom-black cursor-pointer touch-none"
                style={{
                  background:
                    "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
                }}>
                <div
                  className="absolute top-1/2 w-3 h-5 -translate-y-1/2 -translate-x-1/2 bg-white border-2 border-custom-black rounded-[2px] pointer-events-none"
                  style={{ left: `${(hue / 360) * 100}%` }}
                />
              </div>

              {/* Lightness bar */}
              <div
                ref={lightBarRef}
                onPointerDown={handleBarPointerDown("light")}
                className="relative h-4 rounded-[2px] border-2 border-custom-black cursor-pointer touch-none"
                style={{
                  background: `linear-gradient(to right, #000000, hsl(${hue}, 100%, 50%), #ffffff)`,
                }}>
                <div
                  className="absolute top-1/2 w-3 h-5 -translate-y-1/2 -translate-x-1/2 bg-white border-2 border-custom-black rounded-[2px] pointer-events-none"
                  style={{ left: `${lightness}%` }}
                />
              </div>
            </div>
            
            {dropperSupported && (
              <button
                type="button"
                onClick={handleEyedropper}
                disabled={isDropping}
                title="Pick color from screen"
                className="shadowCorner w-10 h-10 shrink-0 rounded-[2px] border-2 border-custom-black bg-Tertiary [corner-shape:notch] cursor-pointer hover:-translate-y-0.5 active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
                <img src="/svg/iconDropper.svg" className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* ---- HEX/RGB/HSL toggle + value input ---- */}
          <div className="flex gap-2 items-center mt-2">
            <button
              type="button"
              onClick={cycleColorMode}
              className="shadowCorner text-xs font-bold py-2 rounded-[2px] border-2 border-custom-black bg-Tertiary [corner-shape:notch] cursor-pointer hover:-translate-y-0.5 active:translate-y-0.5 shrink-0 w-14">
              {colorMode}
            </button>
            <input
              type="text"
              value={inputText}
              onFocus={() => {
                isFocusedRef.current = true;
              }}
              onChange={(e) => setInputText(e.target.value)}
              onBlur={() => {
                isFocusedRef.current = false;
                commitTextInput();
              }}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              className="w-full outline-none bg-Secondary rounded-[2px] shadowCorner border-2 border-custom-black [corner-shape:notch] py-2 px-2 flex-1 font-mono text-sm"
            />
          </div>

          {/* ---- Name input ---- */}
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="Enter Color Name ..."
            className="outline-none bg-Secondary rounded-[2px] shadowCorner border-2 border-custom-black [corner-shape:notch] py-2 px-1 w-full mt-2"
          />
        </div>
        <div className="flex justify-end gap-2 mt-4 border-t-3 border-t-Primary-3 p-2 shadowCorner">
          <button
            className="shadowCorner py-1 px-3 rounded-[2px] border-2 border-custom-black bg-Tertiary [corner-shape:notch] cursor-pointer hover:-translate-y-0.5 active:translate-y-0.5"
            onClick={onCancel}>
            Cancel
          </button>
          <button
            className="shadowCorner py-1 px-3 rounded-[2px] border-2 border-custom-black bg-Secondary [corner-shape:notch] cursor-pointer hover:-translate-y-0.5 active:translate-y-0.5"
            onClick={handleSave}>
            {confirmLabel}
          </button>
        </div>
      </ClickOutside>
    </div>
  );
};

export default ColorForm;