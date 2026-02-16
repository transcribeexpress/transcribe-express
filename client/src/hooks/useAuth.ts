/**
 * Hook useAuth - Wrapper autour de Clerk pour l'authentification
 * 
 * Ce hook expose une interface simplifiée pour gérer l'authentification
 * utilisateur dans Transcribe Express.
 * 
 * La déconnexion nettoie à la fois la session Clerk ET le cookie Manus OAuth.
 */

import { useUser, useClerk } from "@clerk/clerk-react";

export interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  imageUrl: string;
  createdAt: Date | null;
}

export function useAuth() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();

  // Transformer l'utilisateur Clerk en format simplifié
  const authUser: AuthUser | null = user ? {
    id: user.id,
    email: user.primaryEmailAddress?.emailAddress ?? null,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    imageUrl: user.imageUrl,
    createdAt: user.createdAt ? new Date(user.createdAt) : null,
  } : null;

  return {
    user: authUser,
    isLoading: !isLoaded,
    isSignedIn: isSignedIn ?? false,
    signOut: async () => {
      try {
        // 1. Nettoyer le cookie Manus OAuth
        await fetch("/api/clerk/logout", {
          method: "POST",
          credentials: "include",
        }).catch(() => {
          // Ignorer les erreurs de nettoyage du cookie
          console.warn("[Auth] Failed to clear Manus session cookie");
        });

        // 2. Déconnecter Clerk
        await signOut();
      } catch (error) {
        console.error("[Auth] Sign out error:", error);
      } finally {
        // 3. Toujours rediriger vers login, même en cas d'erreur
        window.location.replace("/login");
      }
    },
  };
}

export default useAuth;
