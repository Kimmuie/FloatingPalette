import { useState, useRef, useEffect, useMemo } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import ClickOutside from "./ClickOutside";
import { getCurrentWindow } from "@tauri-apps/api/window";
import PixelOutline from "./PixelOutline";

const appWindow = getCurrentWindow();

interface ColorFormProps {
  mode: "add" | "edit" | "pick";
  initialName?: string;
  initialHex?: string;
  onConfirm: (name: string, hex: string) => void;
  onCancel: () => void;
}

type ColorMode = "HEX" | "RGB" | "HSL";
type BarKind = "hue" | "sat" |"light";

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
  pick: { icon: "/svg/iconAdd.svg", title: "Color Picker", confirmLabel: "Add" },
};

// Magnifier loupe constants
const MAGNIFIER_SAMPLE = 5; // 5x5 source pixels shown
const MAGNIFIER_ZOOM = 20; // px per source pixel
const MAGNIFIER_SIZE = MAGNIFIER_SAMPLE * MAGNIFIER_ZOOM;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ColorForm = ({
  mode,
  initialName = "",
  initialHex = "#ff0000",
  onConfirm,
  onCancel,
}: ColorFormProps) => {
  const [name, setName] = useState(initialName);
  const [colorMode, setColorMode] = useState<ColorMode>("HEX");

  // Hue (0-360) + Lightness (0-100), saturation implicitly 100
  const initialHsl = useMemo(() => {
    const { r, g, b } = hexToRgb(initialHex);
    return rgbToHsl(r, g, b);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [hue, setHue] = useState(initialHsl.h);
  const [saturation, setSaturation] = useState(initialHsl.s);
  const [lightness, setLightness] = useState(initialHsl.l);

  const hueBarRef = useRef<HTMLDivElement>(null);
  const satBarRef = useRef<HTMLDivElement>(null);
  const lightBarRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<BarKind | null>(null);
  const isFocusedRef = useRef(false);

  // Native OS eyedropper (approximate — see handleEyedropper note)
  const [dropperSupported] = useState(() => typeof window !== "undefined" && "EyeDropper" in window);
  const [isDropping, setIsDropping] = useState(false);

  // Uploaded/pasted image + pixel-exact hover magnifier
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const magnifierCanvasRef = useRef<HTMLCanvasElement>(null);
  const [magnifier, setMagnifier] = useState<{
    screenX: number;
    screenY: number;
    pixelX: number;
    pixelY: number;
    color: string;
  } | null>(null);

  const { icon, title, confirmLabel } = HEADER_CONFIG[mode];

  // Single source of truth color, derived from hue/lightness
  const currentHex = useMemo(() => {
    const { r, g, b } = hslToRgb(hue, saturation, lightness);
    return rgbToHex(r, g, b);
  }, [hue, saturation, lightness]);

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

  const applyRgb = (r: number, g: number, b: number) => {
    const hsl = rgbToHsl(r, g, b);
    setHue(hsl.h);
    setSaturation(hsl.s);
    setLightness(hsl.l);
  };

  // ---- Slider dragging (window-level pointer listeners) ----

  const updateFromClientX = (bar: BarKind, clientX: number) => {
    const ref = bar === "hue" ? hueBarRef.current : bar === "sat" ? satBarRef.current : lightBarRef.current;
    if (!ref) return;
    const rect = ref.getBoundingClientRect();
    const percent = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    if (bar === "hue") setHue(percent * 360);
    else if (bar === "sat") setSaturation(percent * 100);
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

  useEffect(() => {
    return () => {
      draggingRef.current = null;
    };
  }, []);

  // ---- HEX / RGB / HSL toggle + text parsing ----

  const cycleColorMode = () => {
    setColorMode((m) => (m === "HEX" ? "RGB" : m === "RGB" ? "HSL" : "HEX"));
  };

  const tryApplyTextInput = (val: string) => {
  const trimmed = val.trim();

  if (colorMode === "HEX") {
    if (isValidHex(trimmed)) {
      const { r, g, b } = hexToRgb(trimmed);
      applyRgb(r, g, b);
      return true;
    }
  } else if (colorMode === "RGB") {
    const parts = trimmed.split(",").map((p) => parseFloat(p.trim()));
    if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
      const [r, g, b] = parts.map((n) => Math.max(0, Math.min(255, n)));
      applyRgb(r, g, b);
      return true;
    }
  } else {
    const parts = trimmed.replace(/%/g, "").split(",").map((p) => parseFloat(p.trim()));
    if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
      const [h, s, l] = parts;
      setHue(((h % 360) + 360) % 360);
      setSaturation(Math.max(0, Math.min(100, s)));
      setLightness(Math.max(0, Math.min(100, l)));
      return true;
    }
  }

    return false;
  };

  const commitTextInput = () => {
    const ok = tryApplyTextInput(inputText);
    if (!ok) setInputText(displayValue);
  };

  useEffect(() => {
  if (!isFocusedRef.current) setInputText(displayValue);
}, [displayValue]);

  // ---- Native OS eyedropper ----
  // NOTE: this samples the whole screen through Chromium's own capture path,
  // which on HDR/wide-gamut displays can return noticeably brighter/lighter
  // values than what's actually on screen. That's a browser/OS-level
  // tone-mapping limitation, not something fixable from here — treat this as
  // a quick approximate pick, not a color-accurate one. For accurate values,
  // use "Upload / Paste Image" below, which reads raw canvas pixel data.
  const handleEyedropper = async () => {
    if (!dropperSupported || isDropping) return;
    setIsDropping(true);
    try {
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      const { r, g, b } = hexToRgb(result.sRGBHex);
      applyRgb(r, g, b);
    } catch (err) {
      console.error("Eyedropper failed:", err);
    } finally {
      // WebView2 workaround: closing the native overlay can leave the window's
      // hit-testing broken (clicks stop registering) until forced to recompute.
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

  // ---- Image upload / paste + pixel-exact sampling ----
  // This is the accurate path: raw getImageData reads, no HDR tone-mapping,
  // no OS capture pipeline involved.

  useEffect(() => {
    if (!uploadedImage) return;
    const canvas = imageCanvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.imageSmoothingEnabled = false; // pixel-exact, no blending
      ctx.drawImage(img, 0, 0);
    };
    img.src = uploadedImage;
  }, [uploadedImage]);

  const getPixelAt = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.min(canvas.width - 1, Math.max(0, Math.floor((clientX - rect.left) * scaleX)));
    const y = Math.min(canvas.height - 1, Math.max(0, Math.floor((clientY - rect.top) * scaleY)));
    const data = ctx.getImageData(x, y, 1, 1).data;
    return { r: data[0], g: data[1], b: data[2], x, y };
  };

  const handleFileSelected = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setUploadedImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelected(e.target.files?.[0] ?? null);
  };

  const handleImageCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = imageCanvasRef.current;
    if (!canvas) return;
    const pixel = getPixelAt(canvas, e.clientX, e.clientY);
    if (!pixel) return;
    applyRgb(pixel.r, pixel.g, pixel.b);
  };

  // ---- Hover magnifier (zoomed pixel loupe) ----
  // Draws a small NxN neighborhood of source pixels, scaled up with no
  // smoothing, into a floating canvas that follows the cursor. Gives
  // pixel-exact visual feedback for exactly which pixel a click will sample.

  const drawMagnifier = (sourceCanvas: HTMLCanvasElement, centerX: number, centerY: number) => {
    const magCanvas = magnifierCanvasRef.current;
    const ctx = magCanvas?.getContext("2d");
    if (!magCanvas || !ctx) return;

    const half = Math.floor(MAGNIFIER_SAMPLE / 2);
    const sx = centerX - half;
    const sy = centerY - half;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, MAGNIFIER_SIZE, MAGNIFIER_SIZE);
    ctx.drawImage(
      sourceCanvas,
      sx,
      sy,
      MAGNIFIER_SAMPLE,
      MAGNIFIER_SAMPLE,
      0,
      0,
      MAGNIFIER_SIZE,
      MAGNIFIER_SIZE
    );

    // Highlight the exact center pixel (the one that would be picked)
    const cellX = half * MAGNIFIER_ZOOM;
    const cellY = half * MAGNIFIER_ZOOM;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.strokeRect(cellX + 1.5, cellY + 1.5, MAGNIFIER_ZOOM - 3, MAGNIFIER_ZOOM - 3);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;
    ctx.strokeRect(cellX + 0.5, cellY + 0.5, MAGNIFIER_ZOOM - 1, MAGNIFIER_ZOOM - 1);
  };

  const handleImageCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = imageCanvasRef.current;
    if (!canvas) return;
    const pixel = getPixelAt(canvas, e.clientX, e.clientY);
    if (!pixel) return;

    const rect = canvas.getBoundingClientRect();
    drawMagnifier(canvas, pixel.x, pixel.y);

    setMagnifier({
      screenX: e.clientX - rect.left,
      screenY: e.clientY - rect.top,
      pixelX: pixel.x,
      pixelY: pixel.y,
      color: rgbToHex(pixel.r, pixel.g, pixel.b),
    });
  };

  const handleImageCanvasMouseLeave = () => setMagnifier(null);

  const clearUploadedImage = () => {
    setUploadedImage(null);
    setMagnifier(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    if (mode !== "pick") return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            handleFileSelected(file);
            e.preventDefault();
          }
          break;
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [mode]);

  const handleSave = () => {
    const trimmed = name.trim();
    onConfirm(trimmed || "Unnamed", currentHex);
  };

  return (
    <div className="fixed inset-0 z-80 backdrop-blur-xs flex items-center justify-center p-4 animate-popUp">
      <ClickOutside
        className="animate-popUp border-Primary-4 gap-2 border-2 border-custom-black shadowCorner bg-Primary rounded-[2px] shadow-lg w-fit [corner-shape:notch] flex flex-col h-fit"
        onOutsideClick={onCancel}>
        <div className="flex flex-col w-full h-full gap-2 px-2">
          <div className="flex flex-row justify-between items-center h-full p-3 gap-3">
            <div className="flex flex-row gap-2">
              <img src={icon} className="w-8 h-8" />
              <h3 className="text-lg">{title}</h3>
            </div>
            {dropperSupported && (
              <button
                type="button"
                onClick={handleEyedropper}
                disabled={isDropping}
                title="Pick color from screen (approximate — may run bright on HDR displays)"
                className="shadowCorner w-10 h-10 shrink-0 rounded-[2px] border-2 border-custom-black bg-Tertiary [corner-shape:notch] cursor-pointer hover:-translate-y-0.5 active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
                <img src="/svg/iconDropper.svg" className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* ---- Upload / paste image sampler (accurate path) ---- */}
          {mode === "pick" && (
            <div className="flex flex-col gap-2">
              {!uploadedImage ? (
                <label className="shadowCorner border-2 border-dashed border-custom-black rounded-[2px] [corner-shape:notch] bg-Secondary py-6 px-3 flex flex-col items-center justify-center gap-1 cursor-pointer hover:-translate-y-0.5 active:translate-y-0.5 text-center">
                  <img src="/svg/iconAdd.svg" className="w-6 h-6 opacity-60" />
                  <span className="text-xs">Click to upload, or paste with Ctrl+V</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="relative" onMouseLeave={handleImageCanvasMouseLeave}>
                  <canvas
                    ref={imageCanvasRef}
                    onClick={handleImageCanvasClick}
                    onMouseMove={handleImageCanvasMouseMove}
                    className="w-full max-h-48 object-contain rounded-[2px] border-2 border-custom-black [corner-shape:notch] cursor-crosshair"
                  />
                  <button
                    type="button"
                    onClick={clearUploadedImage}
                    title="Remove image"
                    className="absolute top-1 right-1 shadowCorner w-6 h-6 rounded-[2px] border-2 border-custom-black bg-Tertiary [corner-shape:notch] cursor-pointer flex items-center justify-center hover:-translate-y-0.5 active:translate-y-0.5">
                    X
                  </button>

                  {/* Hover magnifier loupe — follows cursor, shows zoomed pixel neighborhood */}
                  {magnifier && (
                    <div
                      className="absolute z-90 pointer-events-none flex flex-col items-center"
                      style={{
                        left: magnifier.screenX,
                        top: magnifier.screenY,
                        transform: "translate(-50%, calc(-100% - 16px))",
                      }}>
                      <div className="shadowCorner rounded-[2px] border-2 border-custom-black [corner-shape:notch] bg-Primary p-1 flex flex-col items-center gap-1">
                        <canvas
                          ref={magnifierCanvasRef}
                          width={MAGNIFIER_SIZE}
                          height={MAGNIFIER_SIZE}
                          className="rounded-[2px] border-2 border-custom-black [corner-shape:notch]"
                          style={{
                            width: MAGNIFIER_SIZE,
                            height: MAGNIFIER_SIZE,
                            imageRendering: "pixelated",
                          }}
                        />
                        <span className="text-[10px] font-mono px-1">{magnifier.color}</span>
                      </div>
                      <div
                        className="w-0 h-0 -mt-px"
                        style={{
                          borderLeft: "6px solid transparent",
                          borderRight: "6px solid transparent",
                          borderTop: "8px solid var(--color-custom-black, #000)",
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ---- Swatch + Hue/Lightness bars ---- */}
          <div className="flex gap-2 items-center">
            <div
              className="flex-1 aspect-square w-16 h-16 rounded-[2px] border-2 border-custom-black [corner-shape:notch]"
              style={{ backgroundColor: currentHex }}
            />
            <div className="flex-4  flex flex-col gap-2">
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
              {/* Saturation bar */}
              <div
                ref={satBarRef}
                onPointerDown={handleBarPointerDown("sat")}
                className="relative h-4 rounded-[2px] border-2 border-custom-black cursor-pointer touch-none"
                style={{
                  background: `linear-gradient(to right, hsl(${hue}, 0%, ${lightness}%), hsl(${hue}, 100%, ${lightness}%))`,
                }}>
                <div
                  className="absolute top-1/2 w-3 h-5 -translate-y-1/2 -translate-x-1/2 bg-white border-2 border-custom-black rounded-[2px] pointer-events-none"
                  style={{ left: `${saturation}%` }}
                />
              </div>
            </div>

          </div>

          {/* ---- HEX/RGB/HSL toggle + value input ---- */}
          <div className="flex w-full gap-2 items-center">
            <PixelOutline
              as="button"
              onClick={cycleColorMode}
              className="shadowCorner text-xs font-DogicaPixelBold py-2 rounded-[2px] border-2 border-custom-black bg-Tertiary [corner-shape:notch] cursor-pointer hover:-translate-y-0.5 active:translate-y-0.5 shrink-0 px-2">
              {colorMode}
            </PixelOutline>
            <input
              type="text"
              value={inputText}
              onFocus={() => {
                isFocusedRef.current = true;
              }}
              onChange={(e) => {
                const val = e.target.value;
                setInputText(val);
                tryApplyTextInput(val);
              }}
              onBlur={() => {
                isFocusedRef.current = false;
                commitTextInput();
              }}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              className="w-full outline-none bg-Secondary rounded-[2px] shadowCorner border-2 border-custom-black [corner-shape:notch] py-2 px-2 flex-1 font-mono text-sm"
            />
          </div>

          {/* ---- Name input ---- */}
          <PixelOutline
            as="input"
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="Enter Color Name ..."
            className="outline-none bg-Secondary rounded-[2px] shadowCorner border-2 border-custom-black [corner-shape:notch] py-2 px-1 w-full"
          />
        </div>
        <div className="flex justify-end gap-2 border-t-3 border-t-Primary-3 p-2 shadowCorner">
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