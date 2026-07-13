// ThemeProvider.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeId = "default" | "dark" | "sunset" | "forest";

interface ThemeOption {
  id: ThemeId;
  label: string;
  // Preview swatches shown in the picker only — these are PLACEHOLDERS.
  // Replace each with the real --color-Primary/Secondary/Tertiary/custom-black
  // values you define for that theme so previews match reality.
  preview: string[];
}

export const THEME_OPTIONS: ThemeOption[] = [
  { id: "default", label: "Light", preview: ["#fafafa", "#DDDDDD", "#9D9D9D", "#9e3838"] },
  { id: "dark", label: "Dark", preview: ["#474c53", "#5F6870", "#444242", "#B14646"] },
  { id: "sunset", label: "Sunset", preview: ["#fff1e0", "#ffd6a5", "#ffb385", "#c44536"] },
  { id: "forest", label: "Forest", preview: ["#dceedd", "#eaf3e8", "#7fb685", "#3a5a40"] },
];

const STORAGE_KEY = "fp:theme";
const DEFAULT_THEME: ThemeId = "default";

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    if (typeof window === "undefined") return DEFAULT_THEME;
    const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    return stored && THEME_OPTIONS.some((t) => t.id === stored) ? stored : DEFAULT_THEME;
  });

  // Applying via a data-attribute on <html> means your CSS just needs
  // [data-theme="dark"] { --color-Primary: ...; } blocks — no class juggling.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}