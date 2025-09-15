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
            fontFamily: flashcard.frontFont || "Inter",
            background: flashcard.frontCustomGradient || undefined,
          }}
        >
          <div className="text-center space-y-4">
            {flashcard.frontImage && (
              <ImageModal
                src={flashcard.frontImage}
                alt="Front image"
                className="max-w-full max-h-20 object-contain rounded-lg"
              />
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
            fontFamily: flashcard.backFont || "Inter",
            background: flashcard.backCustomGradient || undefined,
          }}
        >
          <div className="text-center space-y-4">
            {flashcard.backImage && (
              <ImageModal
                src={flashcard.backImage}
                alt="Back image"
                className="max-w-full max-h-20 object-contain rounded-lg"
              />
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
