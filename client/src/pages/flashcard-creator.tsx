import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useRoute } from "wouter";
import { Flashcard } from "@/components/flashcard";
import { FileUpload } from "@/components/ui/file-upload";
import { GradientCreator } from "@/components/gradient-creator";
import type { Flashcard as FlashcardType } from "@shared/schema";

const gradientOptions = [
  { value: "gradient-1", label: "Purple to Indigo", className: "bg-gradient-to-br from-indigo-500 to-purple-600" },
  { value: "gradient-2", label: "Pink to Red", className: "bg-gradient-to-br from-pink-500 to-red-500" },
  { value: "gradient-3", label: "Blue to Cyan", className: "bg-gradient-to-br from-blue-500 to-cyan-500" },
  { value: "gradient-4", label: "Green to Teal", className: "bg-gradient-to-br from-green-500 to-teal-500" },
  { value: "gradient-5", label: "Yellow to Orange", className: "bg-gradient-to-br from-yellow-500 to-orange-500" },
  { value: "solid-dark", label: "Dark Gray", className: "bg-gray-800" },
];

const fontOptions = [
  { value: "Inter", label: "Inter" },
  { value: "Georgia", label: "Georgia" },
  { value: "Courier New", label: "Courier New" },
  { value: "Arial", label: "Arial" },
  { value: "Times New Roman", label: "Times New Roman" },
];

