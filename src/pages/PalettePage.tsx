import type { Palette } from "../components/types";
import type { Dispatch, SetStateAction } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PixelOutline from "../components/PixelOutline";
import ColorForm from "../components/ColorForm";
import ShadingForm from "../components/ShadingForm";
import StyleForm from "../components/StyleForm";
import { useRef, useState, useEffect } from "react";
import { useSettings, formatColorForCopy } from "../contexts/SettingsContext";

interface PalettePageProps {
  paletteList: Palette[];
  setPaletteList: Dispatch<SetStateAction<Palette[]>>;
}

export default function PalettePage({ paletteList, setPaletteList }: PalettePageProps) {
  const { copyFormat, showHexInPalette } = useSettings();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [addColor, setAddColor] = useState(false);
  const [colorPick, setColorPick] = useState(false);
  const [changeStyle, setChangeStyle] = useState(false);
  const [styleFormOpen, setStyleFormOpen] = useState(false);
  const [colorShading, setColorShading] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [editingColorIndex, setEditingColorIndex] = useState<number | null>(null);
  const [selectShadingIndex, setSelectShadingIndex] = useState<number | null>(null);
  const dragIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollSpeed = useRef(0);
  const autoScrollFrame = useRef<number | null>(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  const { paletteIndex } = useParams();
  const navigate = useNavigate();
  const index = Number(paletteIndex);
  const palette = paletteList[index];

  const updateColors = (updater: (colors: Palette["colors"]) => Palette["colors"]) => {
    setPaletteList((prev) =>
      prev.map((p, i) => (i === index ? { ...p, colors: updater(p.colors) } : p))
    );
  };

  const handleCopyColor = (hex: string, colorIndex: number) => {
    if (colorShading || changeStyle) return;
    navigator.clipboard.writeText(formatColorForCopy(hex, copyFormat));
    setCopiedIndex(colorIndex);
    setTimeout(() => setCopiedIndex((cur) => (cur === colorIndex ? null : cur)), 1200);
  };

  const toggleSelectMode = () => {
    setSelectMode((prev) => !prev);
    setSelectedIndices(new Set());
  };

  const toggleColorShading = () => {
    setColorShading((prev) => !prev);
    setSelectedIndices(new Set());
    setSelectShadingIndex(null);
  };

  const toggleChangeStyle = () => {
    setChangeStyle((prev) => !prev);
    setSelectedIndices(new Set());
    setStyleFormOpen(false);
  };

  // Closes just the ShadingForm modal — stays in "colorShading" mode so the
  // user can keep picking more colors to shade until they hit Done.
  const handleAddShadingColors = (colors: Palette["colors"]) => {
    updateColors((cs) => [...cs, ...colors]);
    setSelectShadingIndex(null);
  };

  // Applies the style to every selected color at once, then clears the
  // selection (staying in "changeStyle" mode so the user can select and
  // style another batch right after).
  const handleAddStyledColors = (colors: Palette["colors"]) => {
    updateColors((cs) => [...cs, ...colors]);
    setStyleFormOpen(false);
    setSelectedIndices(new Set());
  };

  const openStyleForm = () => {
    if (selectedIndices.size === 0) return;
    setStyleFormOpen(true);
  };

  const toggleSelectAll = () => {
    setSelectedIndices((prev) => {
      const allSelected = prev.size === palette.colors.length;
      if (allSelected) return new Set();
      return new Set(palette.colors.map((_, i) => i));
    });
  };

  const toggleSelectColor = (colorIndex: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      next.has(colorIndex) ? next.delete(colorIndex) : next.add(colorIndex);
      return next;
    });
  };

  const handleDeleteSelected = () => {
    updateColors((colors) => colors.filter((_, i) => !selectedIndices.has(i)));
    setSelectedIndices(new Set());
  };

  const handleEditColorConfirm = (name: string, hex: string) => {
    if (editingColorIndex === null) return;
    const colorIndex = editingColorIndex;
    updateColors((colors) =>
      colors.map((c, i) => (i === colorIndex ? { ...c, colorName: name, hexValue: hex } : c))
    );
    setEditingColorIndex(null);
  };

  const handleAddColorConfirm = (name: string, hex: string) => {
    updateColors((colors) => [...colors, { colorName: name, hexValue: hex }]);
    setAddColor(false);
    setColorPick(false);
  };

  const handleDragStart = (e: React.DragEvent, colorIndex: number) => {
    dragIndex.current = colorIndex;
    e.dataTransfer.setData("text/plain", String(colorIndex));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, colorIndex: number) => {
    e.preventDefault();
    setDragOverIndex(colorIndex);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    stopAutoScroll();
    const from = dragIndex.current;
    if (from === null || from === dropIndex) {
      dragIndex.current = null;
      setDragOverIndex(null);
      return;
    }
    updateColors((colors) => {
      const next = [...colors];
      const [moved] = next.splice(from, 1);
      next.splice(dropIndex, 0, moved);
      return next;
    });
    dragIndex.current = null;
    setDragOverIndex(null);
  };

  const stopAutoScroll = () => {
  if (autoScrollFrame.current !== null) {
    cancelAnimationFrame(autoScrollFrame.current);
    autoScrollFrame.current = null;
  }
  autoScrollSpeed.current = 0;
};

