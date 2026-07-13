import type { Palette } from "../components/types";
import type { Dispatch, SetStateAction } from "react";
import PixelOutline from "../components/PixelOutline";
import CreateNew from "../components/CreateNew";
import SettingsForm from "../components/SettingsForm";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";

interface CollectionPageProps {
  paletteList: Palette[];
  setPaletteList: Dispatch<SetStateAction<Palette[]>>;
}

export default function CollectionPage({ paletteList, setPaletteList }: CollectionPageProps) {
  const navigate = useNavigate();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingPaletteName, setEditingPaletteName] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [openSetting, setOpenSetting] = useState(false);

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
}, [paletteList]);

  const handleEditStart = (index: number) => {
    setEditingIndex(index);
    setEditingPaletteName(paletteList[index].paletteName);
  };

  const handleEditSave = (index: number) => {
    const trimmed = editingPaletteName.trim();
    if (trimmed) {
      setPaletteList((prev) => prev.map((p, i) => (i === index ? { ...p, paletteName: trimmed } : p)));
    }
    setEditingIndex(null);
  };

  const handleDelete = (index: number) => {
    setPaletteList((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  };

  const handleCreate = (name: string) => {
    setPaletteList((prev) => [...prev, { paletteName: name, colors: [] }]);
    setShowCreateModal(false);
  };

  return (
    <div className="px-2 gap-2 bg-Secondary rounded-[2px] shadowCorner border-b-2 border-x-2 border-custom-black [corner-shape:notch] flex flex-col items-center justify-start h-full w-full overflow-y-hidden overflow-x-hidden py-2 ">
        <div className="flex gap-2">
            <PixelOutline
                as="button"
                className="bg-Primary hover:-translate-y-0.5 active:translate-y-0.5 rounded-[2px] shadowCorner border-2 [corner-shape:notch] border-custom-black cursor-pointer flex items-center justify-center py-2 px-3 xs:px-4"
                onClick={() => setShowCreateModal(true)}>
                Create New
            </PixelOutline>
            <PixelOutline
                as="button"
                className="bg-Primary hover:-translate-y-0.5 active:translate-y-0.5 rounded-[2px] shadowCorner border-2 [corner-shape:notch] border-custom-black cursor-pointer flex items-center justify-center py-2 px-3 xs:px-4"
                onClick={() => console.log("Button clicked!")}>
                Generate Palette
            </PixelOutline>
        </div>
        <div 
            ref={scrollRef}
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-palette w-full">
          <div 
            className={`grid xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 grid-cols-1 gap-2 w-full ${hasOverflow ? "pr-2" : ""}`}>
              {paletteList.map((palette, index) => (
                <PixelOutline key={index} className="h-full flex flex-col justify-between gap-2 bg-Quaternary rounded-[2px] [corner-shape:notch] shadowCorner border-2 border-custom-black p-2">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-row items-center justify-between gap-2">
                      {editingIndex === index ? (
                        <>
                        <PixelOutline
                          as="input"
                          type="text"
                          autoFocus
                          className="outline-none bg-Secondary rounded-[2px] shadowCorner border-2 border-custom-black [corner-shape:notch] py-2 px-1 w-full"
                          value={editingPaletteName}
                          onChange={(e) => setEditingPaletteName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleEditSave(index)}
                        />
                        <PixelOutline className="w-8 h-8 bg-Primary hover:-translate-y-0.5 active:translate-y-0.5 rounded-[2px] shadowCorner border-2 [corner-shape:notch] border-custom-black cursor-pointer  flex items-center justify-center p-1"
                          onClick={() => handleEditSave(index)}>
                          <img src="/svg/iconSave.svg" />
                        </PixelOutline>
                        </>
                      ) : (
                        <>
                        <h2 className="break-all">{palette.paletteName}</h2>
                        <div className="flex gap-2">
                          <PixelOutline className="w-8 h-8 bg-Primary hover:-translate-y-0.5 active:translate-y-0.5 rounded-[2px] shadowCorner border-2 [corner-shape:notch] border-custom-black cursor-pointerflex items-center justify-center p-1"
                            onClick={() => handleEditStart(index)}>
                            <img src="/svg/iconEdit.svg" />
                          </PixelOutline>
                          <PixelOutline className="w-8 h-8 bg-Tertiary hover:-translate-y-0.5 active:translate-y-0.5 rounded-[2px] shadowCorner border-2 [corner-shape:notch] border-custom-black cursor-pointer flex items-center justify-center p-1"
                            onClick={() => handleDelete(index)}>
                            <img src="/svg/iconDelete.svg" />
                          </PixelOutline>
                        </div>
                        </>
                      )}
                    </div>
                    <div   
                      className="grid gap-2"
                      style={{
                        gridTemplateColumns: "repeat(auto-fill, minmax(24px, 24px))",
                      }}>
                      {palette.colors.map((color, colorIndex) => (
                          <PixelOutline
                            className="min-w-6 w-full h-6 border-2 border-custom-black rounded-[2px] [corner-shape:notch]"
                            style={{ backgroundColor: color.hexValue }}
                            key={colorIndex}
                          />
                      ))}
                    </div>
                  </div>
                  <PixelOutline className=" hover:-translate-y-0.5 active:translate-y-0.5 rounded-[2px] shadowCorner border-2 [corner-shape:notch] border-custom-black cursor-pointer bg-Secondary flex items-center justify-center py-1 px-2"
                    onClick={() => navigate(`/palettes/${index}`)}>
                    Open
                  </PixelOutline>
                </PixelOutline>
              ))}
          </div>
        </div>
        <div className="flex justify-end flex-shrink-0 w-full">
          <PixelOutline className="w-8 h-8 bg-Primary hover:-translate-y-0.5 active:translate-y-0.5 rounded-[2px] shadowCorner border-2 [corner-shape:notch] border-custom-black cursor-pointer flex items-center justify-center p-1"
            onClick={() => setOpenSetting(true)}>
            <img src="/svg/iconSetting.svg" />
          </PixelOutline>
        </div>
        {openSetting && (
          <SettingsForm onClose={() => setOpenSetting(false)}></SettingsForm>
        )}
        {showCreateModal && (
          <CreateNew onConfirm={handleCreate} onCancel={() => setShowCreateModal(false)} />
        )}
    </div>
  );
}