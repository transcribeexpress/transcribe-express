# Diagnostic Complet - Bug Reboot Dashboard

## Date: 16 février 2026

## Fichiers audités (10/10)

1. `client/src/main.tsx` - Point d'entrée React, providers, intercepteurs
2. `client/src/App.tsx` - Routing, protection des routes
3. `client/src/hooks/useAuth.ts` - Hook d'authentification Clerk
4. `client/src/pages/Dashboard.tsx` - Page Dashboard
5. `client/src/pages/Upload.tsx` - Page Upload
6. `client/src/pages/Login.tsx` - Page Login
7. `client/src/pages/SSOCallback.tsx` - Callback OAuth
8. `client/src/components/UserMenu.tsx` - Menu utilisateur
9. `client/src/components/LoginButton.tsx` - Boutons OAuth
10. `server/_core/context.ts` + `server/_core/sdk.ts` - Auth serveur

## Architecture d'authentification actuelle

```
Clerk (frontend) → useAuth() → isSignedIn
                                    ↓
                            Dashboard/Upload vérifient isSignedIn
                                    ↓
                            Si !isSignedIn → setLocation("/login") [useEffect]
                                    ↓
                            Login détecte isSignedIn → setLocation("/dashboard")
                                    ↓
                            BOUCLE INFINIE

Manus OAuth (backend) → cookie session → tRPC context → ctx.user
                                    ↓
                            Si pas de cookie → TRPCError UNAUTHORIZED
                                    ↓
                            main.tsx intercepte → window.location.href = "/login"
                                    ↓
                            BOUCLE INFINIE (2ème source)
```

## PROBLÈME FONDAMENTAL IDENTIFIÉ

Il y a **DEUX systèmes d'authentification en conflit** :

### Système 1 : Clerk (frontend)
- ClerkProvider dans main.tsx
- useAuth() utilise `useUser()` et `useClerk()` de Clerk
- isSignedIn vient de Clerk
- LoginButton utilise `signIn.authenticateWithRedirect` de Clerk

### Système 2 : Manus OAuth (backend)
- Cookie `app_session_id` géré par le SDK Manus
- `sdk.authenticateRequest()` vérifie le cookie JWT
- `protectedProcedure` lance UNAUTHORIZED si pas de session Manus
- main.tsx intercepte les erreurs UNAUTHORIZED et redirige vers /login

### Le conflit :
1. L'utilisateur se connecte via Clerk (GitHub/Google)
2. Clerk est satisfait → `isSignedIn = true` côté frontend
3. Le Dashboard s'affiche et lance `trpc.transcriptions.list.useQuery()`
4. La requête tRPC arrive au serveur
5. Le serveur vérifie le cookie `app_session_id` (Manus OAuth)
6. **MAIS** Clerk ne crée PAS de cookie `app_session_id` → le serveur rejette
7. Le serveur renvoie UNAUTHORIZED ("Please login (10001)")
8. main.tsx intercepte l'erreur → `window.location.href = "/login"`
9. Login détecte `isSignedIn = true` (Clerk) → redirige vers `/dashboard`
10. **BOUCLE INFINIE**

## SOURCES DE REBOOT (3 identifiées)

### Source 1 : main.tsx lignes 22-48
```typescript
const redirectToLoginIfUnauthorized = (error: unknown) => {
  // Intercepte TOUTES les erreurs UNAUTHORIZED
  // Redirige vers /login avec window.location.href (rechargement complet)
};
```

### Source 2 : Dashboard.tsx lignes 115-120
```typescript
useEffect(() => {
  if (!isLoading && !isSignedIn) {
    setLocation("/login");
  }
}, [isSignedIn, isLoading, setLocation]);
```

### Source 3 : Upload.tsx lignes 73-78
```typescript
useEffect(() => {
  if (!isLoading && !isSignedIn) {
    setLocation("/login");
  }
}, [isSignedIn, isLoading, setLocation]);
```

## SOLUTION REQUISE

Le problème n'est PAS juste les useEffect de redirection.
Le problème est que **Clerk et Manus OAuth ne sont pas synchronisés**.

Quand Clerk authentifie l'utilisateur, il faut aussi créer la session Manus OAuth
(cookie `app_session_id`) pour que les requêtes tRPC fonctionnent.

### Options :
1. **Synchroniser Clerk → Manus OAuth** : Après auth Clerk, appeler un endpoint
   qui crée le cookie Manus à partir du token Clerk
2. **Supprimer les redirections automatiques** : Ne pas rediriger sur UNAUTHORIZED,
   afficher un message d'erreur à la place
3. **Modifier le contexte serveur** : Accepter aussi les tokens Clerk côté serveur
