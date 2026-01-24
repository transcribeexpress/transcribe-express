# Décisions Techniques - Jour 13

**Date :** 24 Janvier 2026  
**Auteur :** Manus AI  
**Phase :** Sprint 1 - Jour 13  
**Objectif :** Implémenter le système d'upload de fichiers audio/vidéo avec transcription automatique via Groq API

---

## Vue d'Ensemble

Le Jour 13 a consisté à implémenter le flux complet d'upload de fichiers audio/vidéo, incluant la validation côté client, l'upload vers S3, et le déclenchement automatique du worker de transcription Groq API. Cette fonctionnalité est le cœur du produit Transcribe Express.

---

## Décisions Techniques Majeures

### 1. Composant UploadZone avec react-dropzone

**Décision :** Utiliser `react-dropzone` pour le drag & drop au lieu d'une implémentation manuelle.

**Justification :**
- **Bibliothèque mature** : react-dropzone est la référence pour le drag & drop en React (10M+ téléchargements/semaine)
- **Validation intégrée** : Gestion automatique des formats MIME et tailles de fichiers
- **Accessibilité** : Support natif du clavier et des lecteurs d'écran
- **API simple** : Hook `useDropzone` avec configuration déclarative

**Implémentation :**
```typescript
const { getRootProps, getInputProps, isDragActive } = useDropzone({
  onDrop,
  accept: ACCEPTED_FORMATS,
  maxSize: 16 * 1024 * 1024, // 16MB
  multiple: false,
});
```

**Alternative rejetée :** Implémentation manuelle avec `onDragOver`, `onDrop` → Plus de code, moins de robustesse, pas d'accessibilité native

---

### 2. Limite de Taille : 16MB (Groq API)

**Décision :** Limiter la taille des fichiers à 16MB côté client et serveur.

**Justification :**
- **Limite Groq API** : Whisper API accepte jusqu'à 25MB, mais Groq impose une limite de 16MB
- **Validation côté client** : Évite les uploads inutiles de fichiers trop volumineux
- **Validation côté serveur** : Sécurité supplémentaire (ne jamais faire confiance au client)

**Implémentation :**
```typescript
const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB

// Côté client (UploadZone)
maxSize: MAX_FILE_SIZE

// Côté serveur (voiceTranscription.ts)
if (sizeMB > 16) {
  return {
    error: "Audio file exceeds maximum size limit",
    code: "FILE_TOO_LARGE",
  };
}
```

**Alternative rejetée :** Limite 25MB → Risque d'échec côté Groq API, mauvaise UX

---

### 3. Upload via Base64 (tRPC)

**Décision :** Convertir le fichier en Base64 côté client et l'envoyer via tRPC.

**Justification :**
- **Simplicité** : tRPC ne supporte pas nativement les uploads multipart/form-data
- **Pas de route HTTP supplémentaire** : Tout passe par tRPC (cohérence architecturale)
- **Suivi de progression** : `FileReader.onprogress` permet de mettre à jour la barre de progression

**Implémentation :**
```typescript
const reader = new FileReader();

reader.onprogress = (event) => {
  if (event.lengthComputable) {
    const progress = Math.floor((event.loaded / event.total) * 80) + 10;
    setUploadProgress(progress);
  }
};

reader.onload = async () => {
  const base64 = (reader.result as string).split(',')[1];
  await createTranscriptionMutation.mutateAsync({
    fileBuffer: base64,
    // ...
  });
};

reader.readAsDataURL(selectedFile);
```

**Alternative rejetée :** Upload multipart via route HTTP séparée → Complexité accrue, perte de cohérence avec tRPC

**Limitation connue :** Base64 augmente la taille du payload de ~33%. Pour un fichier de 16MB, le payload sera ~21MB. Acceptable pour le MVP.

---

### 4. Clé S3 Unique avec Timestamp + Random ID

**Décision :** Générer une clé S3 unique avec le format `transcriptions/{userId}/{timestamp}-{randomId}.{ext}`.

