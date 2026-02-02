import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Results from "./pages/Results";
import SSOCallback from "./pages/SSOCallback";
import { AnalyticsDashboard } from "./pages/AnalyticsDashboard";

function Router() {
  return (
    <Switch>
      {/* Pages publiques */}
      <Route path={"/"} component={Home} />
      <Route path={"/login"} component={Login} />
      
      {/* Callback OAuth Clerk */}
      <Route path={"/sso-callback"} component={SSOCallback} />
      
      {/* Pages protégées (authentification requise) */}
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/upload"} component={Upload} />
      <Route path={"/results/:id"} component={Results} />
      <Route path={"/analytics"} component={AnalyticsDashboard} />
      
      {/* Pages d'erreur */}
      <Route path={"/404"} component={NotFound} />
      
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - Dark Mode First pour Transcribe Express (identité visuelle)
// - Palette : Magenta #BE34D5 (primary), Cyan #34D5BE (accent)
// - Couleurs définies dans index.css avec OKLCH

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
