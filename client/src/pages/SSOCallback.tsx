/**
 * Page SSOCallback - Gestion du callback OAuth Clerk
 * 
 * Cette page gère la redirection après l'authentification OAuth.
 * Elle utilise le composant AuthenticateWithRedirectCallback de Clerk.
 */

import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react";

export default function SSOCallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/20 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-primary/40 animate-ping" />
        </div>
        <p className="text-muted-foreground">Connexion en cours...</p>
        <AuthenticateWithRedirectCallback />
      </div>
    </div>
  );
}