const startAutoScroll = () => {
  if (autoScrollFrame.current !== null) return;
  const step = () => {
    const el = scrollRef.current;
    if (el && autoScrollSpeed.current !== 0) {
      el.scrollTop += autoScrollSpeed.current;
      autoScrollFrame.current = requestAnimationFrame(step);
    } else {
      autoScrollFrame.current = null;
    }
  };
  autoScrollFrame.current = requestAnimationFrame(step);
};

const handleContainerDragOver = (e: React.DragEvent) => {
  const el = scrollRef.current;
  if (!el || !hasOverflow) return;

  const rect = el.getBoundingClientRect();
  const threshold = 60; // px from edge that triggers scrolling
  const maxSpeed = 14;

  let speed = 0;
  if (e.clientY < rect.top + threshold) {
    speed = -maxSpeed * ((rect.top + threshold - e.clientY) / threshold);
  } else if (e.clientY > rect.bottom - threshold) {
    speed = maxSpeed * ((e.clientY - (rect.bottom - threshold)) / threshold);
  }

  autoScrollSpeed.current = speed;
  if (speed !== 0) startAutoScroll();
};

useEffect(() => {
  window.addEventListener("dragend", stopAutoScroll);
  return () => window.removeEventListener("dragend", stopAutoScroll);
}, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const checkOverflow = () => {
      setHasOverflow(el.scrollHeight > el.clientHeight);
    };

    checkOverflow();

    const observer = new ResizeObserver(checkOverflow);
    observer.observe(el);

    return () => observer.disconnect();
  }, [palette.colors.length]);

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

  // Either "pick colors to shade" or "pick colors to restyle" mode —
  // both hide the normal top bar and swap the grid's click behavior.
  const inPickerMode = colorShading || changeStyle || selectMode;

  return (
    <div className="px-2 py-2 bg-Secondary rounded-[2px] shadowCorner border-2 border-custom-black [corner-shape:notch] h-full flex flex-col gap-2">
      <div className="flex flex-col gap-2 flex-1 min-h-0">
        <div className={`flex items-center ${inPickerMode ? "justify-center" : "justify-between"}`}>
          {!inPickerMode && (
            <PixelOutline
              as="button"
              className="bg-Primary hover:-translate-y-0.5 active:translate-y-0.5 rounded-[2px] shadowCorner border-2 [corner-shape:notch] border-custom-black cursor-pointer py-1 px-3"
              onClick={() => navigate("/")}>
              Back
            </PixelOutline>
          )}
          <h1 className={`text-lg font-DogicaPixelBold text-center xs:block ${inPickerMode ? "block" : "hidden"}`}>
            {colorShading
              ? "Pick a color to Shade"
              : changeStyle
              ? `Select colors to Restyle`
              : selectMode
              ? `Editing ${palette.paletteName}`
              : palette.paletteName}
          </h1>
          {!inPickerMode && (
            <PixelOutline
              as="button"
              className="bg-Primary hover:-translate-y-0.5 active:translate-y-0.5 rounded-[2px] shadowCorner border-2 [corner-shape:notch] border-custom-black cursor-pointer py-1 px-3"
              onClick={toggleSelectMode}>
              Edit
            </PixelOutline>
          )}
        </div>
        {(changeStyle || selectMode) && (
          <PixelOutline
            as="button"
            className="bg-Primary hover:-translate-y-0.5 active:translate-y-0.5 rounded-[2px] shadowCorner border-2 [corner-shape:notch] border-custom-black cursor-pointer py-1 px-3 w-full h-full"
            onClick={toggleSelectAll}>
            Select All
          </PixelOutline>
        )}
        {palette.colors.length == 0 ? (
          <span className="flex-1 flex justify-center items-center h-full">Empty Palette</span>
        ):(
        <div
          ref={scrollRef}
          onDragOver={handleContainerDragOver}
          className={`py-1 grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-6 gap-3 overflow-y-auto scrollbar-palette ${hasOverflow ? "pr-2" : ""}`}>
          {palette.colors.map((color, colorIndex) => {
            const isSelected = selectedIndices.has(colorIndex);
            return (
              <PixelOutline
                as="div"
                role="button"
                tabIndex={0}
                draggable
                onDragStart={(e: React.DragEvent<HTMLDivElement>) => handleDragStart(e, colorIndex)}
                onDragOver={(e: React.DragEvent<HTMLDivElement>) => handleDragOver(e, colorIndex)}
                onDrop={(e: React.DragEvent<HTMLDivElement>) => handleDrop(e, colorIndex)}
                onClick={() => {
                  if (selectMode) {
                    toggleSelectColor(colorIndex);
                  } else if (colorShading) {
                    setSelectShadingIndex(colorIndex);
                  } else if (changeStyle) {
                    toggleSelectColor(colorIndex);
                  } else {
                    handleCopyColor(color.hexValue, colorIndex);
                  }
                }}
                key={colorIndex}
                className={` hover:-translate-y-0.5 active:translate-y-0.5 flex flex-col w-full h-full items-center gap-1 p-2 rounded-[2px] border-2 [corner-shape:notch] border-custom-black shadowCorner transition-colors
                  ${isSelected ? "bg-Primary" : "bg-Quaternary"}
                  ${selectMode || changeStyle ? "cursor-grab active:cursor-grabbing" : " cursor-pointer"}
                  ${dragOverIndex === colorIndex ? "outline-1.5 outline-dashed outline-Tertiary" : ""}`}
              >
                <div className="flex flex-row gap-2">
                  <PixelOutline
                    className="w-12 h-12 border-2 border-custom-black rounded-[2px] [corner-shape:notch]"
                    style={{ backgroundColor: color.hexValue }}
                  />
                  {selectMode && (
                    <PixelOutline
                      className="w-8 h-8 bg-Primary hover:-translate-y-0.5 active:translate-y-0.5 rounded-[2px] shadowCorner border-2 [corner-shape:notch] border-custom-black cursor-pointer bg-Secondary flex items-center justify-center p-1"
                      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                        e.stopPropagation();
                        setEditingColorIndex(colorIndex);
                      }}>
                      <img src="/svg/iconEdit.svg" />
                    </PixelOutline>
                  )}
                </div>
                <span className="text-xs truncate w-full text-center">{color.colorName}</span>
                {showHexInPalette && (
                  <span className="text-xs opacity-70">
                    {copiedIndex === colorIndex ? "Copied!" : color.hexValue}
                  </span>
                )}
              </PixelOutline>
            );
          })}
        </div>
        )}
      </div>
      <div className="flex-shrink-0">
        {selectMode || inPickerMode ? (
          <>
            {selectMode && (
              <div className="grid grid-cols-2 gap-2">
                <PixelOutline
                  as="button"
                  className="bg-Primary hover:-translate-y-0.5 active:translate-y-0.5 rounded-[2px] shadowCorner border-2 [corner-shape:notch] border-custom-black cursor-pointer py-1 px-3 w-full h-full "
                  onClick={toggleSelectMode}>
                  Done
                </PixelOutline>
                <PixelOutline
                  as="button"
                  disabled={selectedIndices.size === 0}
                  className="bg-Tertiary hover:-translate-y-0.5 active:translate-y-0.5 rounded-[2px] shadowCorner border-2 [corner-shape:notch] border-custom-black cursor-pointer py-1 px-3 w-full h-full disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleDeleteSelected}>
                  Delete All
                </PixelOutline>
              </div>
            )}
            {colorShading && (
              <PixelOutline
                as="button"
                className="bg-Primary hover:-translate-y-0.5 active:translate-y-0.5 rounded-[2px] shadowCorner border-2 [corner-shape:notch] border-custom-black cursor-pointer py-1 px-3 w-full h-full "
                onClick={toggleColorShading}>
                Done
              </PixelOutline>
            )}
            {changeStyle && (
              <div className="grid grid-cols-2 gap-2">
                <PixelOutline
                  as="button"
                  className="bg-Primary hover:-translate-y-0.5 active:translate-y-0.5 rounded-[2px] shadowCorner border-2 [corner-shape:notch] border-custom-black cursor-pointer py-1 px-3 w-full h-full "
                  onClick={toggleChangeStyle}>
                  Done
                </PixelOutline>
                <PixelOutline
                  as="button"
                  disabled={selectedIndices.size === 0}
                  className="bg-custom-green hover:-translate-y-0.5 active:translate-y-0.5 rounded-[2px] shadowCorner border-2 [corner-shape:notch] border-custom-black cursor-pointer py-1 px-3 w-full h-full disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={openStyleForm}>
                  Restyle ({selectedIndices.size})
                </PixelOutline>
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-2 gap-2 ">
            <PixelOutline
              onClick={() => setAddColor(true)}
              as="button" className="bg-Primary hover:-translate-y-0.5 active:translate-y-0.5 rounded-[2px] shadowCorner border-2 [corner-shape:notch] border-custom-black cursor-pointer py-1 px-3 w-full h-full">
              Add Color
            </PixelOutline>
            <PixelOutline
              onClick={() => setColorPick(true)}
              as="button" className="bg-Primary hover:-translate-y-0.5 active:translate-y-0.5 rounded-[2px] shadowCorner border-2 [corner-shape:notch] border-custom-black cursor-pointer py-1 px-3 w-full h-full">
              Color Picker
            </PixelOutline>
            <PixelOutline
              onClick={toggleColorShading}
              as="button" className="bg-Primary hover:-translate-y-0.5 active:translate-y-0.5 rounded-[2px] shadowCorner border-2 [corner-shape:notch] border-custom-black cursor-pointer py-1 px-3 w-full h-full">
              Shading
            </PixelOutline>
            <PixelOutline
              onClick={toggleChangeStyle}
              as="button" className="bg-Primary hover:-translate-y-0.5 active:translate-y-0.5 rounded-[2px] shadowCorner border-2 [corner-shape:notch] border-custom-black cursor-pointer py-1 px-3 w-full h-full">
              Change Style
            </PixelOutline>
          </div>
        )}
      </div>

      {editingColorIndex !== null && (
        <ColorForm
          key={`edit-${editingColorIndex}`}
          mode="edit"
          initialName={palette.colors[editingColorIndex].colorName}
          initialHex={palette.colors[editingColorIndex].hexValue}
          onConfirm={handleEditColorConfirm}
          onCancel={() => setEditingColorIndex(null)}
        />
      )}
      {addColor && (
        <ColorForm
          mode="add"
          onConfirm={handleAddColorConfirm}
          onCancel={() => setAddColor(false)}
        />
      )}
      {colorPick && (
        <ColorForm
          mode="pick"
          onConfirm={handleAddColorConfirm}
          onCancel={() => setColorPick(false)}
        />
      )}
      {selectShadingIndex !== null && (
        <ShadingForm
          key={`shading-${selectShadingIndex}`}
          selectedColor={palette.colors[selectShadingIndex]}
          onConfirm={handleAddShadingColors}
          onCancel={() => setSelectShadingIndex(null)}
        />
      )}
      {styleFormOpen && (
        <StyleForm
          selectedColors={Array.from(selectedIndices).map((i) => palette.colors[i])}
          onConfirm={handleAddStyledColors}
          onCancel={() => setStyleFormOpen(false)}
        />
      )}
    </div>
  );
}