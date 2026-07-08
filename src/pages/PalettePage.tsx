import type { Palette } from "../components/types";
import { useParams, useNavigate } from "react-router-dom";
import PixelOutline from "../components/PixelOutline";

  interface PalettePageProps {
    paletteList: Palette[];
  }
  
export default function PalettePage({ paletteList }: PalettePageProps) {

  const { paletteIndex } = useParams();
  const navigate = useNavigate();
  const palette = paletteList[Number(paletteIndex)];

  if (!palette) {
    return (
      <div className="px-2 py-2 bg-Secondary rounded-[2px] shadowCorner border-b-2 border-x-2 border-custom-black [corner-shape:notch] h-full flex flex-col items-center justify-center gap-3">
        <p>Palette not found.</p>
        <PixelOutline
          as="button"
          className="bg-Primary hover:-translate-y-0.5 active:translate-y-0.5 rounded-[2px] shadowCorner border-2 [corner-shape:notch] border-custom-black cursor-pointer py-1 px-3"
          onClick={() => navigate("/")}>
          Back
        </PixelOutline>
      </div>
    );
  }

  return (
    <div className="px-2 py-2 bg-Secondary rounded-[2px] shadowCorner border-2 border-custom-black [corner-shape:notch] h-full flex flex-col gap-2 justify-between">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <PixelOutline
            as="button"
            className="bg-Primary hover:-translate-y-0.5 active:translate-y-0.5 rounded-[2px] shadowCorner border-2 [corner-shape:notch] border-custom-black cursor-pointer py-1 px-3"
            onClick={() => navigate("/")}>
            Back
          </PixelOutline>
          <h1 className="text-lg font-DogicaPixelBold xs:block hidden">{palette.paletteName}</h1>
          <PixelOutline
            as="button"
            className="bg-Primary hover:-translate-y-0.5 active:translate-y-0.5 rounded-[2px] shadowCorner border-2 [corner-shape:notch] border-custom-black cursor-pointer py-1 px-3"
            onClick={() => navigate("/")}>
            Edit
          </PixelOutline>
        </div>

        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-6 gap-3">
          {palette.colors.map((color, colorIndex) => (
            <PixelOutline
              key={colorIndex}
              className="flex flex-col items-center gap-1 bg-Primary p-2 rounded-[2px] border-2 [corner-shape:notch] border-custom-black shadowCorner"
            >
              <PixelOutline
                className="w-12 h-12 border-2 border-custom-black rounded-[2px] [corner-shape:notch]"
                style={{ backgroundColor: color.hexValue }}
              />
              <span className="text-xs">{color.colorName}</span>
              <span className="text-xs opacity-70">{color.hexValue}</span>
            </PixelOutline>
          ))}
        </div>
      </div>
        <div className="grid grid-cols-2 gap-2">
          <PixelOutline
            as="button"
            className="bg-Primary hover:-translate-y-0.5 active:translate-y-0.5 rounded-[2px] shadowCorner border-2 [corner-shape:notch] border-custom-black cursor-pointer py-1 px-3 w-full h-full"
            onClick={() => navigate("/")}>
            Add Color
          </PixelOutline>
          <PixelOutline
            as="button"
            className="bg-Primary hover:-translate-y-0.5 active:translate-y-0.5 rounded-[2px] shadowCorner border-2 [corner-shape:notch] border-custom-black cursor-pointer py-1 px-3 w-full h-full"
            onClick={() => navigate("/")}>
             Color Picker
          </PixelOutline>
          <PixelOutline
            as="button"
            className="bg-Primary hover:-translate-y-0.5 active:translate-y-0.5 rounded-[2px] shadowCorner border-2 [corner-shape:notch] border-custom-black cursor-pointer py-1 px-3 w-full h-full"
            onClick={() => navigate("/")}>
            Shading
          </PixelOutline>
          <PixelOutline
            as="button"
            className="bg-Primary hover:-translate-y-0.5 active:translate-y-0.5 rounded-[2px] shadowCorner border-2 [corner-shape:notch] border-custom-black cursor-pointer py-1 px-3 w-full h-full"
            onClick={() => navigate("/")}>
             Change Style
          </PixelOutline>
        </div>
    </div>
  );
}