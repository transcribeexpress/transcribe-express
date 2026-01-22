# Spécifications Jour 11 - Authentification Clerk

**Extrait de :** SPRINT_1_PLAN.md et TODO.md
**Date :** 21 Janvier 2026

---

## Objectif du Jour 11

**Implémenter le flux d'authentification complet avec Clerk OAuth.**

---

## Tâches Techniques (5 heures)

### 1. Créer la page de connexion (/login) [2h]
- Composant `LoginButton.tsx` avec icônes Google/GitHub
- Utilisation de Clerk OAuth (pas Manus OAuth)
- Styling avec Tailwind CSS + palette Magenta (#BE34D5) / Cyan (#34D5BE)

### 2. Implémenter le hook useAuth() [1h]
- Wrapper autour de Clerk SDK
- Exposition de `user`, `isLoading`, `logout()`

### 3. Créer le composant UserMenu.tsx [1h]
- Avatar utilisateur (40x40px, border-radius 50%)
- Dropdown avec options : Profil, Déconnexion
- Utilisation de shadcn/ui DropdownMenu

### 4. Tester le flux complet [1h]
- Connexion Google → Callback → Redirection /dashboard
- Connexion GitHub → Callback → Redirection /dashboard
- Déconnexion → Redirection /login

---

## Livrable Attendu

**Authentification fonctionnelle avec Google et GitHub via Clerk.**

---

## Prompt Manus (Vibe Coding)

```
Manus, implémente le flux d'authentification utilisateur complet pour Transcribe Express.

Contexte :
- Utilise Clerk OAuth avec Google et GitHub
- Respecte l'identité visuelle : Dark Mode First, Magenta #BE34D5, Cyan #34D5BE

Tâches :
1. Crée la page /login avec 2 boutons OAuth (Google, GitHub)
2. Crée le composant LoginButton.tsx avec icônes et styling
3. Crée le composant UserMenu.tsx avec avatar et dropdown
4. Implémente la redirection automatique après connexion vers /dashboard
5. Teste le flux complet : Connexion → Callback → Dashboard

Références :
- Maquette : UI_MOCKUPS.md (Maquette 1)
- Composants : COMPONENT_STRUCTURE.md (Module auth)
- Identité visuelle : Source_de_verite_unique.md (Section Designer UI/UX)
```

---

## Stack Technique Requise

| Technologie | Version | Usage |
|:------------|:--------|:------|
| Clerk SDK | Latest | Authentification OAuth |
| React | 19 | Composants UI |
| TypeScript | 5.x | Type-safety |
| Tailwind CSS | 4.x | Styling |
| shadcn/ui | Latest | DropdownMenu, Button |
| Wouter | 3.x | Routing côté client |

---

## Clés API Clerk Disponibles

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` : Clé publique Clerk
- `CLERK_SECRET_KEY` : Clé secrète Clerk (backend)

**Source :** TODO.md - "Clerk configuré : Application renommée, OAuth Google/GitHub activés, clés API récupérées"

---

## Références Documentaires

1. **UI_MOCKUPS.md** - Maquette 1 (Page Login)
2. **COMPONENT_STRUCTURE.md** - Module auth
3. **Source_de_verite_unique.md** - Identité visuelle
4. **07_STACK_TECHNIQUE.md** - Stack technique validée
