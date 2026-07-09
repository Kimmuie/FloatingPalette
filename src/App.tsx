import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import TitleBar from "./components/TitleBar";
import CollectionPage from "./pages/CollectionPage";
import PalettePage from "./pages/PalettePage";
import type { Palette } from "./components/types";

const initialPaletteList: Palette[] = [
  { paletteName: "My Palette", colors: [{ colorName: "Red", hexValue: "#FF0000" }, { colorName: "Green", hexValue: "#00FF00" }] },
];

function App() {
  const [paletteList, setPaletteList] = useState<Palette[]>(initialPaletteList);

  return (
    <>
    <div className="w-screen h-screen flex flex-col">
      <TitleBar />
      <Router>
        <Routes>
          <Route path="/" element={<CollectionPage paletteList={paletteList} setPaletteList={setPaletteList} />} />
          <Route path="/palettes/:paletteIndex" element={<PalettePage paletteList={paletteList} setPaletteList={setPaletteList}/>} />
        </Routes>
      </Router>
    </div>
    </>
  );
}

export default App;