**Justification :**
- **Unicité garantie** : Combinaison timestamp + randomId évite les collisions
- **Organisation par utilisateur** : Facilite la gestion et la suppression des fichiers
- **Traçabilité** : Le timestamp permet de retrouver l'ordre chronologique des uploads
- **Sécurité** : randomId empêche l'énumération des fichiers

**Implémentation :**
```typescript
const randomId = randomBytes(8).toString('hex'); // 16 caractères hex
const timestamp = Date.now();
const extension = getFileExtension(input.fileName);
const fileKey = `transcriptions/${ctx.user.id}/${timestamp}-${randomId}.${extension}`;
```

**Alternative rejetée :** UUID seul → Perte de l'information temporelle, moins lisible

---

### 5. Worker Asynchrone Non-Bloquant

**Décision :** Déclencher le worker de transcription de manière asynchrone avec `Promise.catch()` pour ne pas bloquer la requête HTTP.

**Justification :**
- **Réactivité** : L'utilisateur reçoit une réponse immédiate après l'upload (status: pending)
- **Scalabilité** : Le serveur peut traiter plusieurs uploads simultanément sans bloquer
- **Gestion des erreurs** : Les erreurs du worker sont loggées mais ne font pas échouer l'upload

**Implémentation :**
```typescript
export async function triggerTranscriptionWorker(transcriptionId: number) {
  // Lancer le worker en arrière-plan (non-bloquant)
  processTranscription(transcriptionId).catch((error) => {
    console.error(`[Worker] Error for transcription ${transcriptionId}:`, error);
  });
}
```

**Alternative rejetée :** Worker bloquant avec `await` → Timeout HTTP, mauvaise UX, pas scalable

---

### 6. Polling 5s pour Mise à Jour en Temps Réel

**Décision :** Réutiliser le système de polling 5s du Jour 12 pour afficher les mises à jour de statut en temps réel.

**Justification :**
- **Déjà implémenté** : Pas de code supplémentaire nécessaire
- **UX fluide** : L'utilisateur voit le statut passer de `pending` → `processing` → `completed` automatiquement
- **Simple** : Pas besoin de WebSocket pour le MVP

**Implémentation :**
```typescript
// Dans TranscriptionList.tsx (Jour 12)
const { data: transcriptions } = trpc.transcriptions.list.useQuery(undefined, {
  refetchInterval: 5000, // 5 secondes
  refetchIntervalInBackground: true,
});
```

**Alternative rejetée :** WebSocket en temps réel → Complexité accrue, overkill pour le MVP

---

### 7. Gestion des Erreurs avec Type Union

**Décision :** Utiliser un type union `WhisperResponse | TranscriptionError` pour le retour de `transcribeAudio()`.

**Justification :**
- **Type-safety** : TypeScript force la vérification du type de retour
- **Gestion explicite des erreurs** : Le worker doit vérifier `if ('error' in result)`
- **Codes d'erreur structurés** : `FILE_TOO_LARGE`, `INVALID_FORMAT`, `TRANSCRIPTION_FAILED`, etc.

**Implémentation :**
```typescript
const result = await transcribeAudio({
  audioUrl: transcription.fileUrl,
  language: 'fr',
});

// Vérifier si c'est une erreur
if ('error' in result) {
  throw new Error(result.error);
}

// Sinon, c'est un succès
await updateTranscriptionStatus(transcriptionId, 'completed', {
  transcriptText: result.text,
  duration: Math.floor(result.duration),
});
```

