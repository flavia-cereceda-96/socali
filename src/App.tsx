import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BottomNav } from "@/components/BottomNav";
import Index from "./pages/Index.tsx";
import CalendarPage from "./pages/CalendarPage.tsx";
import PeoplePage from "./pages/PeoplePage.tsx";
import CreateEventPage from "./pages/CreateEventPage.tsx";
import EventDetailPage from "./pages/EventDetailPage.tsx";
import RequestsPage from "./pages/RequestsPage.tsx";
import OnboardingPage from "./pages/OnboardingPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const isOnboarded = () => localStorage.getItem('onboarded') === 'true';

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/" element={isOnboarded() ? <Index /> : <Navigate to="/onboarding" replace />} />
          <Route path="/calendar" element={isOnboarded() ? <CalendarPage /> : <Navigate to="/onboarding" replace />} />
          <Route path="/people" element={isOnboarded() ? <PeoplePage /> : <Navigate to="/onboarding" replace />} />
          <Route path="/create" element={isOnboarded() ? <CreateEventPage /> : <Navigate to="/onboarding" replace />} />
          <Route path="/requests" element={isOnboarded() ? <RequestsPage /> : <Navigate to="/onboarding" replace />} />
          <Route path="/event/:id" element={isOnboarded() ? <EventDetailPage /> : <Navigate to="/onboarding" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        {isOnboarded() && <BottomNav />}
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
