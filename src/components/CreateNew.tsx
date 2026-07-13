import { useState } from "react";
import ClickOutside from "./ClickOutside";

interface CreateNewProps {
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

const CreateNew = ({ onConfirm, onCancel }: CreateNewProps) => {
  const [name, setName] = useState("");

  const handleCreate = () => {
    const trimmed = name.trim();
    onConfirm(trimmed || "My Pallete");
  };

  return (
    <div className="fixed inset-0  z-80 backdrop-blur-xs flex items-center justify-center p-4 animate-popUp">
      <ClickOutside
        className="animate-popUp border-Primary-4 border-2 border-custom-black shadowCorner bg-Primary rounded-[2px] shadow-lg max-w-sm w-full [corner-shape:notch] flex flex-col h-fit "
        onOutsideClick={onCancel}>
        <div className="px-2">
            <div className="flex flex-row justify-start items-center h-full p-3 gap-3">
            <img src="/svg/iconAdd.svg" className="w-8 h-8" />
            <h3 className="text-lg">
                Create New Palette
            </h3>
            </div>
            <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Enter Palette Name ..."
            className="outline-none bg-Secondary rounded-[2px] shadowCorner border-2 border-custom-black [corner-shape:notch] py-2 px-1 w-full"
            />
        </div>
        <div className="flex justify-end gap-2 mt-4 border-t-3 border-t-Primary-3 p-2 shadowCorner">
          <button
            className="shadowCorner py-1 px-3 rounded-[2px] border-2 border-custom-black bg-Tertiary [corner-shape:notch] cursor-pointer hover:-translate-y-0.5 active:translate-y-0.5"
            onClick={onCancel}>
            Cancel
          </button>
          <button
            className="shadowCorner py-1 px-3 rounded-[2px] border-2 border-custom-black bg-custom-green [corner-shape:notch] cursor-pointer hover:-translate-y-0.5 active:translate-y-0.5"
            onClick={handleCreate}>
            Create
          </button>
        </div>
      </ClickOutside>
    </div>
  );
};

export default CreateNew;