export default function FlashcardCreator() {
  const [, setLocation] = useLocation();
  const [, createParams] = useRoute("/flashcard/create/:sectionId");
  const [, editParams] = useRoute("/flashcard/edit/:id");
  const { toast } = useToast();
  const [isFlipped, setIsFlipped] = React.useState(false);

  const isEditMode = !!editParams?.id;
  const sectionId = createParams?.sectionId;
  const flashcardId = editParams?.id;

  const [formData, setFormData] = React.useState({
    frontText: "",
    backText: "",
    frontGradient: "gradient-1",
    backGradient: "gradient-2",
    frontCustomGradient: "",
    backCustomGradient: "",
    frontFont: "Inter",
    backFont: "Inter",
    frontImage: null as File | null,
    backImage: null as File | null,
    frontAudio: null as File | null,
    backAudio: null as File | null,
  });

  // Load existing flashcard data for edit mode
  const { data: existingFlashcard } = useQuery({
    queryKey: ["/api/flashcards", flashcardId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/flashcards/${flashcardId}`);
      return response.json() as Promise<FlashcardType>;
    },
    enabled: isEditMode && !!flashcardId,
  });

  // Fetch user settings
  const { data: userSettings } = useQuery({
    queryKey: ["/api/user/settings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/user/settings");
      return response.json();
    },
    staleTime: Infinity, // Settings don't change often
  });

  React.useEffect(() => {
    if (existingFlashcard) {
      setFormData({
        frontText: existingFlashcard.frontText || "",
        backText: existingFlashcard.backText || "",
        frontGradient: existingFlashcard.frontGradient || "gradient-1",
        backGradient: existingFlashcard.backGradient || "gradient-2",
        frontCustomGradient: existingFlashcard.frontCustomGradient || "",
        backCustomGradient: existingFlashcard.backCustomGradient || "",
        frontFont: existingFlashcard.frontFont || "Inter",
        backFont: existingFlashcard.backFont || "Inter",
        frontImage: null,
        backImage: null,
        frontAudio: null,
        backAudio: null,
      });
    }
  }, [existingFlashcard]);

  // Combine default fonts with custom fonts
  const customFonts = (userSettings?.customFonts as any[]) || [];
  const allFontOptions = [
    ...fontOptions,
    ...customFonts.map((font: any) => ({
      value: font.name,
      label: font.name,
      url: font.url
    }))
  ];

  // Add custom font styles to head
  React.useEffect(() => {
    if (customFonts.length > 0) {
      const fontFaces = customFonts.map((font: any) => {
        return `@font-face {
          font-family: "${font.name}";
          src: url("${font.url}");
          font-weight: ${font.weight || 'normal'};
          font-style: ${font.style || 'normal'};
        }`;
      }).join('\n');

      const styleElement = document.createElement('style');
      styleElement.textContent = fontFaces;
      styleElement.id = 'custom-fonts';

      // Remove existing custom fonts style
      const existingStyle = document.getElementById('custom-fonts');
      if (existingStyle) {
        existingStyle.remove();
      }

      document.head.appendChild(styleElement);

      return () => {
        const style = document.getElementById('custom-fonts');
        if (style) {
          style.remove();
        }
      };
    }
  }, [customFonts]);


  const saveFlashcardMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const url = isEditMode ? `/api/flashcards/${flashcardId}` : "/api/flashcards";
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        body: data,
      });

      if (!response.ok) throw new Error("Failed to save flashcard");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flashcards"] });
      toast({ 
        title: "Success", 
        description: `Flashcard ${isEditMode ? 'updated' : 'created'} successfully!` 
      });
      window.history.back();
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: `Failed to ${isEditMode ? 'update' : 'create'} flashcard`, 
        variant: "destructive" 
      });
    },
  });

  const handleSave = () => {
    if (!formData.frontText.trim() || !formData.backText.trim()) {
      toast({ title: "Error", description: "Please fill in both front and back text", variant: "destructive" });
      return;
    }

    const data = new FormData();
    data.append("frontText", formData.frontText);
    data.append("backText", formData.backText);
    data.append("frontGradient", formData.frontGradient);
    data.append("backGradient", formData.backGradient);
    if (formData.frontCustomGradient) data.append("frontCustomGradient", formData.frontCustomGradient);
    if (formData.backCustomGradient) data.append("backCustomGradient", formData.backCustomGradient);
    data.append("frontFont", formData.frontFont);
    data.append("backFont", formData.backFont);

    if (!isEditMode && sectionId) {
      data.append("sectionId", sectionId);
    }

    if (formData.frontImage) data.append("frontImage", formData.frontImage);
    if (formData.backImage) data.append("backImage", formData.backImage);
    if (formData.frontAudio) data.append("frontAudio", formData.frontAudio);
    if (formData.backAudio) data.append("backAudio", formData.backAudio);

    saveFlashcardMutation.mutate(data);
  };

  // Create preview flashcard object
  const previewFlashcard: FlashcardType = {
    id: "preview",
    frontText: formData.frontText || "Front side content",
    backText: formData.backText || "Back side content",
    frontGradient: formData.frontGradient,
    backGradient: formData.backGradient,
    frontCustomGradient: formData.frontCustomGradient || null,
    backCustomGradient: formData.backCustomGradient || null,
    frontFont: formData.frontFont,
    backFont: formData.backFont,
    frontImage: formData.frontImage ? URL.createObjectURL(formData.frontImage) : existingFlashcard?.frontImage || null,
    backImage: formData.backImage ? URL.createObjectURL(formData.backImage) : existingFlashcard?.backImage || null,
    frontAudio: formData.frontAudio ? URL.createObjectURL(formData.frontAudio) : existingFlashcard?.frontAudio || null,
    backAudio: formData.backAudio ? URL.createObjectURL(formData.backAudio) : existingFlashcard?.backAudio || null,
    sectionId: sectionId || existingFlashcard?.sectionId || "",
    createdAt: null,
  };

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* Header */}
      <header className="bg-card border-b px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.history.back()}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">
              {isEditMode ? "Edit Flashcard" : "Create Flashcard"}
            </h1>
          </div>
          <Button
            onClick={handleSave}
            disabled={saveFlashcardMutation.isPending}
            data-testid="button-save-flashcard"
          >
            {saveFlashcardMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </header>

      {/* Preview */}
      <div className="p-4">
        <div className="max-w-sm mx-auto">
          <Flashcard
            flashcard={previewFlashcard}
            isFlipped={isFlipped}
            onFlip={() => setIsFlipped(!isFlipped)}
          />
          <p className="text-center text-sm text-muted-foreground mt-2">
            Tap to flip preview
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="p-4 space-y-6">
        {/* Front Side */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Front Side</h3>

          <div className="space-y-2">
            <Label htmlFor="front-text">Text Content</Label>
            <Textarea
              id="front-text"
              value={formData.frontText}
              onChange={(e) => setFormData({ ...formData, frontText: e.target.value })}
              placeholder="Enter front side text..."
              rows={3}
              data-testid="textarea-front-text"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Background Style</Label>
              <div className="grid grid-cols-3 gap-2">
                {gradientOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`w-full h-10 rounded-lg border-2 transition-colors ${
                      formData.frontGradient === option.value && !formData.frontCustomGradient ? "border-ring" : "border-transparent"
                    } ${option.className}`}
                    onClick={() => setFormData({ ...formData, frontGradient: option.value, frontCustomGradient: "" })}
                    data-testid={`button-front-gradient-${option.value}`}
                  />
                ))}
              </div>
              <div className="mt-2">
                <GradientCreator
                  onGradientCreate={(gradient) => {
                    setFormData({ 
                      ...formData, 
                      frontCustomGradient: gradient,
                      frontGradient: "custom"
                    });
                  }}
                />
                {formData.frontCustomGradient && (
                  <div className="mt-2 p-2 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Dégradé personnalisé</span>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, frontCustomGradient: "", frontGradient: "gradient-1" })}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Supprimer
                      </button>
                    </div>
                    <div 
                      className="w-full h-6 rounded mt-1" 
                      style={{ background: formData.frontCustomGradient }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="front-font">Font Family</Label>
              <Select
                value={formData.frontFont}
                onValueChange={(value) => setFormData({ ...formData, frontFont: value })}
              >
                <SelectTrigger data-testid="select-front-font">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allFontOptions.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      {font.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Front Image</Label>
              <FileUpload
                accept="image/*"
                onFileSelect={(files) => {
                  setFormData({ ...formData, frontImage: files?.[0] || null });
                }}
                placeholder="Choose image..."
                data-testid="upload-front-image"
              />
            </div>

            <div className="space-y-2">
              <Label>Front Audio</Label>
              <FileUpload
                accept="audio/*"
                onFileSelect={(files) => {
                  setFormData({ ...formData, frontAudio: files?.[0] || null });
                }}
                placeholder="Choose audio..."
                data-testid="upload-front-audio"
              />
            </div>
          </div>
        </div>

        {/* Back Side */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Back Side</h3>

          <div className="space-y-2">
            <Label htmlFor="back-text">Text Content</Label>
            <Textarea
              id="back-text"
              value={formData.backText}
              onChange={(e) => setFormData({ ...formData, backText: e.target.value })}
              placeholder="Enter back side text..."
              rows={3}
              data-testid="textarea-back-text"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Background Style</Label>
              <div className="grid grid-cols-3 gap-2">
                {gradientOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`w-full h-10 rounded-lg border-2 transition-colors ${
                      formData.backGradient === option.value && !formData.backCustomGradient ? "border-ring" : "border-transparent"
                    } ${option.className}`}
                    onClick={() => setFormData({ ...formData, backGradient: option.value, backCustomGradient: "" })}
                    data-testid={`button-back-gradient-${option.value}`}
                  />
                ))}
              </div>
              <div className="mt-2">
                <GradientCreator
                  onGradientCreate={(gradient) => {
                    setFormData({ 
                      ...formData, 
                      backCustomGradient: gradient,
                      backGradient: "custom"
                    });
                  }}
                />
                {formData.backCustomGradient && (
                  <div className="mt-2 p-2 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Dégradé personnalisé</span>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, backCustomGradient: "", backGradient: "gradient-2" })}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Supprimer
                      </button>
                    </div>
                    <div 
                      className="w-full h-6 rounded mt-1" 
                      style={{ background: formData.backCustomGradient }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="back-font">Font Family</Label>
              <Select
                value={formData.backFont}
                onValueChange={(value) => setFormData({ ...formData, backFont: value })}
              >
                <SelectTrigger data-testid="select-back-font">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allFontOptions.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      {font.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Back Image</Label>
              <FileUpload
                accept="image/*"
                onFileSelect={(files) => {
                  setFormData({ ...formData, backImage: files?.[0] || null });
                }}
                placeholder="Choose image..."
                data-testid="upload-back-image"
              />
            </div>

            <div className="space-y-2">
              <Label>Back Audio</Label>
              <FileUpload
                accept="audio/*"
                onFileSelect={(files) => {
                  setFormData({ ...formData, backAudio: files?.[0] || null });
                }}
                placeholder="Choose audio..."
                data-testid="upload-back-audio"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}