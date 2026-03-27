/**
 * Page Login - Page de connexion Transcribe Express
 * 
 * Identité visuelle :
 * - Dark Mode First
 * - Magenta #BE34D5 pour les accents
 * - Cyan #34D5BE pour les liens
 * - Logo neon officiel Transcribe Express
 * 
 * Modes d'authentification :
 * - OAuth : Google, GitHub
 * - Email : Email + mot de passe (connexion / inscription)
 */

import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { LoginButton } from "@/components/LoginButton";
import { EmailSignIn } from "@/components/EmailSignIn";
import { EmailSignUp } from "@/components/EmailSignUp";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, Chrome } from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028820418/oRqyQWHwreNEuW2rCuPNoU/brand/transcribe-express-icon-transparent-v2.png";
const WORDMARK_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028820418/oRqyQWHwreNEuW2rCuPNoU/assets/transcribe-express-wordmark-transparent-e5f6g7h8.png";

type AuthMode = "oauth" | "email_signin" | "email_signup";

export default function Login() {
  const { isSignedIn, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [authMode, setAuthMode] = useState<AuthMode>("oauth");

  // Rediriger vers le dashboard si déjà connecté
  useEffect(() => {
    if (isSignedIn && !isLoading) {
      setLocation("/dashboard");
    }
  }, [isSignedIn, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/20" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Fond avec effet de gradient subtil */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5 pointer-events-none" />

      {/* Bouton retour à l'accueil */}
      <Link href="/">
        <button className="absolute top-6 left-6 z-20 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Retour au site</span>
        </button>
      </Link>
      
      <Card className="w-full max-w-md relative z-10 border-border/50 shadow-2xl">
        <CardHeader className="text-center space-y-4 pb-2">
          {/* Logo + Wordmark Transcribe Express - disposition verticale */}
          <div className="flex flex-col items-center gap-3">
            <img
              src={LOGO_URL}
              alt="Transcribe Express Logo"
              className="w-20 h-20 object-contain [mix-blend-mode:screen] drop-shadow-[0_0_12px_rgba(180,0,255,0.6)]"
            />
            <img
              src={WORDMARK_URL}
              alt="Transcribe Express"
              className="h-10 w-auto max-w-[200px] object-contain"
            />
          </div>
          
          {/* Titre masqué - remplacé par le wordmark */}
          <CardTitle className="sr-only">
            Transcribe Express
          </CardTitle>
          
          {/* Sous-titre dynamique */}
          <CardDescription className="text-muted-foreground">
            {authMode === "email_signup"
              ? "Créez votre compte gratuitement"
              : "Connectez-vous pour continuer"}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4 pt-4">

          {/* ---- MODE OAUTH (par défaut) ---- */}
          {authMode === "oauth" && (
            <>
              {/* Boutons OAuth */}
              <div className="space-y-3">
                <LoginButton provider="google" />
                <LoginButton provider="github" />
              </div>
              
              {/* Séparateur */}
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">ou</span>
                </div>
              </div>

              {/* Bouton Email */}
              <button
                onClick={() => setAuthMode("email_signin")}
                className="w-full h-11 flex items-center justify-center gap-3 rounded-md border border-border/60 bg-background/50 hover:bg-muted/50 text-sm font-medium text-foreground transition-all duration-200"
              >
                <Mail className="w-4 h-4 text-muted-foreground" />
                Continuer avec Email
              </button>

              {/* Lien création de compte */}
              <p className="text-center text-sm text-muted-foreground pt-1">
                Pas encore de compte ?{" "}
                <button
                  onClick={() => setAuthMode("email_signup")}
                  className="font-medium text-accent hover:text-accent/80 transition-colors underline-offset-4 hover:underline"
                >
                  Créer un compte
                </button>
              </p>
            </>
          )}

          {/* ---- MODE EMAIL CONNEXION ---- */}
          {authMode === "email_signin" && (
            <>
              {/* Retour aux options OAuth */}
              <button
                onClick={() => setAuthMode("oauth")}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
              >
                <Chrome className="w-3 h-3" />
                Autres options de connexion
              </button>

              <EmailSignIn onSwitchToSignUp={() => setAuthMode("email_signup")} />
            </>
          )}

          {/* ---- MODE EMAIL INSCRIPTION ---- */}
          {authMode === "email_signup" && (
            <>
              {/* Retour aux options OAuth */}
              <button
                onClick={() => setAuthMode("oauth")}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
              >
                <Chrome className="w-3 h-3" />
                Autres options de connexion
              </button>

              <EmailSignUp onSwitchToSignIn={() => setAuthMode("email_signin")} />
            </>
          )}

          {/* Mentions légales */}
          <p className="text-center text-xs text-muted-foreground/60 mt-4">
            En continuant, vous acceptez nos{" "}
            <a href="/terms" className="underline hover:text-muted-foreground">
              Conditions d'utilisation
            </a>{" "}
            et notre{" "}
            <a href="/privacy" className="underline hover:text-muted-foreground">
              Politique de confidentialité
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
