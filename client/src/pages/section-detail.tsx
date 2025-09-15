import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Plus, Edit, Trash2, Play } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useRoute } from "wouter";
import { Flashcard } from "@/components/flashcard";
import type { Section, Flashcard as FlashcardType } from "@shared/schema";

export default function SectionDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/section/:id");
  const { toast } = useToast();
  const [flippedCards, setFlippedCards] = React.useState<Set<string>>(new Set());

  const { data: section } = useQuery({
    queryKey: ["/api/sections/single", params?.id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/sections/single/${params?.id}`);
      return response.json() as Promise<Section>;
    },
    enabled: !!params?.id,
  });

  const { data: flashcards = [], isLoading } = useQuery<FlashcardType[]>({
    queryKey: ["/api/flashcards", params?.id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/flashcards/section/${params?.id}`);
      return response.json() as Promise<FlashcardType[]>;
    },
    enabled: !!params?.id,
  });

  const deleteFlashcardMutation = useMutation({
    mutationFn: async (flashcardId: string) => {
      await apiRequest("DELETE", `/api/flashcards/${flashcardId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flashcards"] });
      toast({ title: "Success", description: "Flashcard deleted successfully!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete flashcard", variant: "destructive" });
    },
  });

  const handleCreateFlashcard = () => {
    setLocation(`/flashcard/create/${params?.id}`);
  };

  const handleEditFlashcard = (flashcard: FlashcardType) => {
    setLocation(`/flashcard/edit/${flashcard.id}`);
  };

  const handleDeleteFlashcard = (flashcard: FlashcardType) => {
    if (confirm("Are you sure you want to delete this flashcard?")) {
      deleteFlashcardMutation.mutate(flashcard.id);
    }
  };

  const handleStudySection = () => {
    setLocation(`/study/section/${params?.id}`);
  };

  const handleFlipCard = (flashcardId: string) => {
    setFlippedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(flashcardId)) {
        newSet.delete(flashcardId);
      } else {
        newSet.add(flashcardId);
      }
      return newSet;
    });
  };

  if (!params?.id) {
    setLocation("/");
    return null;
  }

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
            <div>
              <h1 className="text-xl font-bold">{section?.name || "Loading..."}</h1>
              <p className="text-sm text-muted-foreground">
                {flashcards.length} flashcard{flashcards.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          {flashcards.length > 0 && (
            <Button onClick={handleStudySection} data-testid="button-study-section">
              <Play className="h-4 w-4 mr-2" />
              Study
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Flashcards</h2>
          <Button onClick={handleCreateFlashcard} data-testid="button-create-flashcard">
            <Plus className="h-4 w-4 mr-2" />
            Add Flashcard
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="w-full h-52 bg-muted rounded-xl" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : flashcards.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {flashcards.map((flashcard) => (
              <Card key={flashcard.id} className="group relative" data-testid={`card-flashcard-${flashcard.id}`}>
                <CardContent className="p-4">
                  <Flashcard 
                    flashcard={flashcard} 
                    isFlipped={flippedCards.has(flashcard.id)}
                    onFlip={() => handleFlipCard(flashcard.id)}
                  />

                  {/* Action Buttons */}
                  <div className="flex justify-between items-center mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditFlashcard(flashcard);
                      }}
                      data-testid={`button-edit-${flashcard.id}`}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFlashcard(flashcard);
                      }}
                      className="text-destructive hover:text-destructive"
                      data-testid={`button-delete-${flashcard.id}`}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <Plus className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No flashcards yet</h3>
            <p className="text-muted-foreground mb-6">Create your first flashcard to start studying</p>
            <Button onClick={handleCreateFlashcard} data-testid="button-create-first-flashcard">
              <Plus className="h-4 w-4 mr-2" />
              Create Flashcard
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}