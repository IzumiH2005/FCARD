import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Upload, Trash2, Plus, Moon, Sun, Type } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { FileUpload } from "@/components/ui/file-upload";
import { useUserSettings } from "@/App";
import type { UserSettings } from "@shared/schema";

export default function Settings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [user, setUser] = React.useState<{ id: string; username: string } | null>(null);
  const [isUploadFontOpen, setIsUploadFontOpen] = React.useState(false);
  const [fontName, setFontName] = React.useState("");
  const [fontFile, setFontFile] = React.useState<File | null>(null);
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  React.useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      setLocation("/auth");
      return;
    }
    setUser(JSON.parse(userData));
  }, [setLocation]);

  React.useEffect(() => {
    // Check current theme
    const currentTheme = document.documentElement.classList.contains('dark');
    setIsDarkMode(currentTheme);
  }, []);

  const { settings, isLoading } = useUserSettings();

  const uploadFontMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(`/api/settings/${user?.id}/upload-font`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Failed to upload font");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      setIsUploadFontOpen(false);
      setFontName("");
      setFontFile(null);
      toast({ title: "Success", description: "Font uploaded successfully!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to upload font", variant: "destructive" });
    },
  });

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    
    toast({ 
      title: "Theme Updated", 
      description: `Switched to ${newDarkMode ? 'dark' : 'light'} mode` 
    });
  };

  const deleteFontMutation = useMutation({
    mutationFn: async (fontId: string) => {
      const response = await apiRequest("DELETE", `/api/settings/${user?.id}/font/${fontId}`);
      if (!response.ok) throw new Error("Failed to delete font");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Success", description: "Font deleted successfully!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete font", variant: "destructive" });
    },
  });

  

  const handleUploadFont = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fontFile || !fontName.trim()) return;

    const formData = new FormData();
    formData.append("font", fontFile);
    formData.append("name", fontName.trim());

    uploadFontMutation.mutate(formData);
  };

  

  const handleDeleteFont = (fontId: string) => {
    if (confirm("Are you sure you want to delete this font?")) {
      deleteFontMutation.mutate(fontId);
    }
  };

  const customFonts = (settings?.customFonts as any[]) || [];

  if (!user) return null;


  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* Header */}
      <header className="bg-card border-b px-4 py-4">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-sm text-muted-foreground">Customize your experience</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-6">
        {/* Theme Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {isDarkMode ? <Moon className="h-5 w-5 mr-2" /> : <Sun className="h-5 w-5 mr-2" />}
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="theme-toggle" className="text-base font-medium">
                  Dark Mode
                </Label>
                <p className="text-sm text-muted-foreground">
                  Switch between light and dark themes
                </p>
              </div>
              <Switch
                id="theme-toggle"
                checked={isDarkMode}
                onCheckedChange={toggleTheme}
              />
            </div>
          </CardContent>
        </Card>

        {/* Custom Fonts Section */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center">
                <Type className="h-5 w-5 mr-2" />
                Custom Fonts
              </CardTitle>
              <Dialog open={isUploadFontOpen} onOpenChange={setIsUploadFontOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Font
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Upload Custom Font</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleUploadFont} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="font-name">Font Name</Label>
                      <Input
                        id="font-name"
                        value={fontName}
                        onChange={(e) => setFontName(e.target.value)}
                        placeholder="Enter font name..."
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Font File</Label>
                      <FileUpload
                        accept=".ttf,.otf,.woff,.woff2"
                        onFileSelect={(files) => setFontFile(files?.[0] || null)}
                        placeholder="Choose font file (.ttf, .otf, .woff, .woff2)..."
                        required
                      />
                    </div>
                    <div className="flex space-x-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setIsUploadFontOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={uploadFontMutation.isPending}
                      >
                        {uploadFontMutation.isPending ? "Uploading..." : "Upload"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-12 bg-muted rounded-lg" />
                  </div>
                ))}
              </div>
            ) : customFonts.length > 0 ? (
              <div className="space-y-4">
                {customFonts.map((font: any) => (
                  <div key={font.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{font.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {font.filename}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDeleteFont(font.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Type className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No custom fonts uploaded</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}