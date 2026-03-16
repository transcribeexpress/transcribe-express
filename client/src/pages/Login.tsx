/**
 * Page Login - Page de connexion Transcribe Express
 * 
 * Identité visuelle :
 * - Dark Mode First
 * - Magenta #BE34D5 pour les accents
 * - Cyan #34D5BE pour les liens
 * - Logo neon officiel Transcribe Express
 */

import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { LoginButton } from "@/components/LoginButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function Login() {
  const { isSignedIn, isLoading } = useAuth();
  const [, setLocation] = useLocation();

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
          {/* Logo Transcribe Express - fond transparent, taille généreuse */}
          <div className="flex justify-center">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310419663028820418/oRqyQWHwreNEuW2rCuPNoU/assets/transcribe-express-logo-e6ea58c3.png"
              alt="Transcribe Express Logo"
              className="w-20 h-20 object-contain [mix-blend-mode:screen]"
            />
          </div>
          
          {/* Titre */}
          <CardTitle className="text-2xl font-bold tracking-tight">
            Transcribe Express
          </CardTitle>
          
          {/* Sous-titre */}
          <CardDescription className="text-muted-foreground">
            Connectez-vous pour continuer
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4 pt-4">
          {/* Boutons OAuth */}
          <div className="space-y-3">
            <LoginButton provider="google" />
            <LoginButton provider="github" />
          </div>
          
          {/* Séparateur */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                ou
              </span>
            </div>
          </div>
          
          {/* Lien création de compte */}
          <p className="text-center text-sm text-muted-foreground">
            Pas encore de compte ?{" "}
            <a 
              href="/sign-up" 
              className="font-medium text-accent hover:text-accent/80 transition-colors underline-offset-4 hover:underline"
            >
              Créer un compte
            </a>
          </p>
          
          {/* Mentions légales */}
          <p className="text-center text-xs text-muted-foreground/60 mt-6">
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
