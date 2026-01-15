# Structure des Composants - Transcribe Express

**Auteur :** Manus AI (Dev Full Stack)  
**Date :** 15 Janvier 2026  
**Version :** 1.0  
**Framework Frontend :** Next.js 15 + React 19  
**Framework Backend :** Express.js 4 + tRPC 11

---

## Vue d'Ensemble

L'architecture des composants de Transcribe Express suit une approche **modulaire** et **scalable** qui sépare clairement les responsabilités entre le frontend (client) et le backend (server). Le projet utilise un **monorepo** pour faciliter le partage de types et de constantes entre les deux environnements.

La structure privilégie la **convention over configuration** avec des dossiers organisés par fonctionnalité plutôt que par type de fichier. Cette approche permet une navigation intuitive et facilite l'ajout de nouvelles fonctionnalités sans restructuration majeure.

---

## Architecture Globale du Monorepo

```
transcribe-express/
├── client/                 # Frontend Next.js + React
│   ├── public/            # Assets statiques (favicon, robots.txt)
│   └── src/               # Code source frontend
├── server/                # Backend Express.js + tRPC
│   ├── _core/             # Infrastructure (OAuth, context, trpc)
│   ├── db.ts              # Requêtes Drizzle
│   ├── routers.ts         # Procédures tRPC
│   ├── worker.ts          # Worker asynchrone
│   ├── s3.ts              # Helpers AWS S3
│   └── groq.ts            # Helpers Groq API
├── drizzle/               # Schéma et migrations BDD
│   ├── schema.ts          # Définition des tables
│   └── migrations/        # Migrations SQL versionnées
├── shared/                # Code partagé (types, constantes)
│   └── const.ts           # Constantes globales
└── package.json           # Dépendances et scripts
```

---

## Frontend : Architecture des Composants

### Structure des Dossiers

```
client/src/
├── _core/                     # Infrastructure frontend
│   ├── hooks/
│   │   └── useAuth.tsx       # Hook d'authentification Manus OAuth
│   └── types/
│       └── index.ts          # Types globaux frontend
├── components/                # Composants réutilisables
│   ├── ui/                   # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── progress.tsx
│   │   ├── table.tsx
│   │   └── toast.tsx
│   ├── ErrorBoundary.tsx     # Gestion des erreurs React
│   └── [à créer]             # Composants métier (voir ci-dessous)
├── contexts/                  # React Contexts
│   └── ThemeContext.tsx      # Gestion du thème (dark mode)
├── hooks/                     # Custom hooks métier
│   └── [à créer]             # Hooks métier (voir ci-dessous)
├── lib/                       # Utilitaires et configuration
│   ├── trpc.ts               # Client tRPC
│   └── utils.ts              # Fonctions utilitaires (cn, etc.)
├── pages/                     # Pages de l'application
│   ├── Home.tsx              # Page d'accueil (landing)
│   ├── NotFound.tsx          # Page 404
│   └── [à créer]             # Pages métier (voir ci-dessous)
├── App.tsx                    # Routes et layout principal
├── main.tsx                   # Point d'entrée React
└── index.css                  # Styles globaux (Tailwind + tokens)
```

### Modules Métier à Créer

#### 1. Module Authentification (`auth`)

**Composants :**
- `components/LoginButton.tsx` : Bouton de connexion OAuth (Google/GitHub)
- `components/UserMenu.tsx` : Menu utilisateur (profil, déconnexion)

**Pages :**
- `pages/Login.tsx` : Page de connexion avec choix OAuth
- `pages/Callback.tsx` : Page de callback OAuth (redirection automatique)

**Hooks :**
- `useAuth()` : Hook existant dans `_core/hooks/useAuth.tsx`

**Workflow :**
1. Utilisateur clique sur "Se connecter avec Google/GitHub"
2. Redirection vers `getLoginUrl()` (fourni par Manus OAuth)
3. Callback OAuth vers `/api/oauth/callback`
4. Redirection automatique vers `/dashboard`

---

#### 2. Module Dashboard (`dashboard`)

**Composants :**
- `components/DashboardLayout.tsx` : Layout avec sidebar et header
- `components/TranscriptionList.tsx` : Liste des transcriptions avec statuts
- `components/TranscriptionCard.tsx` : Card d'une transcription (nom, durée, statut)
- `components/StatusBadge.tsx` : Badge de statut (pending, processing, completed, error)

**Pages :**
- `pages/Dashboard.tsx` : Page principale du dashboard

**Hooks :**
- `hooks/useTranscriptions.ts` : Hook pour récupérer les transcriptions
  ```typescript
  const { data, isLoading } = trpc.transcriptions.list.useQuery();
  ```
