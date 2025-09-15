
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, ChevronRight, Play, MoreVertical, Edit, Trash2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useRoute } from "wouter";
import type { Book, Section } from "@shared/schema";

export default function BookDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/book/:id");
  const { toast } = useToast();
  const [isCreateSectionOpen, setIsCreateSectionOpen] = React.useState(false);
  const [isEditSectionOpen, setIsEditSectionOpen] = React.useState(false);
  const [newSectionName, setNewSectionName] = React.useState("");
  const [editingSectionId, setEditingSectionId] = React.useState<string | null>(null);
  const [editSectionName, setEditSectionName] = React.useState("");

  const { data: book } = useQuery({
    queryKey: ["/api/books/single", params?.id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/books/single/${params?.id}`);
      return response.json() as Promise<Book>;
    },
    enabled: !!params?.id,
  });

  const { data: sections = [], isLoading } = useQuery<Section[]>({
    queryKey: ["/api/sections", params?.id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/sections/${params?.id}`);
      return response.json() as Promise<Section[]>;
    },
    enabled: !!params?.id,
  });

  const createSectionMutation = useMutation({
    mutationFn: async (data: { name: string; bookId: string }) => {
      const response = await apiRequest("POST", "/api/sections", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sections"] });
      setIsCreateSectionOpen(false);
      setNewSectionName("");
      toast({ title: "Success", description: "Section created successfully!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create section", variant: "destructive" });
    },
  });

  const updateSectionMutation = useMutation({
    mutationFn: async (data: { id: string; name: string }) => {
      const response = await apiRequest("PUT", `/api/sections/${data.id}`, { name: data.name });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sections"] });
      setIsEditSectionOpen(false);
      setEditingSectionId(null);
      setEditSectionName("");
      toast({ title: "Success", description: "Section updated successfully!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update section", variant: "destructive" });
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: async (sectionId: string) => {
      const response = await apiRequest("DELETE", `/api/sections/${sectionId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sections"] });
      toast({ title: "Success", description: "Section deleted successfully!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete section", variant: "destructive" });
    },
  });

  const handleCreateSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!params?.id || !newSectionName.trim()) return;

    createSectionMutation.mutate({
      name: newSectionName.trim(),
      bookId: params.id,
    });
  };

  const handleEditSection = (section: Section) => {
    setEditingSectionId(section.id);
    setEditSectionName(section.name);
    setIsEditSectionOpen(true);
  };

  const handleUpdateSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSectionId || !editSectionName.trim()) return;

    updateSectionMutation.mutate({
      id: editingSectionId,
      name: editSectionName.trim(),
    });
  };

  const handleDeleteSection = (sectionId: string) => {
    if (confirm("Are you sure you want to delete this section? This will also delete all flashcards in this section.")) {
      deleteSectionMutation.mutate(sectionId);
    }
  };

  const handleSectionClick = (section: Section) => {
    setLocation(`/section/${section.id}`);
  };

  const handleStudyAll = () => {
    if (sections.length > 0) {
      setLocation(`/study/book/${params?.id}`);
    }
  };

  if (!params?.id) {
    setLocation("/");
    return null;
  }

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
          <div className="flex items-center space-x-3">
            <div className="w-12 h-16 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-sm">
              {book?.coverImage ? (
                <img 
                  src={book.coverImage} 
                  alt={book.title}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <span>{book?.title?.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold">{book?.title || "Loading..."}</h1>
              {book?.description && (
                <p className="text-sm text-muted-foreground">{book.description}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Sections</h2>
          <Dialog open={isCreateSectionOpen} onOpenChange={setIsCreateSectionOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-add-section">
                <Plus className="h-4 w-4 mr-2" />
                Add Section
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Section</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateSection} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="section-name">Section Name</Label>
                  <Input
                    id="section-name"
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    placeholder="Enter section name..."
                    data-testid="input-section-name"
                    required
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsCreateSectionOpen(false)}
                    data-testid="button-cancel-section"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={createSectionMutation.isPending}
                    data-testid="button-submit-section"
                  >
                    {createSectionMutation.isPending ? "Creating..." : "Create Section"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Section Dialog */}
        <Dialog open={isEditSectionOpen} onOpenChange={setIsEditSectionOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Section</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateSection} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-section-name">Section Name</Label>
                <Input
                  id="edit-section-name"
                  value={editSectionName}
                  onChange={(e) => setEditSectionName(e.target.value)}
                  placeholder="Enter section name..."
                  required
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsEditSectionOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={updateSectionMutation.isPending}
                >
                  {updateSectionMutation.isPending ? "Updating..." : "Update Section"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="h-5 bg-muted rounded w-32" />
                      <div className="h-4 bg-muted rounded w-24" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="h-8 w-16 bg-muted rounded" />
                      <div className="h-8 w-8 bg-muted rounded" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sections.length > 0 ? (
          <>
            {sections.map((section) => (
              <Card 
                key={section.id} 
                className="hover:shadow-md transition-shadow"
                data-testid={`card-section-${section.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1" onClick={() => handleSectionClick(section)} className="cursor-pointer">
                      <h3 className="font-semibold">{section.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Created {section.createdAt ? new Date(section.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        onClick={() => setLocation(`/study/section/${section.id}`)}
                        data-testid={`button-study-${section.id}`}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Study
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditSection(section)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteSection(section.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSectionClick(section)}
                        data-testid={`button-open-${section.id}`}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Study All Button */}
            <Button
              className="w-full"
              size="lg"
              onClick={handleStudyAll}
              data-testid="button-study-all"
            >
              <Play className="h-5 w-5 mr-2" />
              Study All Sections
            </Button>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <Plus className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No sections yet</h3>
            <p className="text-muted-foreground mb-6">Create your first section to organize your flashcards</p>
          </div>
        )}
      </main>
    </div>
  );
}
