import * as React from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Image, X } from "lucide-react";

interface ImageModalProps {
  src: string;
  alt: string;
  className?: string;
  iconOnly?: boolean;
}

export function ImageModal({ src, alt, className, iconOnly = false }: ImageModalProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {iconOnly ? (
          <Image className={cn("cursor-pointer hover:opacity-80 transition-opacity", className)} />
        ) : (
          <img
            src={src}
            alt={alt}
            className={cn("cursor-pointer hover:opacity-80 transition-opacity", className)}
            onClick={() => setIsOpen(true)}
          />
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
          <img
            src={src}
            alt={alt}
            className="w-full h-auto max-h-[90vh] object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}