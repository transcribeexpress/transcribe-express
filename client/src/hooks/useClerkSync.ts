/**
 * useClerkSync - Hook de synchronisation Clerk → Manus OAuth
 * 
 * Ce hook détecte quand Clerk est connecté et synchronise automatiquement
 * la session avec le backend Manus OAuth en appelant POST /api/clerk/sync.
 * 
 * Cela garantit que le cookie app_session_id est créé pour que les
 * requêtes tRPC protectedProcedure fonctionnent correctement.
 */

import { useUser } from "@clerk/clerk-react";
import { useState, useEffect, useRef } from "react";

type SyncState = "idle" | "syncing" | "synced" | "error";

export function useClerkSync() {
  const { user, isSignedIn, isLoaded } = useUser();
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [error, setError] = useState<string | null>(null);
  const syncAttemptedRef = useRef(false);
  const lastSyncedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Ne rien faire tant que Clerk n'est pas chargé
    if (!isLoaded) return;

    // Si l'utilisateur n'est pas connecté, reset l'état
    if (!isSignedIn || !user) {
      setSyncState("idle");
      setError(null);
      syncAttemptedRef.current = false;
      lastSyncedUserIdRef.current = null;
      return;
    }

    // Si déjà synchronisé pour cet utilisateur, ne pas refaire
    if (lastSyncedUserIdRef.current === user.id) {
      return;
    }

    // Si déjà en cours de sync, ne pas relancer
    if (syncAttemptedRef.current) {
      return;
    }

    // Lancer la synchronisation
    syncAttemptedRef.current = true;
    setSyncState("syncing");
    setError(null);

    const syncSession = async () => {
      try {
        const response = await fetch("/api/clerk/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clerkUserId: user.id,
          }),
          credentials: "include", // Important pour recevoir le cookie
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || `Sync failed with status ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
          lastSyncedUserIdRef.current = user.id;
          setSyncState("synced");
          console.log("[ClerkSync] Session synchronized successfully");
        } else {
          throw new Error("Sync response was not successful");
        }
      } catch (err) {
        console.error("[ClerkSync] Sync failed:", err);
        setError(err instanceof Error ? err.message : "Unknown sync error");
        setSyncState("error");
        // Permettre un retry
        syncAttemptedRef.current = false;
      }
    };

    syncSession();
  }, [isLoaded, isSignedIn, user]);

  return {
    /** L'état actuel de la synchronisation */
    syncState,
    /** true quand la session est prête (cookie Manus posé) */
    isSessionReady: syncState === "synced",
    /** true quand la sync est en cours */
    isSyncing: syncState === "syncing",
    /** true quand Clerk est chargé mais pas encore synchronisé */
    isInitializing: !isLoaded || (isSignedIn && syncState !== "synced" && syncState !== "error"),
    /** Message d'erreur si la sync a échoué */
    error,
    /** Forcer un retry de la synchronisation */
    retry: () => {
      syncAttemptedRef.current = false;
      lastSyncedUserIdRef.current = null;
      setSyncState("idle");
      setError(null);
    },
  };
}