- `hooks/usePolling.ts` : Hook pour le polling des statuts en temps réel
  ```typescript
  usePolling(() => {
    trpc.useUtils().transcriptions.list.invalidate();
  }, 5000); // Polling toutes les 5 secondes
  ```

**Workflow :**
1. Utilisateur arrive sur `/dashboard` après connexion
2. Affichage de la liste des transcriptions avec statuts
3. Polling automatique pour mettre à jour les statuts en temps réel
4. Actions : Télécharger résultats, Supprimer transcription

---

#### 3. Module Upload (`upload`)

**Composants :**
- `components/UploadZone.tsx` : Zone de drag & drop avec validation
- `components/UploadProgress.tsx` : Barre de progression d'upload
- `components/FileValidator.tsx` : Validation des fichiers (taille, format)

**Pages :**
- `pages/Upload.tsx` : Page d'upload avec drag & drop

**Hooks :**
- `hooks/useUpload.ts` : Hook pour gérer l'upload vers S3
  ```typescript
  const { upload, progress, isUploading } = useUpload();
  ```

**Workflow :**
1. Utilisateur drag & drop un fichier audio/vidéo
2. Validation côté client (taille max 1 Go, formats acceptés)
3. Récupération d'une URL pré-signée S3 via `trpc.transcriptions.getUploadUrl.useMutation()`
4. Upload direct vers S3 avec suivi de progression
5. Création du job de transcription via `trpc.transcriptions.create.useMutation()`
6. Redirection vers `/dashboard` avec notification de succès

---

#### 4. Module Résultats (`results`)

**Composants :**
- `components/ResultsPanel.tsx` : Panneau d'affichage des résultats
- `components/DownloadButton.tsx` : Bouton de téléchargement (SRT, VTT, TXT)
- `components/TranscriptViewer.tsx` : Visualiseur de transcription (TXT)

**Pages :**
- `pages/Results.tsx` : Page de détails d'une transcription

**Hooks :**
- `hooks/useTranscription.ts` : Hook pour récupérer une transcription par ID
  ```typescript
  const { data, isLoading } = trpc.transcriptions.get.useQuery({ id });
  ```

**Workflow :**
1. Utilisateur clique sur une transcription dans le dashboard
2. Affichage des détails (nom, durée, statut, résultats)
3. Téléchargement des résultats (SRT, VTT, TXT) via URLs S3
4. Suppression de la transcription si nécessaire

---

### Conventions de Nommage Frontend

| Type | Convention | Exemple |
|:-----|:-----------|:--------|
| **Composants** | PascalCase | `TranscriptionList.tsx` |
| **Hooks** | camelCase avec préfixe `use` | `useTranscriptions.ts` |
| **Pages** | PascalCase | `Dashboard.tsx` |
| **Utilitaires** | camelCase | `formatDuration.ts` |
| **Constantes** | SCREAMING_SNAKE_CASE | `MAX_FILE_SIZE` |
| **Types** | PascalCase | `TranscriptionStatus` |

---

## Backend : Architecture des Modules

### Structure des Dossiers

```
server/
├── _core/                     # Infrastructure backend
│   ├── context.ts            # Contexte tRPC (user, req, res)
│   ├── cookies.ts            # Gestion des cookies de session
│   ├── env.ts                # Variables d'environnement typées
│   ├── index.ts              # Point d'entrée Express
│   ├── llm.ts                # Helpers LLM (Manus Forge API)
│   ├── map.ts                # Helpers Google Maps
│   ├── notification.ts       # Notifications propriétaire
│   ├── oauth.ts              # OAuth Manus
│   ├── startWorker.ts        # Démarrage du worker asynchrone
│   ├── systemRouter.ts       # Routes système (notifications)
│   ├── trpc.ts               # Configuration tRPC
│   └── voiceTranscription.ts # Helpers transcription vocale
├── db.ts                      # Requêtes Drizzle (upsertUser, getUserByOpenId, etc.)
├── routers.ts                 # Procédures tRPC (auth, transcriptions)
├── worker.ts                  # Worker asynchrone (processTranscription, startWorker)
├── s3.ts                      # Helpers AWS S3 (generateUploadUrl, uploadToS3, deleteFromS3)
├── groq.ts                    # Helpers Groq API (transcribeAudio, convertToSRT, convertToVTT)
└── secrets.test.ts            # Tests vitest pour valider les secrets
```

### Modules Métier Backend

#### 1. Module Authentification (`auth`)

**Fichiers :**
- `server/_core/oauth.ts` : Gestion OAuth Manus (déjà implémenté)
- `server/_core/context.ts` : Injection du user dans le contexte tRPC
- `server/db.ts` : Fonctions `upsertUser()`, `getUserByOpenId()`

