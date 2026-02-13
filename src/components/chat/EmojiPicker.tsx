import { useRef, useEffect, useState } from "react";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const EMOJI_LIST = [
  "😀", "😂", "🥹", "😍", "🤩", "😎", "🥳", "😇",
  "🤔", "😅", "😊", "🙂", "😉", "😌", "😏", "🤗",
  "❤️", "🔥", "👍", "👎", "👏", "🙌", "✨", "💯",
  "😢", "😭", "😤", "🤯", "🫡", "🫶", "💀", "🤡",
  "🎉", "🎊", "🎈", "🥂", "☕", "🍕", "🌟", "⭐",
  "👋", "✌️", "🤞", "🤙", "💪", "🫂", "🙏", "💕",
];

const EmojiPicker = ({ onSelect, onClose }: EmojiPickerProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute bottom-full mb-2 right-0 z-50 shadow-xl rounded-xl overflow-hidden bg-card border border-border p-3 w-[280px]">
      <div className="grid grid-cols-8 gap-1">
        {EMOJI_LIST.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSelect(emoji)}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors text-lg leading-none"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};

export default EmojiPicker;
