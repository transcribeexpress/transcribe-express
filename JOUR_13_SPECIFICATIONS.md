# Jour 13 - Upload et Transcription

**Date :** 24 Janvier 2026  
**Objectif :** Implémenter le système d'upload de fichiers audio/vidéo avec validation, intégration S3, et déclenchement du worker de transcription Groq API  
**Durée estimée :** 8 heures

---

## 📋 Tâches Techniques (Ordre Chronologique)

### Tâche 1 : Créer le composant UploadZone.tsx [2h30]

**Détails :**
- Zone de drag & drop avec react-dropzone
- Validation des formats acceptés : mp3, wav, mp4, webm, m4a, ogg
- Limite de taille : 25MB (plan gratuit) / 16MB (limite Groq API)
- Affichage des erreurs de validation
- Preview du fichier sélectionné (nom, taille, durée si disponible)

**Livrables :**
- `client/src/components/UploadZone.tsx`
- Intégration de `react-dropzone` (à installer)
- Props :
  - `onFileSelect: (file: File) => void`
  - `maxSize?: number` (default: 16MB)
  - `acceptedFormats?: string[]`
- États :
  - Idle (zone vide avec message)
  - Drag Over (zone avec highlight)
  - File Selected (preview du fichier)
  - Error (message d'erreur)

**Validation à implémenter :**
```typescript
const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB (limite Groq API)
const ACCEPTED_FORMATS = [
  'audio/mpeg',      // mp3
  'audio/wav',       // wav
  'audio/mp4',       // m4a
  'audio/ogg',       // ogg
  'video/mp4',       // mp4
  'video/webm',      // webm
];
```

---

### Tâche 2 : Créer le composant UploadProgress.tsx [1h30]

**Détails :**
- Barre de progression avec pourcentage (0-100%)
- Animation fluide avec transition CSS
- Affichage du statut textuel :
  - "Préparation de l'upload..." (0-10%)
  - "Upload en cours..." (10-90%)
  - "Finalisation..." (90-100%)
- Bouton "Annuler" (optionnel pour MVP)

**Livrables :**
- `client/src/components/UploadProgress.tsx`
- Props :
  - `progress: number` (0-100)
  - `fileName: string`
  - `onCancel?: () => void`
- Utilisation de shadcn/ui Progress component
- Animation avec `transition-all duration-300 ease-in-out`

**Design :**
- Palette Magenta (#BE34D5) pour la barre de progression
- Background : `bg-gray-800/50`
- Texte : `text-gray-300`

---

### Tâche 3 : Intégration S3 et Procédure tRPC [2h30]

**Détails :**
- Créer la procédure tRPC `transcriptions.create`
- Upload du fichier vers S3 avec `storagePut()`
- Génération d'une clé S3 unique : `transcriptions/${userId}/${timestamp}-${randomId}.${ext}`
- Création de l'entrée en BDD avec statut `pending`

**Livrables :**
- Procédure tRPC `transcriptions.create` dans `server/routers.ts`
- Helper DB `createTranscription()` dans `server/db.ts`
- Upload côté client avec suivi de progression

**Procédure tRPC à créer :**
```typescript
transcriptions: router({
  create: protectedProcedure
    .input(z.object({
      fileName: z.string(),
      fileSize: z.number(),
      mimeType: z.string(),
      fileBuffer: z.string(), // Base64 encoded
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Générer une clé S3 unique
      const fileKey = `transcriptions/${ctx.user.id}/${Date.now()}-${randomId()}.${getExtension(input.fileName)}`;
      
      // 2. Upload vers S3
      const { url } = await storagePut(
        fileKey,
        Buffer.from(input.fileBuffer, 'base64'),
        input.mimeType
      );
      
      // 3. Créer l'entrée en BDD
      const transcription = await createTranscription({
        userId: ctx.user.id,
        fileName: input.fileName,
        fileUrl: url,
        fileKey: fileKey,
        status: 'pending',
      });
      
      // 4. Déclencher le worker asynchrone
      await triggerTranscriptionWorker(transcription.id);
      
      return transcription;
    }),
}),
```

**Helper DB à créer :**
```typescript
export async function createTranscription(data: {
  userId: number;
  fileName: string;
  fileUrl: string;
  fileKey: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [transcription] = await db
    .insert(transcriptions)
    .values(data)
    .returning();
  
  return transcription;
}
```

---

### Tâche 4 : Déclenchement du Worker de Transcription [1h30]

**Détails :**
- Créer le worker asynchrone `server/workers/transcriptionWorker.ts`
- Appeler Groq API avec Whisper Large v3-turbo
- Mettre à jour le statut en BDD (`processing` → `completed` ou `error`)
- Gérer les erreurs (timeout, format invalide, quota dépassé)

**Livrables :**
- `server/workers/transcriptionWorker.ts`
- Fonction `triggerTranscriptionWorker(transcriptionId: number)`
- Helper `updateTranscriptionStatus()` dans `server/db.ts`

**Worker à implémenter :**
```typescript
export async function triggerTranscriptionWorker(transcriptionId: number) {
  // Lancer le worker en arrière-plan (non-bloquant)
  processTranscription(transcriptionId).catch((error) => {
    console.error(`Worker error for transcription ${transcriptionId}:`, error);
  });
}

async function processTranscription(transcriptionId: number) {
  try {
    // 1. Récupérer la transcription
    const transcription = await getTranscriptionById(transcriptionId);
    if (!transcription) throw new Error("Transcription not found");
    
    // 2. Mettre à jour le statut à "processing"
    await updateTranscriptionStatus(transcriptionId, 'processing');
    
    // 3. Appeler Groq API
    const result = await transcribeAudio({
      audioUrl: transcription.fileUrl,
      language: 'fr', // Français par défaut
    });
    
    // 4. Mettre à jour avec le résultat
    await updateTranscriptionStatus(transcriptionId, 'completed', {
      transcriptText: result.text,
      duration: Math.floor(result.duration || 0),
    });
    
  } catch (error) {
    // 5. Gérer les erreurs
    await updateTranscriptionStatus(transcriptionId, 'error', {
      errorMessage: error.message,
    });
  }
}
```

**Helper DB à créer :**
```typescript
export async function updateTranscriptionStatus(
  transcriptionId: number,
  status: 'pending' | 'processing' | 'completed' | 'error',
  updates?: {
    transcriptText?: string;
    duration?: number;
    errorMessage?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(transcriptions)
    .set({
      status,
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(transcriptions.id, transcriptionId));
}

export async function getTranscriptionById(transcriptionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [transcription] = await db
    .select()
    .from(transcriptions)
    .where(eq(transcriptions.id, transcriptionId))
    .limit(1);
  
  return transcription;
}
```

---

## 📦 Composants à Créer/Modifier

| Fichier | Action | Description |
|:--------|:-------|:------------|
| `client/src/components/UploadZone.tsx` | Créer | Zone drag & drop avec validation |
| `client/src/components/UploadProgress.tsx` | Créer | Barre de progression animée |
| `client/src/pages/Dashboard.tsx` | Modifier | Ajouter modal d'upload au clic sur "+ Nouvelle Transcription" |
| `server/routers.ts` | Modifier | Ajouter procédure `transcriptions.create` |
| `server/db.ts` | Modifier | Ajouter helpers `createTranscription`, `updateTranscriptionStatus`, `getTranscriptionById` |
| `server/workers/transcriptionWorker.ts` | Créer | Worker asynchrone pour transcription Groq API |
| `server/transcriptions.create.test.ts` | Créer | Tests Vitest pour la procédure `create` |

---

## 🎯 Critères d'Acceptation

À la fin du Jour 13, les fonctionnalités suivantes doivent être **opérationnelles** et **testées** :

1. ✅ **Upload de fichier** : L'utilisateur peut sélectionner un fichier audio/vidéo via drag & drop ou clic
2. ✅ **Validation** : Les fichiers invalides (format, taille) sont rejetés avec un message d'erreur clair
3. ✅ **Progression** : Une barre de progression s'affiche pendant l'upload vers S3
4. ✅ **Transcription automatique** : Le worker se déclenche automatiquement après l'upload
5. ✅ **Mise à jour en temps réel** : Le statut de la transcription passe de `pending` → `processing` → `completed` (visible via polling 5s du Jour 12)
6. ✅ **Tests** : Tous les tests Vitest passent

---

## 🔗 Dépendances

**Packages npm à installer :**
```bash
pnpm add react-dropzone
pnpm add -D @types/react-dropzone
```

**Services externes requis :**
- AWS S3 (déjà configuré)
- Groq API (déjà configuré)

**Procédures tRPC existantes :**
- `transcriptions.list` (Jour 12) : Affiche la liste avec polling

**Helpers existants :**
- `storagePut()` : Upload vers S3 (déjà implémenté)
- `transcribeAudio()` : Appel Groq API (déjà implémenté dans `server/_core/voiceTranscription.ts`)

---

## 📝 Notes Importantes

1. **Limite de taille** : Groq API accepte jusqu'à 16MB. Afficher un message clair si le fichier dépasse cette limite.
2. **Format Base64** : Pour l'upload, convertir le fichier en Base64 côté client avant de l'envoyer via tRPC.
3. **Worker asynchrone** : Ne pas bloquer la requête HTTP. Utiliser `Promise.catch()` pour gérer les erreurs en arrière-plan.
4. **Polling** : Le dashboard (Jour 12) affichera automatiquement les mises à jour de statut grâce au polling 5s.
5. **UX** : Ajouter un skeleton loader ou spinner pendant l'upload pour éviter une page blanche.
6. **Sécurité** : Valider le type MIME côté serveur (ne pas se fier uniquement au client).

---

## 🎨 Design

**UploadZone :**
- Border dashed avec `border-2 border-dashed border-gray-600`
- Hover : `border-magenta-500` (#BE34D5)
- Drag Over : `bg-magenta-500/10`
- Icône : Upload Cloud (lucide-react)

**UploadProgress :**
- Barre : `bg-magenta-500` (#BE34D5)
- Background : `bg-gray-800/50`
- Texte : `text-gray-300`
- Animation : `transition-all duration-300 ease-in-out`

---

**Livrable attendu :** Système d'upload complet avec transcription automatique via Groq API.
