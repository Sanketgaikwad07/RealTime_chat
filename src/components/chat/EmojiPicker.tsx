import { useRef, useEffect, lazy, Suspense } from "react";

const Picker = lazy(() => import("@emoji-mart/react"));

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

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
    <div ref={ref} className="absolute bottom-full mb-2 right-0 z-50 shadow-xl rounded-xl overflow-hidden">
      <Suspense fallback={<div className="p-4 bg-card text-muted-foreground text-sm">Loading emojis...</div>}>
        <Picker
          onEmojiSelect={(emoji: any) => onSelect(emoji.native)}
          theme="auto"
          previewPosition="none"
          skinTonePosition="none"
          maxFrequentRows={2}
          perLine={8}
        />
      </Suspense>
    </div>
  );
};

export default EmojiPicker;
