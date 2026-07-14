import { getCurrentWindow } from "@tauri-apps/api/window";
import { useState } from "react";
import PixelOutline from "./PixelOutline";

const appWindow = getCurrentWindow();

export default function TitleBar() {
  const [pinned, setPinned] = useState(false);

    const togglePin = async () => {
        const newState = !pinned;

        await appWindow.setAlwaysOnTop(newState);

        setPinned(newState);
    };


  return (
    <div
      data-tauri-drag-region
      className="z-85 w-full rounded-[2px] shadowCorner border-2 border-custom-black [corner-shape:notch] h-10 bg-Tertiary flex flex-row items-center justify-between px-2"
    >
      <div className="pointer-events-none flex flex-row items-center gap-2 flex-1 min-w-0">
        <img src="/img/iconFP.png" className="w-6 h-6 shrink-0"/>
        <span className="whitespace-nowrap truncate w-full">FloatingPalette</span>
      </div>
      <div className="flex gap-2">
        <PixelOutline  
        as="button"
        className="hover:bg-Secondary-Dark hover:-translate-y-0.5 active:translate-y-0.5 rounded-[2px] shadowCorner border-2 [corner-shape:notch] border-custom-black cursor-pointer w-6 h-6 bg-Secondary flex items-center justify-center"
        onClick={togglePin}>
            
          <img
            src={pinned ? "/svg/iconPinned.svg" : "/svg/iconPin.svg"}
            className="p-0.5"
          />
        </PixelOutline>

        <PixelOutline 
        as="button"
        className="hover:bg-Secondary-Dark hover:-translate-y-0.5 active:translate-y-0.5 rounded-[2px] shadowCorner border-2 [corner-shape:notch] border-custom-black cursor-pointer w-6 h-6 bg-Secondary flex items-center justify-center"
        onClick={() => appWindow.minimize()}>
          -
        </PixelOutline>

        <PixelOutline  
        as="button"
        className="hover:bg-Tertiary hover:-translate-y-0.5 active:translate-y-0.5 rounded-[2px] shadowCorner border-2 [corner-shape:notch] border-custom-black cursor-pointer w-6 h-6 bg-Secondary flex items-center justify-center"
        onClick={() => appWindow.close()}>
          X
        </PixelOutline>
      </div>
    </div>
  );
}