import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { useTranslation } from 'react-i18next';
import Index from "./pages/Index.tsx";
import CalendarPage from "./pages/CalendarPage.tsx";
import PeoplePage from "./pages/PeoplePage.tsx";
import CreateEventPage from "./pages/CreateEventPage.tsx";
import EventDetailPage from "./pages/EventDetailPage.tsx";
import RequestsPage from "./pages/RequestsPage.tsx";
import SettingsPage from "./pages/SettingsPage.tsx";
import ProfilePage from "./pages/ProfilePage.tsx";
import CreateGroupPage from "./pages/CreateGroupPage.tsx";
import GroupDetailPage from "./pages/GroupDetailPage.tsx";
import OnboardingPage from "./pages/OnboardingPage.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.tsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.tsx";
import PersonPage from "./pages/PersonPage.tsx";
import NotFound from "./pages/NotFound.tsx";
import SplashPage, { hasSeenSplash } from "./pages/SplashPage.tsx";
import { WhatsNewModal } from "./components/WhatsNewModal.tsx";
import { useSyncLanguageFromProfile } from "./hooks/useLanguagePreference";

const queryClient = new QueryClient();

function AuthedShell({ children }: { children: React.ReactNode }) {
  // Sync user's preferred language from profile once authenticated
  useSyncLanguageFromProfile();
  return <>{children}</>;
}

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground text-sm">{t('common.loading')}</div>
      </div>
    );
  }

  const authed = !!session;
  const seenSplash = hasSeenSplash();

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthedShell>
          <Routes>
            <Route path="/welcome" element={!authed ? <SplashPage /> : <Navigate to="/" replace />} />
            <Route path="/onboarding" element={!authed ? <OnboardingPage /> : <Navigate to="/" replace />} />
            <Route path="/login" element={!authed ? (seenSplash ? <LoginPage /> : <Navigate to="/welcome" replace />) : <Navigate to="/" replace />} />
            <Route path="/forgot-password" element={!authed ? <ForgotPasswordPage /> : <Navigate to="/" replace />} />
            <Route path="/reset-password" element={!authed ? <ResetPasswordPage /> : <Navigate to="/" replace />} />
            <Route path="/" element={authed ? <Index /> : <Navigate to={seenSplash ? "/login" : "/welcome"} replace />} />
            <Route path="/calendar" element={authed ? <CalendarPage /> : <Navigate to="/login" replace />} />
            <Route path="/people" element={authed ? <PeoplePage /> : <Navigate to="/login" replace />} />
            <Route path="/people/groups/new" element={authed ? <CreateGroupPage /> : <Navigate to="/login" replace />} />
            <Route path="/people/groups/:id" element={authed ? <GroupDetailPage /> : <Navigate to="/login" replace />} />
            <Route path="/create" element={authed ? <CreateEventPage /> : <Navigate to="/login" replace />} />
            <Route path="/requests" element={authed ? <RequestsPage /> : <Navigate to="/login" replace />} />
            <Route path="/event/:id" element={authed ? <EventDetailPage /> : <Navigate to="/login" replace />} />
            <Route path="/person/:userId" element={authed ? <PersonPage /> : <Navigate to="/login" replace />} />
            <Route path="/settings" element={authed ? <SettingsPage /> : <Navigate to="/login" replace />} />
            <Route path="/profile" element={authed ? <ProfilePage /> : <Navigate to="/login" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          {authed && <BottomNav />}
          {authed && <WhatsNewModal />}
        </AuthedShell>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
