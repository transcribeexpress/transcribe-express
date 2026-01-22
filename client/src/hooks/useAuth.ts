/**
 * Hook useAuth - Wrapper autour de Clerk pour l'authentification
 * 
 * Ce hook expose une interface simplifiée pour gérer l'authentification
 * utilisateur dans Transcribe Express.
 * 
 * @returns {Object} Objet contenant :
 *   - user: L'utilisateur connecté ou null
 *   - isLoading: État de chargement de l'authentification
 *   - isSignedIn: Booléen indiquant si l'utilisateur est connecté
 *   - signOut: Fonction pour déconnecter l'utilisateur
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
      await signOut();
      window.location.href = "/login";
    },
  };
}

export default useAuth;