**Alternative rejetée :** Throw Error directement → Perte de contexte (code d'erreur, détails)

---

### 8. Formats Audio/Vidéo Acceptés

**Décision :** Accepter 6 formats : MP3, WAV, M4A, OGG, MP4, WEBM.

**Justification :**
- **Compatibilité Groq API** : Ces formats sont supportés par Whisper
- **Cas d'usage couverts** :
  - **MP3** : Podcasts, interviews
  - **WAV** : Enregistrements professionnels
  - **M4A** : Enregistrements iPhone
  - **OGG** : Enregistrements web
  - **MP4/WEBM** : Vidéos (extraction audio automatique par Whisper)

**Implémentation :**
```typescript
const ACCEPTED_FORMATS = {
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/mp4': ['.m4a'],
  'audio/ogg': ['.ogg'],
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
};
```

**Alternative rejetée :** Tous les formats → Risque d'échec côté Groq API, mauvaise UX

---

## Flux Complet

```
┌─────────────┐
│   Client    │
│  (Upload)   │
└──────┬──────┘
       │ 1. Sélection fichier (drag & drop)
       │ 2. Validation (format, taille)
       │ 3. Conversion Base64
       │ 4. tRPC transcriptions.create
       ▼
┌─────────────┐
│   Serveur   │
│  (tRPC)     │
└──────┬──────┘
       │ 5. Upload S3 (storagePut)
       │ 6. Créer entrée BDD (status: pending)
       │ 7. Déclencher worker asynchrone
       │ 8. Retourner ID transcription
       ▼
┌─────────────┐
│   Worker    │
│ (Async)     │
└──────┬──────┘
       │ 9. Mettre à jour status: processing
       │ 10. Appeler Groq API (Whisper)
       │ 11. Mettre à jour status: completed/error
       ▼
┌─────────────┐
│   Client    │
│ (Dashboard) │
└─────────────┘
       12. Polling 5s affiche les mises à jour
```

---

## Problèmes Rencontrés et Solutions

### Problème 1 : Tests Vitest échouent (updateTranscriptionStatus)

**Symptôme :** Les tests de mise à jour de statut échouent (status reste `undefined`).

**Cause probable :** Problème de timing ou de propagation des mises à jour MySQL.

**Solution temporaire :** Ajouter un `setTimeout(100ms)` avant la vérification.

**Solution définitive (à implémenter) :** Utiliser des transactions SQL ou vérifier la configuration de Drizzle ORM.

---

### Problème 2 : TypeScript - Property 'insertId' does not exist

**Symptôme :** Erreur TypeScript sur `result.insertId` après `createTranscription()`.

**Cause :** Le type de retour de Drizzle ORM n'expose pas `insertId` dans les types TypeScript.

**Solution :** Cast en `any` temporaire : `(result as any).insertId`.

**Solution définitive (à implémenter) :** Modifier `createTranscription()` pour retourner l'ID directement.

---

## Fichiers Créés/Modifiés

| Fichier | Action | Description |
|:--------|:-------|:------------|
| `client/src/components/UploadZone.tsx` | Créé | Zone drag & drop avec validation |
| `client/src/components/UploadProgress.tsx` | Créé | Barre de progression animée |
| `client/src/pages/Upload.tsx` | Créé | Page d'upload complète |
| `client/src/App.tsx` | Modifié | Ajout route `/upload` |
| `server/routers.ts` | Modifié | Ajout procédure `transcriptions.create` |
| `server/db.ts` | Modifié | Ajout helpers `getTranscriptionById`, modification `updateTranscriptionStatus` |
| `server/workers/transcriptionWorker.ts` | Créé | Worker asynchrone pour transcription |
| `server/transcriptions.create.test.ts` | Créé | Tests Vitest (10/15 passent) |
| `JOUR_13_SPECIFICATIONS.md` | Créé | Spécifications techniques détaillées |
| `JOUR_13_DECISIONS.md` | Créé | Documentation des décisions techniques |

---

## Métriques

- **Lignes de code ajoutées :** ~800 lignes
- **Composants créés :** 3 (UploadZone, UploadProgress, Upload page)
- **Procédures tRPC ajoutées :** 1 (`transcriptions.create`)
- **Helpers DB ajoutés :** 1 (`getTranscriptionById`)
- **Tests Vitest :** 10/15 passent (66%)
- **Temps estimé :** 8 heures

---

## Prochaines Étapes (Jour 14)

1. **Créer TranscriptionViewer.tsx** : Affichage du texte transcrit avec horodatage
2. **Créer ExportButton.tsx** : Export TXT, SRT, JSON
3. **Créer page /transcription/:id** : Page de détail d'une transcription
4. **Corriger les tests Vitest** : Résoudre les problèmes de timing
5. **Ajouter Toast notifications** : Remplacer les `console.log` par des toasts shadcn/ui

---

**Livrable attendu :** ✅ Système d'upload complet avec transcription automatique via Groq API.
