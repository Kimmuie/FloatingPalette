import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import TitleBar from "./components/TitleBar";
import CollectionPage from "./pages/CollectionPage";
import PalettePage from "./pages/PalettePage";
import type { Palette } from "./components/types";
import { SettingsProvider } from "./contexts/SettingsContext";
import { ThemeProvider } from "./contexts/ThemeProvider";

const PALETTES_STORAGE_KEY = "fp:palettes";

const DEFAULT_PALETTE_LIST: Palette[] = [
  // {
  //   paletteName: "My Palette",
  //   colors: [
  //     { colorName: "Red", hexValue: "#FF0000" },
  //     { colorName: "Green", hexValue: "#00FF00" },
  //   ],
  // },
];

function loadPaletteList(): Palette[] {
  if (typeof window === "undefined") return DEFAULT_PALETTE_LIST;
  try {
    const stored = window.localStorage.getItem(PALETTES_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Palette[]) : DEFAULT_PALETTE_LIST;
  } catch {
    return DEFAULT_PALETTE_LIST;
  }
}

function App() {
  const [paletteList, setPaletteList] = useState<Palette[]>(loadPaletteList);

  // Every change to paletteList (add/edit/delete/reorder/shade/restyle)
  // gets written straight to localStorage, so it survives an app restart.
  useEffect(() => {
    window.localStorage.setItem(PALETTES_STORAGE_KEY, JSON.stringify(paletteList));
  }, [paletteList]);

  return (
    <ThemeProvider>
      <SettingsProvider>
        <div className="w-screen h-screen flex flex-col">
          <TitleBar />
          <div className="flex-1 min-h-0">
            <Router>
              <Routes>
                <Route
                  path="/"
                  element={<CollectionPage paletteList={paletteList} setPaletteList={setPaletteList} />}
                />
                <Route
                  path="/palettes/:paletteIndex"
                  element={<PalettePage paletteList={paletteList} setPaletteList={setPaletteList} />}
                />
              </Routes>
            </Router>
          </div>
        </div>
      </SettingsProvider>
    </ThemeProvider>
  );
}

export default App;