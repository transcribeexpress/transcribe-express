import { ClerkProvider } from "@clerk/clerk-react";
import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";
import { Toaster } from "@/components/Toast";

// Clerk Publishable Key
// La variable VITE_* est automatiquement exposée par Vite
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key. Please set VITE_CLERK_PUBLISHABLE_KEY in your environment variables.");
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Ne pas retry automatiquement les erreurs d'auth
      retry: (failureCount, error) => {
        // Ne pas retry les erreurs UNAUTHORIZED
        if (error && typeof error === "object" && "message" in error) {
          const msg = (error as { message: string }).message;
          if (msg.includes("10001") || msg.includes("login")) {
            return false;
          }
        }
        return failureCount < 2;
      },
      // Désactiver le refetch automatique sur focus pour éviter les boucles
      refetchOnWindowFocus: false,
    },
  },
});

// SUPPRIMÉ : Les redirections automatiques sur UNAUTHORIZED qui causaient
// une boucle infinie avec Clerk. La gestion de l'authentification est 
// maintenant faite par useClerkSync + les pages individuelles.

// Log les erreurs API sans rediriger
queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    console.warn("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    console.warn("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster />
      </QueryClientProvider>
    </trpc.Provider>
  </ClerkProvider>
);
