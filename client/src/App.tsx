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
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import ProgressPage from "./pages/Progress";
import Pricing from "./pages/Pricing";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";
import Account from "./pages/Account";
import Contact from "./pages/Contact";
import Admin from "./pages/Admin";
import Privacy from "./pages/Privacy";
import Legal from "./pages/Legal";
import CGV from "./pages/CGV";
import Demo from "./pages/Demo";
import GuideTranscription from "./pages/GuideTranscription";

function Router() {
  return (
    <Switch>
      {/* Pages publiques */}
      <Route path={"/"} component={Home} />
      <Route path={"/pricing"} component={Pricing} />
      <Route path={"/payment/success"} component={PaymentSuccess} />
      <Route path={"/payment/cancel"} component={PaymentCancel} />
      <Route path={"/login"} component={Login} />
      
      {/* Callback OAuth Clerk */}
      <Route path={"/sso-callback"} component={SSOCallback} />
      
      {/* Pages protégées (authentification requise) */}
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/upload"} component={Upload} />
      <Route path={"/results/:id"} component={Results} />
      <Route path={"/progress/:id"} component={ProgressPage} />
      <Route path={"/analytics"} component={AnalyticsDashboard} />
      <Route path={"/account"} component={Account} />
      <Route path={"/contact"} component={Contact} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/privacy"} component={Privacy} />
      <Route path={"/legal"} component={Legal} />
      <Route path={"/cgv"} component={CGV} />
      <Route path={"/demo"} component={Demo} />
      <Route path={"/guide-transcription"} component={GuideTranscription} />
      <Route path={"/profile"} component={Profile} />
      <Route path={"/settings"} component={Settings} />
      
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