**Procédures tRPC :**
- `auth.me` : Récupérer l'utilisateur connecté
  ```typescript
  auth.me: publicProcedure.query(opts => opts.ctx.user)
  ```
- `auth.logout` : Déconnexion (suppression du cookie de session)
  ```typescript
  auth.logout: publicProcedure.mutation(({ ctx }) => {
    ctx.res.clearCookie(COOKIE_NAME, { maxAge: -1 });
    return { success: true };
  })
  ```

**Workflow :**
1. Callback OAuth vers `/api/oauth/callback`
2. Création/mise à jour de l'utilisateur via `upsertUser()`
3. Création d'un cookie de session signé (JWT)
4. Redirection vers `/dashboard`

---

#### 2. Module Transcriptions (`transcriptions`)

**Fichiers :**
- `server/routers.ts` : Procédures tRPC (list, get, create, delete, getUploadUrl)
- `server/db.ts` : Fonctions de requête Drizzle (à ajouter)
  ```typescript
  export async function getUserTranscriptions(userId: number) {
    const db = await getDb();
    return db.select().from(transcriptions).where(eq(transcriptions.userId, userId));
  }
  
  export async function getTranscriptionById(id: number, userId: number) {
    const db = await getDb();
    const result = await db.select().from(transcriptions)
      .where(and(eq(transcriptions.id, id), eq(transcriptions.userId, userId)))
      .limit(1);
    return result[0];
  }
  
  export async function createTranscription(data: InsertTranscription) {
    const db = await getDb();
    await db.insert(transcriptions).values(data);
  }
  
  export async function deleteTranscription(id: number) {
    const db = await getDb();
    await db.delete(transcriptions).where(eq(transcriptions.id, id));
  }
  ```

**Procédures tRPC :**
- `transcriptions.list` : Récupérer toutes les transcriptions de l'utilisateur
- `transcriptions.get` : Récupérer une transcription par ID
- `transcriptions.create` : Créer un job de transcription
- `transcriptions.delete` : Supprimer une transcription (+ fichiers S3)
- `transcriptions.getUploadUrl` : Générer une URL pré-signée S3

**Workflow :**
1. Frontend appelle `transcriptions.getUploadUrl` pour obtenir une URL S3
2. Frontend upload le fichier directement vers S3
3. Frontend appelle `transcriptions.create` avec l'URL S3
4. Backend crée un enregistrement en BDD avec statut `pending`
5. Worker récupère le job et le traite asynchrone

---

#### 3. Module Worker (`worker`)

**Fichiers :**
- `server/worker.ts` : Logique du worker (processTranscription, startWorker)
- `server/groq.ts` : Helpers Groq API
- `server/s3.ts` : Helpers S3 pour upload des résultats

**Fonctions :**
- `processTranscription(transcription)` : Traiter un job de transcription
  1. Mettre à jour le statut en `processing`
  2. Télécharger le fichier depuis S3
  3. Appeler Groq API (Whisper Large v3-turbo)
  4. Générer les formats SRT, VTT, TXT
  5. Uploader les résultats vers S3
  6. Mettre à jour le statut en `completed`
  7. En cas d'erreur, mettre à jour le statut en `error` avec `errorMessage`

- `startWorker()` : Démarrer le worker avec polling 5s
  ```typescript
  setInterval(async () => {
    const pendingJobs = await db.select().from(transcriptions)
      .where(eq(transcriptions.status, "pending"))
      .limit(10);
    
    for (const job of pendingJobs) {
      await processTranscription(job);
    }
  }, 5000);
  ```

**Workflow :**
1. Worker démarre automatiquement au lancement du serveur
2. Polling toutes les 5 secondes pour récupérer les jobs `pending`
3. Traitement asynchrone de chaque job
4. Mise à jour du statut en BDD

---

#### 4. Module S3 (`s3`)

**Fichiers :**
- `server/s3.ts` : Helpers AWS S3

**Fonctions :**
- `generateUploadUrl(fileName, userId)` : Générer une URL pré-signée pour upload
- `uploadToS3(key, buffer, contentType)` : Uploader un fichier vers S3
- `deleteFromS3(url)` : Supprimer un fichier de S3

**Workflow :**
1. Frontend demande une URL pré-signée via `generateUploadUrl()`
2. Frontend upload directement vers S3 (pas de transit par le backend)
3. Worker upload les résultats via `uploadToS3()`
4. Suppression des fichiers via `deleteFromS3()` lors de la suppression d'une transcription

---

#### 5. Module Groq (`groq`)

**Fichiers :**
- `server/groq.ts` : Helpers Groq API

