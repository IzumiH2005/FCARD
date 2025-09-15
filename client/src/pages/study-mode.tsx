import * as React from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, Check, ThumbsDown } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useRoute } from "wouter";
import { Flashcard } from "@/components/flashcard";
import type { Flashcard as FlashcardType } from "@shared/schema";

export default function StudyMode() {
  const [, setLocation] = useLocation();
  const [, sectionParams] = useRoute("/study/section/:id");
  const [, bookParams] = useRoute("/study/book/:id");
  const { toast } = useToast();

  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isFlipped, setIsFlipped] = React.useState(false);
  const [studiedCards, setStudiedCards] = React.useState<Set<string>>(new Set());
  const [user, setUser] = React.useState<{ id: string; username: string } | null>(null);

  React.useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const studyId = sectionParams?.id || bookParams?.id;
  const isBookStudy = !!bookParams?.id;

  // Get flashcards for section or all sections in book
  const { data: flashcards = [], isLoading } = useQuery({
    queryKey: ["/api/flashcards", studyId, isBookStudy ? "book" : "section"],
    queryFn: async () => {
      let cards: FlashcardType[] = [];
      
      if (isBookStudy) {
        // Use the dedicated endpoint for book flashcards
        const response = await apiRequest("GET", `/api/books/${studyId}/flashcards`);
        cards = await response.json() as FlashcardType[];
      } else {
        // Get flashcards for a specific section
        const response = await apiRequest("GET", `/api/flashcards/section/${studyId}`);
        cards = await response.json() as FlashcardType[];
      }
      
      // Better shuffling algorithm (Fisher-Yates shuffle)
      const shuffledCards = [...cards];
      for (let i = shuffledCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledCards[i], shuffledCards[j]] = [shuffledCards[j], shuffledCards[i]];
      }
      
      return shuffledCards;
    },
    enabled: !!studyId,
  });

  const recordProgressMutation = useMutation({
    mutationFn: async (data: { userId: string; flashcardId: string; difficulty: string }) => {
      const response = await apiRequest("POST", "/api/study-progress", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study-progress"] });
    },
  });

  const currentCard = flashcards[currentIndex];
  const progress = flashcards.length > 0 ? ((currentIndex + 1) / flashcards.length) * 100 : 0;
  const isLastCard = currentIndex === flashcards.length - 1;

  const handleCardFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleAnswer = (difficulty: "easy" | "hard") => {
    if (!currentCard || !user) return;

    // Record study progress
    recordProgressMutation.mutate({
      userId: user.id,
      flashcardId: currentCard.id,
      difficulty,
    });

    setStudiedCards(prev => new Set(prev).add(currentCard.id));

    if (isLastCard) {
      // Study session complete
      toast({ 
        title: "Study Complete!", 
        description: `You've studied ${flashcards.length} flashcard${flashcards.length !== 1 ? 's' : ''}!` 
      });
      window.history.back();
    } else {
      // Move to next card
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    }
  };

  const handleExitStudy = () => {
    if (studiedCards.size > 0) {
      const confirmExit = confirm(`You've studied ${studiedCards.size} cards. Are you sure you want to exit?`);
      if (!confirmExit) return;
    }
    window.history.back();
  };

  if (!studyId) {
    setLocation("/");
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg font-medium">Loading flashcards...</p>
        </div>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">No flashcards found</h2>
          <p className="text-muted-foreground mb-4">Create some flashcards to start studying!</p>
          <Button onClick={() => window.history.back()} data-testid="button-go-back">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b px-4 py-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleExitStudy}
            data-testid="button-exit-study"
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Progress</p>
            <p className="font-semibold" data-testid="text-progress">
              {currentIndex + 1} / {flashcards.length}
            </p>
          </div>
          <div className="w-10" /> {/* Spacer for alignment */}
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <Progress value={progress} className="h-2" data-testid="progress-bar" />
        </div>
      </header>

      {/* Main Study Area */}
      <main className="flex items-center justify-center min-h-[calc(100vh-140px)] p-4">
        <div className="w-full max-w-md space-y-8">
          {/* Flashcard */}
          <Flashcard
            flashcard={currentCard}
            isFlipped={isFlipped}
            onFlip={handleCardFlip}
            className="mx-auto"
          />

          <p className="text-center text-sm text-muted-foreground">
            {isFlipped ? "How well did you know this?" : "Tap card to reveal answer"}
          </p>

          {/* Answer Buttons - only show when card is flipped */}
          {isFlipped && (
            <div className="flex justify-center space-x-4">
              <Button
                variant="destructive"
                size="lg"
                onClick={() => handleAnswer("hard")}
                className="flex-1 max-w-[140px]"
                data-testid="button-answer-hard"
              >
                <ThumbsDown className="h-5 w-5 mr-2" />
                Hard
              </Button>
              <Button
                size="lg"
                onClick={() => handleAnswer("easy")}
                className="flex-1 max-w-[140px] bg-green-600 hover:bg-green-700"
                data-testid="button-answer-easy"
              >
                <Check className="h-5 w-5 mr-2" />
                Easy
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
