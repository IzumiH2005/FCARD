
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { apiRequest } from "@/lib/queryClient";
import Auth from "@/pages/auth";
import Home from "@/pages/home";
import BookDetail from "@/pages/book-detail";
import SectionDetail from "@/pages/section-detail";
import FlashcardCreator from "@/pages/flashcard-creator";
import StudyMode from "@/pages/study-mode";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";
import * as React from "react";
import type { UserSettings } from "@shared/schema";

// Context for user settings
interface UserSettingsContextType {
  settings: UserSettings | null;
  isLoading: boolean;
  refetch: () => void;
}

const UserSettingsContext = React.createContext<UserSettingsContextType>({
  settings: null,
  isLoading: false,
  refetch: () => {}
});

export const useUserSettings = () => React.useContext(UserSettingsContext);

function UserSettingsProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<{ id: string; username: string } | null>(null);

  React.useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const { data: settings, isLoading, refetch } = useQuery<UserSettings>({
    queryKey: ["/api/settings", user?.id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/settings/${user?.id}`);
      return response.json() as Promise<UserSettings>;
    },
    enabled: !!user?.id,
  });

  return (
    <UserSettingsContext.Provider value={{ settings: settings || null, isLoading, refetch }}>
      {children}
    </UserSettingsContext.Provider>
  );
}



function Router() {
  return (
    <Switch>
      <Route path="/auth" component={Auth} />
      <Route path="/" component={Home} />
      <Route path="/book/:id" component={BookDetail} />
      <Route path="/section/:id" component={SectionDetail} />
      <Route path="/flashcard/create/:sectionId" component={FlashcardCreator} />
      <Route path="/flashcard/edit/:id" component={FlashcardCreator} />
      <Route path="/study/section/:id" component={StudyMode} />
      <Route path="/study/book/:id" component={StudyMode} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  React.useEffect(() => {
    // Initialize theme from localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // Default to system preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      }
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <UserSettingsProvider>
          <Toaster />
          <Router />
        </UserSettingsProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