**Fonctions :**
- `transcribeAudio(audioUrl)` : Transcrire un fichier audio via Groq API
  ```typescript
  const response = await fetch(audioUrl);
  const audioBuffer = await response.arrayBuffer();
  
  const formData = new FormData();
  formData.append('file', new Blob([audioBuffer]), 'audio.mp3');
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('response_format', 'verbose_json');
  
  const result = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: formData
  });
  
  return result.json();
  ```

- `convertToSRT(segments)` : Convertir les segments en format SRT
- `convertToVTT(segments)` : Convertir les segments en format VTT

**Workflow :**
1. Worker télécharge le fichier audio depuis S3
2. Worker appelle `transcribeAudio()` avec l'URL du fichier
3. Groq API retourne les segments avec timestamps
4. Worker génère les formats SRT et VTT via `convertToSRT()` et `convertToVTT()`
5. Worker upload les résultats vers S3

---

### Conventions de Nommage Backend

| Type | Convention | Exemple |
|:-----|:-----------|:--------|
| **Procédures tRPC** | camelCase | `transcriptions.list` |
| **Fonctions** | camelCase | `getUserTranscriptions()` |
| **Fichiers** | camelCase | `groq.ts` |
| **Constantes** | SCREAMING_SNAKE_CASE | `GROQ_API_KEY` |
| **Types** | PascalCase | `Transcription` |

---

## Shared : Code Partagé

### Structure des Dossiers

```
shared/
├── _core/
│   └── const.ts              # Constantes globales
└── const.ts                  # Constantes métier (à créer)
```

### Constantes Métier à Créer

```typescript
// shared/const.ts
export const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1 Go
export const ACCEPTED_FILE_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/m4a',
  'video/mp4',
  'video/webm',
  'video/ogg',
];

export const TRANSCRIPTION_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  ERROR: 'error',
} as const;

export const POLLING_INTERVAL = 5000; // 5 secondes
```

---

## Diagramme de Flux des Données

```
┌─────────────────────────────────────────────────────────────────┐
│                         UTILISATEUR                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ 1. Upload fichier
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ pages/Upload.tsx                                         │  │
│  │  - useUpload() hook                                      │  │
│  │  - trpc.transcriptions.getUploadUrl()                    │  │
│  │  - Upload direct vers S3                                 │  │
│  │  - trpc.transcriptions.create()                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │ 2. Appel API tRPC
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Express.js)                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ server/routers.ts                                        │  │
│  │  - transcriptions.getUploadUrl → generateUploadUrl()    │  │
│  │  - transcriptions.create → createTranscription()        │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ server/worker.ts                                         │  │
│  │  - Polling 5s pour jobs pending                          │  │
│  │  - processTranscription()                                │  │
│  │    1. Télécharger fichier depuis S3                      │  │
│  │    2. Appeler Groq API                                   │  │
│  │    3. Générer SRT, VTT, TXT                              │  │
│  │    4. Uploader résultats vers S3                         │  │
│  │    5. Mettre à jour statut en BDD                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │ 3. Polling frontend
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ pages/Dashboard.tsx                                      │  │
│  │  - usePolling() hook (5s)                                │  │
│  │  - trpc.transcriptions.list()                            │  │
│  │  - Affichage des statuts en temps réel                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Checklist de Validation

### Frontend
- [x] Structure des dossiers définie (`components/`, `pages/`, `hooks/`, `lib/`)
- [x] Modules métier identifiés (auth, dashboard, upload, results)
- [x] Composants à créer listés avec responsabilités
- [x] Hooks à créer listés avec signatures
- [x] Pages à créer listées avec workflows
- [x] Conventions de nommage établies

### Backend
- [x] Structure des dossiers définie (`_core/`, `db.ts`, `routers.ts`, `worker.ts`)
- [x] Modules métier identifiés (auth, transcriptions, worker, s3, groq)
- [x] Procédures tRPC listées avec signatures
- [x] Fonctions de requête Drizzle listées
- [x] Workflow du worker documenté
- [x] Conventions de nommage établies

### Shared
- [x] Constantes métier définies (MAX_FILE_SIZE, ACCEPTED_FILE_TYPES, etc.)
- [x] Types partagés identifiés

### Diagrammes
- [x] Diagramme de flux des données créé
- [x] Architecture globale du monorepo documentée

---

## Prochaines Étapes (Jour 10)

1. **Créer les maquettes UI** (wireframes) pour chaque page
2. **Documenter les spécifications UI/UX** (interactions, animations, feedback)
3. **Valider la cohérence** avec MVP_DEFINITION.md et ARCHITECTURE.md

---

**Document validé par :** Manus AI (Dev Full Stack)  
**Date de validation :** 15 Janvier 2026  
**Version :** 1.0 (MVP)
