import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import "@/lib/i18n";
import Auth from "./pages/Auth";

import Dashboard from "./pages/Dashboard";
import Wardrobe from "./pages/Wardrobe";
import OutfitSuggest from "./pages/OutfitSuggest";
import OutfitHistory from "./pages/OutfitHistory";
import VirtualTryOn from "./pages/VirtualTryOn";
import Settings from "./pages/Settings";
import StyleChat from "./pages/StyleChat";
import TravelMode from "./pages/TravelMode";
import InstantFit from "./pages/InstantFit";
import InstallApp from "./pages/InstallApp";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function RootRedirect() {
  const { user, loading, isNewSignUp } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (isNewSignUp) return <Navigate to="/onboarding" replace />;
  return <Navigate to="/dashboard" replace />;
}
const router = createBrowserRouter([
  { path: "/", element: <RootRedirect /> },
  { path: "/auth", element: <Auth /> },
  { path: "/onboarding", element: <Onboarding /> },
  
  { path: "/dashboard", element: <Dashboard /> },
  { path: "/dashboard/wardrobe", element: <Wardrobe /> },
  { path: "/dashboard/suggest", element: <OutfitSuggest /> },
  { path: "/dashboard/history", element: <OutfitHistory /> },
  { path: "/dashboard/try-on", element: <VirtualTryOn /> },
  { path: "/dashboard/instant-fit", element: <InstantFit /> },
  { path: "/dashboard/chat", element: <StyleChat /> },
  { path: "/dashboard/travel", element: <TravelMode /> },
  { path: "/dashboard/settings", element: <Settings /> },
  { path: "/install", element: <InstallApp /> },
  { path: "*", element: <NotFound /> },
]);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <RouterProvider router={router} />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
