import { useMemo, useState } from "react";
import ClickOutside from "./ClickOutside";
import paletteData from "./paletteColors.json";

interface PaletteColor {
  id: string;
  name: string;
  hex: string;
  colorTags: string[];
  typeTags: string[];
}

interface GeneratedColor {
  name: string;
  hexValue: string;
}

interface GenerateFormProps {
  onConfirm: (paletteName: string, colors: GeneratedColor[]) => void;
  onCancel: () => void;
}

const ALL_COLORS = paletteData as PaletteColor[];

const COLOR_TAGS = Array.from(
  new Set(ALL_COLORS.flatMap((c) => c.colorTags))
).sort();

const TYPE_TAGS = Array.from(
  new Set(ALL_COLORS.flatMap((c) => c.typeTags))
).sort();

const GENERATE_COUNT = 4;

const pickRandom = (pool: PaletteColor[], count: number): PaletteColor[] => {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

const GenerateForm = ({ onConfirm, onCancel }: GenerateFormProps) => {
  const [paletteName, setPaletteName] = useState("");
  const [selectedColorTags, setSelectedColorTags] = useState<string[]>([]);
  const [selectedTypeTags, setSelectedTypeTags] = useState<string[]>([]);
  const [preview, setPreview] = useState<PaletteColor[]>([]);

  const toggleTag = (
    tag: string,
    selected: string[],
    setSelected: (tags: string[]) => void
  ) => {
    setSelected(
      selected.includes(tag)
        ? selected.filter((t) => t !== tag)
        : [...selected, tag]
    );
  };

  const matches = useMemo(() => {
    const selectedTags = [...selectedColorTags, ...selectedTypeTags];
    if (selectedTags.length === 0) return ALL_COLORS;
    return ALL_COLORS.filter((c) =>
      [...c.colorTags, ...c.typeTags].some((tag) => selectedTags.includes(tag))
    );
  }, [selectedColorTags, selectedTypeTags]);

  const handleGenerate = () => {
    if (matches.length === 0) return;
    setPreview(pickRandom(matches, GENERATE_COUNT));
  };

  const handleConfirm = () => {
    if (preview.length === 0) return;
    const trimmed = paletteName.trim();
    onConfirm(
      trimmed || "Generated Palette",
      preview.map((c) => ({ name: c.name, hexValue: c.hex }))
    );
  };

  const renderTagGroup = (
    label: string,
    tags: string[],
    selected: string[],
    setSelected: (tags: string[]) => void
  ) => (
    <div className="flex flex-col gap-1">
      <span className="text-sm opacity-70">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => {
          const active = selected.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag, selected, setSelected)}
              className={`shadowCorner text-sm py-1 px-2 rounded-[2px] border-2 border-custom-black [corner-shape:notch] cursor-pointer hover:-translate-y-0.5 active:translate-y-0.5 ${
                active ? "bg-custom-green" : "bg-Secondary"
              }`}>
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-80 backdrop-blur-xs flex items-center justify-center p-4 animate-popUp">
      <ClickOutside
        className="animate-popUp border-Primary-4 border-2 border-custom-black shadowCorner bg-Primary rounded-[2px] shadow-lg max-w-md w-full [corner-shape:notch] flex flex-col h-fit max-h-[85vh]"
        onOutsideClick={onCancel}>
        <div className="flex flex-row justify-start items-center h-full p-3 gap-3">
          <img src="/svg/iconAdd.svg" className="w-8 h-8" />
          <h3 className="text-lg">Generate Palette</h3>
        </div>

        <div className="px-3 flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto py-2">
          <input
            type="text"
            value={paletteName}
            onChange={(e) => setPaletteName(e.target.value)}
            placeholder="Enter Palette Name ..."
            className="outline-none bg-Secondary rounded-[2px] shadowCorner border-2 border-custom-black [corner-shape:notch] py-2 px-1 w-full"
          />
          {renderTagGroup("Color", COLOR_TAGS, selectedColorTags, setSelectedColorTags)}
          {renderTagGroup("Type", TYPE_TAGS, selectedTypeTags, setSelectedTypeTags)}

          <div className="flex xs:flex-row flex-col-reverse gap-2 justify-between items-center">
            <span className="text-sm opacity-70">
              {matches.length} color{matches.length === 1 ? "" : "s"} match
            </span>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={matches.length === 0}
              className="shadowCorner py-1 px-3 rounded-[2px] border-2 border-custom-black bg-Tertiary [corner-shape:notch] cursor-pointer hover:-translate-y-0.5 active:translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed">
              {preview.length > 0 ? "Reshuffle" : "Generate"}
            </button>
          </div>

          {preview.length > 0 && (
            <div className="grid grid-cols-2 xs:grid-cols-4 gap-2 pb-2">
              {preview.map((c) => (
                <div key={c.id} className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className="w-full aspect-square rounded-[2px] border-2 border-custom-black shadowCorner [corner-shape:notch]"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span className="text-xs text-center break-words xs:block hidden">{c.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex xs:justify-end justify-center gap-2 border-t-3 border-t-Primary-3 p-2 shadowCorner">
          <button
            className="shadowCorner py-1 px-3 rounded-[2px] border-2 border-custom-black bg-Tertiary [corner-shape:notch] cursor-pointer hover:-translate-y-0.5 active:translate-y-0.5"
            onClick={onCancel}>
            Cancel
          </button>
          <button
            disabled={preview.length === 0}
            className="shadowCorner py-1 px-3 rounded-[2px] border-2 border-custom-black bg-custom-green [corner-shape:notch] cursor-pointer hover:-translate-y-0.5 active:translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={handleConfirm}>
            Create
          </button>
        </div>
      </ClickOutside>
    </div>
  );
};

export default GenerateForm;