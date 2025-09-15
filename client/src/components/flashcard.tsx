import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Flashcard } from "@shared/schema";
import { AudioPlayer } from "./audio-player";
import { ImageModal } from "./image-modal";

interface FlashcardProps {
  flashcard: Flashcard;
  isFlipped?: boolean;
  onFlip?: () => void;
  className?: string;
}

const gradientClasses = {
  "gradient-1": "bg-gradient-to-br from-indigo-500 to-purple-600",
  "gradient-2": "bg-gradient-to-br from-pink-500 to-red-500",
  "gradient-3": "bg-gradient-to-br from-blue-500 to-cyan-500",
  "gradient-4": "bg-gradient-to-br from-green-500 to-teal-500",
  "gradient-5": "bg-gradient-to-br from-yellow-500 to-orange-500",
  "solid-dark": "bg-gray-800",
};

export function Flashcard({ flashcard, isFlipped = false, onFlip, className }: FlashcardProps) {
  // Ensure custom fonts are loaded and applied
  React.useEffect(() => {
    const loadCustomFonts = async () => {
      const fonts = [flashcard.frontFont, flashcard.backFont];
      for (const fontName of fonts) {
        if (fontName && !['Inter', 'Georgia', 'Courier New', 'Arial', 'Times New Roman'].includes(fontName)) {
          // This is likely a custom font, wait for it to load
          try {
            await document.fonts.load(`12px "${fontName}"`);
            console.log('Custom font loaded in flashcard:', fontName);
          } catch (error) {
            console.warn('Failed to load custom font in flashcard:', fontName, error);
          }
        }
      }
    };
    loadCustomFonts();
  }, [flashcard.frontFont, flashcard.backFont]);

  return (
    <div
      className={cn("relative w-full h-52 cursor-pointer", className)}
      style={{ perspective: "1000px" }}
      onClick={onFlip}
      data-testid="flashcard"
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      >
        {/* Front Side */}
        <div
          className={cn(
            "absolute inset-0 w-full h-full rounded-xl flex flex-col items-center justify-center p-6 text-white shadow-lg",
            flashcard.frontCustomGradient ? "" : (gradientClasses[flashcard.frontGradient as keyof typeof gradientClasses] || gradientClasses["gradient-1"])
          )}
          style={{
            backfaceVisibility: "hidden",
            fontFamily: `"${flashcard.frontFont || "Inter"}", Inter, system-ui, sans-serif`,
            background: flashcard.frontCustomGradient || undefined,
          }}
        >
          <div className="text-center space-y-4">
            {flashcard.frontImage && (
              <div className="flex justify-center">
                <ImageModal
                  src={flashcard.frontImage}
                  alt="Front image"
                  className="w-8 h-8 text-white opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                  iconOnly={true}
                />
              </div>
            )}
            <p className="font-medium text-lg leading-relaxed">
              {flashcard.frontText}
            </p>
            {flashcard.frontAudio && (
              <AudioPlayer src={flashcard.frontAudio} />
            )}
          </div>
        </div>

        {/* Back Side */}
        <div
          className={cn(
            "absolute inset-0 w-full h-full rounded-xl flex flex-col items-center justify-center p-6 text-white shadow-lg",
            flashcard.backCustomGradient ? "" : (gradientClasses[flashcard.backGradient as keyof typeof gradientClasses] || gradientClasses["gradient-2"])
          )}
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            fontFamily: `"${flashcard.backFont || "Inter"}", Inter, system-ui, sans-serif`,
            background: flashcard.backCustomGradient || undefined,
          }}
        >
          <div className="text-center space-y-4">
            {flashcard.backImage && (
              <div className="flex justify-center">
                <ImageModal
                  src={flashcard.backImage}
                  alt="Back image"
                  className="w-8 h-8 text-white opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                  iconOnly={true}
                />
              </div>
            )}
            <p className="font-medium text-lg leading-relaxed">
              {flashcard.backText}
            </p>
            {flashcard.backAudio && (
              <AudioPlayer src={flashcard.backAudio} />
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
