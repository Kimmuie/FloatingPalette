// SettingsContext.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CopyFormat = "hex" | "hex-no-hash" | "rgb";

interface AppSettings {
  copyFormat: CopyFormat;
  showHexInPalette: boolean;
}

interface SettingsContextValue extends AppSettings {
  setCopyFormat: (format: CopyFormat) => void;
  setShowHexInPalette: (value: boolean) => void;
}

const STORAGE_KEY = "fp:settings";

const DEFAULT_SETTINGS: AppSettings = {
  copyFormat: "hex",
  showHexInPalette: true,
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const setCopyFormat = (copyFormat: CopyFormat) => setSettings((s) => ({ ...s, copyFormat }));
  const setShowHexInPalette = (showHexInPalette: boolean) =>
    setSettings((s) => ({ ...s, showHexInPalette }));

  return (
    <SettingsContext.Provider value={{ ...settings, setCopyFormat, setShowHexInPalette }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within a SettingsProvider");
  return ctx;
}

// Shared formatter — use this anywhere a hex color gets copied to the
// clipboard so every copy action respects the user's chosen format.
export function formatColorForCopy(hex: string, format: CopyFormat): string {
  const clean = hex.replace("#", "");
  if (format === "hex") return `#${clean.toUpperCase()}`;
  if (format === "hex-no-hash") return clean.toUpperCase();

  // rgb
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean.padEnd(6, "0");
  const bigint = parseInt(full, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgb(${r}, ${g}, ${b})`;
}