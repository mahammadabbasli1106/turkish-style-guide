import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import "@/lib/i18n";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Wardrobe from "./pages/Wardrobe";
import OutfitSuggest from "./pages/OutfitSuggest";
import OutfitHistory from "./pages/OutfitHistory";
import VirtualTryOn from "./pages/VirtualTryOn";
import Settings from "./pages/Settings";
import StyleChat from "./pages/StyleChat";
import InstallApp from "./pages/InstallApp";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
      </div>
    );
  }
  return <Navigate to={user ? "/dashboard" : "/auth"} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/wardrobe" element={<Wardrobe />} />
            <Route path="/dashboard/suggest" element={<OutfitSuggest />} />
            <Route path="/dashboard/history" element={<OutfitHistory />} />
            <Route path="/dashboard/try-on" element={<VirtualTryOn />} />
            <Route path="/dashboard/chat" element={<StyleChat />} />
            <Route path="/dashboard/settings" element={<Settings />} />
            <Route path="/install" element={<InstallApp />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
