// SettingsForm.tsx
import ClickOutside from "./ClickOutside";
import { useTheme, THEME_OPTIONS } from "../contexts/ThemeProvider";
import { useSettings, type CopyFormat } from "../contexts/SettingsContext";

interface SettingsFormProps {
  onClose: () => void;
}

const COPY_FORMAT_OPTIONS: { id: CopyFormat; label: string; example: string }[] = [
  { id: "hex", label: "Hex", example: "#FFFFFF" },
  { id: "hex-no-hash", label: "Hex, no #", example: "FFFFFF" },
  { id: "rgb", label: "RGB", example: "rgb(255, 255, 255)" },
];

const SettingsForm = ({ onClose }: SettingsFormProps) => {
  const { theme, setTheme } = useTheme();
  const { copyFormat, setCopyFormat, showHexInPalette, setShowHexInPalette } = useSettings();

  return (
    <div className="fixed inset-0 z-80 backdrop-blur-xs flex items-center justify-center p-4 animate-popUp">
      <ClickOutside
        className="animate-popUp border-Primary-4 border-2 border-custom-black shadowCorner bg-Quaternary rounded-[2px] shadow-lg max-w-lg w-full [corner-shape:notch] flex flex-col h-fit max-h-[85vh]"
        onOutsideClick={onClose}>

        {/* ---- Header ---- */}
        <div className="flex flex-row justify-between items-center p-3 gap-3 border-b-3 border-custom-black shadowCorner">
          <h3 className="text-lg font-DogicaPixelBold">Settings</h3>
        </div>

        <div className="flex flex-col gap-4 px-3 py-3 overflow-y-auto">

          {/* ---- Theme ---- */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-DogicaPixelBold">Theme</span>
            <div className="grid grid-cols-2 gap-2">
              {THEME_OPTIONS.map((opt) => {
                const isActive = theme === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTheme(opt.id)}
                    className={`flex items-center xs:justify-start justify-center gap-2 rounded-[2px] border-2 border-custom-black [corner-shape:notch] shadowCorner py-2 px-2 cursor-pointer hover:-translate-y-0.5 active:translate-y-0.5 ${
                      isActive ? "bg-Primary" : "bg-Secondary"
                    }`}>
                    <span className="flex shrink-0 rounded-[2px] overflow-hidden border border-custom-black">
                      {opt.preview.map((hex, i) => (
                        <span key={i} className="w-3 h-5" style={{ backgroundColor: hex }} />
                      ))}
                    </span>
                    <span className="text-xs truncate xs:block hidden ">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ---- Copy format ---- */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-DogicaPixelBold">Copy Format</span>
            <div className="flex flex-col gap-1.5">
              {COPY_FORMAT_OPTIONS.map((opt) => {
                const isActive = copyFormat === opt.id;
                return (
                  <label
                    key={opt.id}
                    className={`flex items-center justify-between gap-2 rounded-[2px] border-2 border-custom-black [corner-shape:notch] shadowCorner py-2 px-2 cursor-pointer hover:-translate-y-0.5 active:translate-y-0.5 ${
                      isActive ? "bg-Primary" : "bg-Secondary"
                    }`}>
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="copy-format"
                        checked={isActive}
                        onChange={() => setCopyFormat(opt.id)}
                        className="accent-current cursor-pointer"
                      />
                      <span className="text-xs">{opt.label}</span>
                    </span>
                    <span className="text-[10px] font-mono opacity-60">{opt.example}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* ---- Palette display ---- */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-DogicaPixelBold">Palette Display</span>
            <label className="flex items-center justify-between gap-2 rounded-[2px] border-2 border-custom-black [corner-shape:notch] shadowCorner py-2 px-2 cursor-pointer bg-Secondary hover:-translate-y-0.5 active:translate-y-0.5">
              <span className="text-xs">Show hex code under each swatch</span>
              <input
                type="checkbox"
                checked={showHexInPalette}
                onChange={(e) => setShowHexInPalette(e.target.checked)}
                className="w-4 h-4 accent-current cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* ---- Footer ---- */}
        <div className="flex justify-end gap-2 border-t-3 border-t-Primary-3 p-2 shadowCorner">
          <button
            type="button"
            className="shadowCorner py-1 px-3 rounded-[2px] border-2 border-custom-black bg-custom-green [corner-shape:notch] cursor-pointer hover:-translate-y-0.5 active:translate-y-0.5"
            onClick={onClose}>
            Done
          </button>
        </div>
      </ClickOutside>
    </div>
  );
};

export default SettingsForm;