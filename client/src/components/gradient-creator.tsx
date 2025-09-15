import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Palette, Plus } from "lucide-react";

interface GradientCreatorProps {
  onGradientCreate: (gradient: string) => void;
}

export function GradientCreator({ onGradientCreate }: GradientCreatorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [colors, setColors] = React.useState<string[]>(["#667eea", "#764ba2"]);
  const [direction, setDirection] = React.useState("135deg");

  const directionOptions = [
    { value: "135deg", label: "Diagonal ↘" },
    { value: "90deg", label: "Vertical ↓" },
    { value: "45deg", label: "Diagonal ↗" },
    { value: "0deg", label: "Horizontal →" },
    { value: "180deg", label: "Horizontal ←" },
    { value: "270deg", label: "Vertical ↑" },
  ];

  const addColor = () => {
    if (colors.length < 3) {
      setColors([...colors, "#000000"]);
    }
  };

  const removeColor = (index: number) => {
    if (colors.length > 2) {
      setColors(colors.filter((_, i) => i !== index));
    }
  };

  const updateColor = (index: number, color: string) => {
    const newColors = [...colors];
    newColors[index] = color;
    setColors(newColors);
  };

  const generateGradient = () => {
    const colorStops = colors.map((color, index) => {
      const percentage = index === 0 ? 0 : index === colors.length - 1 ? 100 : (index / (colors.length - 1)) * 100;
      return `${color} ${percentage}%`;
    }).join(", ");
    
    return `linear-gradient(${direction}, ${colorStops})`;
  };

  const handleCreate = () => {
    const gradientStyle = generateGradient();
    onGradientCreate(gradientStyle);
    setIsOpen(false);
  };

  const previewStyle = {
    background: generateGradient(),
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full h-10">
          <Palette className="w-4 h-4 mr-2" />
          Créer dégradé
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Créer un dégradé personnalisé</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Preview */}
          <div className="space-y-2">
            <Label>Aperçu</Label>
            <div 
              className="w-full h-20 rounded-lg border"
              style={previewStyle}
            />
          </div>

          {/* Direction */}
          <div className="space-y-2">
            <Label>Direction</Label>
            <Select value={direction} onValueChange={setDirection}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {directionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Colors */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Couleurs ({colors.length}/3)</Label>
              {colors.length < 3 && (
                <Button variant="ghost" size="sm" onClick={addColor}>
                  <Plus className="w-4 h-4" />
                  Ajouter couleur
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {colors.map((color, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    type="color"
                    value={color}
                    onChange={(e) => updateColor(index, e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={color}
                    onChange={(e) => updateColor(index, e.target.value)}
                    className="flex-1"
                    placeholder="#000000"
                  />
                  {colors.length > 2 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removeColor(index)}
                      className="px-2"
                    >
                      ✕
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsOpen(false)}
            >
              Annuler
            </Button>
            <Button
              className="flex-1"
              onClick={handleCreate}
            >
              Créer dégradé
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}