# Jour 17 - Spécifications Techniques : Optimisation du Flux de Transcription

**Date :** 27 janvier 2026  
**Sprint :** Sprint 2 - Semaine 3  
**Objectif :** Optimiser le flux de transcription avec retry automatique, validation avancée, indicateur multi-étapes et estimation de temps

---

## 📋 Vue d'Ensemble

Le Jour 17 se concentre sur l'optimisation du flux de transcription pour le rendre plus robuste et informatif. Les améliorations incluent :
1. **Retry automatique** avec backoff exponentiel (1s, 2s, 4s)
2. **Validation de durée audio** (max 60 min)
3. **Indicateur de progression** multi-étapes (Upload → Traitement → Transcription → Terminé)
4. **Estimation de temps** basée sur la durée audio
5. **Logs détaillés** pour le debugging

---

## 🏗️ Architecture

### Modules Créés

```
server/
  utils/
    retry.ts                          # Module retry avec backoff exponentiel
    retry.test.ts                     # Tests retry (16 tests)
  workers/
    transcriptionWorker.ts            # Intégration retry dans le worker

client/
  src/
    utils/
      audioValidation.ts              # Validation audio avancée
      audioValidation.test.ts         # Tests validation (26 tests)
    components/
      TranscriptionProgress.tsx       # Indicateur multi-étapes
    pages/
      Upload.tsx                      # Intégration validation + progression
```

---

## 🔧 Spécifications Détaillées

### 1. Module Retry (`server/utils/retry.ts`)

**Fonctionnalités :**
- Retry automatique avec backoff exponentiel
- Détection des erreurs retryables (réseau, rate limit, 5xx)
- Callback `onRetry` pour logging
- Configuration flexible (maxAttempts, initialDelayMs, backoffMultiplier)

**Interface :**
```typescript
export interface RetryOptions {
  maxAttempts?: number;           // Défaut : 3
  initialDelayMs?: number;        // Défaut : 1000ms
  backoffMultiplier?: number;     // Défaut : 2 (exponentiel)
  onRetry?: (attempt: number, error: Error) => void;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<RetryResult<T>>;

export function isRetryableError(error: Error): boolean;

export async function retryIfRetryable<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<RetryResult<T>>;
```

**Erreurs Retryables :**
- Erreurs réseau : `ECONNRESET`, `ETIMEDOUT`, `ENOTFOUND`
- Rate limit : `rate limit exceeded`, `too many requests`
- HTTP 5xx : `503`, `502`, `504`

**Exemple d'utilisation :**
```typescript
const result = await retryWithBackoff(
  async () => await transcribeAudio({ audioUrl, language }),
  {
    maxAttempts: 3,
    initialDelayMs: 1000,
    onRetry: (attempt, error) => {
      console.log(`Retry attempt ${attempt}:`, error.message);
    },
  }
);

if (result.success) {
  console.log('Success after', result.attempts, 'attempts');
} else {
  console.error('Failed after', result.attempts, 'attempts:', result.error);
}
```

---

### 2. Module Validation Audio (`client/src/utils/audioValidation.ts`)

**Fonctionnalités :**
- Validation de format (mp3, wav, m4a, webm, ogg, mp4)
- Validation de taille (< 16MB)
- Validation de durée (< 60 min)
- Obtention de la durée via HTMLMediaElement
- Formatage de durée et taille

**Interface :**
```typescript
export interface AudioValidationResult {
  valid: boolean;
  error?: string;
  duration?: number; // Durée en secondes
  size?: number;     // Taille en bytes
}

export const SUPPORTED_FORMATS: string[];
export const SUPPORTED_EXTENSIONS: string[];
export const MAX_FILE_SIZE_MB = 16;
export const MAX_FILE_SIZE_BYTES: number;
export const MAX_DURATION_MINUTES = 60;
export const MAX_DURATION_SECONDS: number;

export function validateFormat(file: File): boolean;
export function validateSize(file: File): boolean;
export function validateDuration(durationSeconds: number): boolean;
export async function getDurationFromFile(file: File): Promise<number | null>;
export async function validateAudioFile(
  file: File,
  checkDuration?: boolean
): Promise<AudioValidationResult>;
export function formatDuration(seconds: number): string;
export function formatFileSize(bytes: number): string;
```

**Exemple d'utilisation :**
```typescript
const validation = await validateAudioFile(file, true);

if (!validation.valid) {
  console.error(validation.error);
  // "Durée trop longue (65 min). Durée maximale : 60 min"
  return;
}

console.log('Durée:', formatDuration(validation.duration!));
console.log('Taille:', formatFileSize(validation.size!));
```

---

### 3. Composant TranscriptionProgress

**Fonctionnalités :**
- Affichage de 4 étapes : Upload → Traitement → Transcription → Terminé
- Barre de progression avec gradient Magenta/Cyan
- Estimation de temps restant
- Messages d'erreur
- Icônes animées (Loader2 pour l'étape en cours)

**Interface :**
```typescript
export type TranscriptionStep = 'upload' | 'processing' | 'transcription' | 'completed';

export interface TranscriptionProgressProps {
  currentStep: TranscriptionStep;
  progress?: number;          // Progression en % (0-100)
  estimatedTimeSeconds?: number; // Temps estimé restant en secondes
  error?: string;
}

export const TranscriptionProgress: React.FC<TranscriptionProgressProps>;

export function useTranscriptionProgress(
  currentStep: TranscriptionStep,
  audioDurationSeconds?: number
): { progress: number; estimatedTimeSeconds: number | undefined };
```

**Mapping Étapes → Progression :**
```typescript
const stepProgress: Record<TranscriptionStep, number> = {
  upload: 25,
  processing: 50,
  transcription: 75,
  completed: 100,
};
```

**Estimation de Temps :**
```typescript
// Formule : durée audio / 10 (Whisper traite ~10x plus vite)
const baseEstimate = Math.ceil(audioDurationSeconds / 10);

// Ajustement par étape
if (currentStep === 'upload') {
  estimatedTimeSeconds = baseEstimate + 5; // +5s pour l'upload
} else if (currentStep === 'processing') {
  estimatedTimeSeconds = baseEstimate + 2; // +2s pour le traitement
} else if (currentStep === 'transcription') {
  estimatedTimeSeconds = baseEstimate;
}
```

**Exemple d'utilisation :**
```typescript
const { progress, estimatedTimeSeconds } = useTranscriptionProgress(
  'transcription',
  180 // 3 minutes audio
);

<TranscriptionProgress
  currentStep="transcription"
  progress={progress}
  estimatedTimeSeconds={estimatedTimeSeconds}
  error={transcription.errorMessage}
/>
```

---

### 4. Intégration dans Upload.tsx

**Modifications :**
1. **Validation avant upload** : Appel de `validateAudioFile(file, true)`
2. **Stockage de la durée** : `setAudioDuration(validation.duration)`
3. **Polling de l'état** : `trpc.transcriptions.getById.useQuery` avec `refetchInterval: 2000`
4. **Affichage de TranscriptionProgress** : Remplace UploadProgress après l'upload
5. **Bouton "Voir les résultats"** : Apparaît quand `status === 'completed'`

**Flux Utilisateur :**
```
1. Sélection du fichier
   ↓
2. Validation (format, taille, durée)
   ↓ (si invalide)
   → Affichage de l'erreur
   ↓ (si valide)
3. Clic sur "Commencer la transcription"
   ↓
4. Upload (UploadProgress)
   ↓
5. Polling de l'état (toutes les 2s)
   ↓
6. Affichage de TranscriptionProgress
   - Upload (25%)
   - Traitement (50%)
   - Transcription (75%)
   - Terminé (100%)
   ↓
7. Bouton "Voir les résultats"
```

---

### 5. Intégration dans transcriptionWorker.ts

**Modifications :**
```typescript
// Avant
const result = await transcribeAudio({ audioUrl, language });

// Après
const result = await retryWithBackoff(
  async () => await transcribeAudio({ audioUrl, language }),
  {
    maxAttempts: 3,
    initialDelayMs: 1000,
    onRetry: (attempt, error) => {
      console.log(`[TranscriptionWorker] Retry attempt ${attempt} for transcription ${id}:`, error.message);
    },
  }
);

if (!result.success) {
  console.error(`[TranscriptionWorker] Failed after ${result.attempts} attempts:`, result.error);
  await updateTranscriptionStatus(id, 'error', result.error.message);
  return;
}

const transcriptionData = result.result;
```

---

## 📊 Tests

### Tests Retry (`server/utils/retry.test.ts`)

**16 tests :**
1. ✅ Should succeed on first attempt
2. ✅ Should retry on failure and succeed on second attempt
3. ✅ Should fail after max attempts
4. ✅ Should call onRetry callback before each retry
5. ✅ Should use exponential backoff delays
6. ✅ Should identify network errors as retryable
7. ✅ Should identify rate limit errors as retryable
8. ✅ Should identify HTTP 5xx errors as retryable
9. ✅ Should identify non-retryable errors
10. ✅ Should succeed on first attempt without retry (retryIfRetryable)
11. ✅ Should not retry non-retryable errors
12. ✅ Should retry retryable errors

### Tests Validation Audio (`client/src/utils/audioValidation.test.ts`)

**26 tests :**
1. ✅ Should accept supported MIME types
2. ✅ Should accept supported extensions even with unknown MIME type
3. ✅ Should reject unsupported formats
4. ✅ Should accept files under the size limit
5. ✅ Should accept files exactly at the size limit
6. ✅ Should reject files over the size limit
7. ✅ Should accept durations under the limit
8. ✅ Should accept durations exactly at the limit
9. ✅ Should reject durations over the limit
10. ✅ Should format durations correctly
11. ✅ Should format file sizes correctly
12. ✅ SUPPORTED_FORMATS should include all required formats
13. ✅ MAX_FILE_SIZE_BYTES should be 16MB
14. ✅ MAX_DURATION_SECONDS should be 60 minutes

**Résultat :** 98/98 tests passent (100%)

---

## 🎨 Design

### TranscriptionProgress

**Palette de Couleurs :**
- Étape complétée : `#06B6D4` (Cyan)
- Étape en cours : `#E935C1` (Magenta)
- Étape en attente : `text-muted-foreground`
- Barre de progression : Gradient `from-[#E935C1] to-[#06B6D4]`

**Icônes :**
- Complétée : `CheckCircle2` (Cyan)
- En cours : `Loader2` (Magenta, animé)
- En attente : `Circle` (gris)

**Responsive :**
- Mobile : Étapes empilées verticalement
- Desktop : Étapes horizontales avec lignes de connexion

---

## 📝 Messages d'Erreur

### Validation

**Format non supporté :**
```
Format non supporté. Formats acceptés : mp3, wav, m4a, webm, ogg, mp4
```

**Fichier trop volumineux :**
```
Fichier trop volumineux (18.50 MB). Taille maximale : 16 MB
```

**Durée trop longue :**
```
Durée trop longue (65 min). Durée maximale : 60 min
```

### Transcription

**Erreur réseau (après retry) :**
```
⚠️ Erreur de connexion après 3 tentatives. Veuillez réessayer plus tard.
```

**Quota dépassé :**
```
⚠️ Quota API dépassé. Veuillez réessayer dans quelques minutes.
```

**Timeout :**
```
⚠️ La transcription a pris trop de temps. Veuillez réessayer avec un fichier plus court.
```

---

## 🔄 Scénarios de Test

### Test 1 : Fichier Valide

**Input :**
- Fichier : `audio.mp3` (5 MB, 3 min)

**Résultat attendu :**
- ✅ Validation réussie
- ✅ Upload réussi
- ✅ Transcription réussie
- ✅ Estimation : ~18s (3 min / 10)

### Test 2 : Fichier Trop Long

**Input :**
- Fichier : `long-audio.mp3` (10 MB, 65 min)

**Résultat attendu :**
- ❌ Validation échouée
- ❌ Message : "Durée trop longue (65 min). Durée maximale : 60 min"
- ❌ Upload bloqué

### Test 3 : Erreur Réseau Temporaire

**Input :**
- Fichier : `audio.mp3` (5 MB, 3 min)
- Erreur réseau au 1er essai

**Résultat attendu :**
- ✅ Retry automatique après 1s
- ✅ Succès au 2ème essai
- ✅ Log : "Retry attempt 1 for transcription X: ETIMEDOUT"

### Test 4 : Erreur Persistante

**Input :**
- Fichier : `audio.mp3` (5 MB, 3 min)
- Erreur réseau aux 3 essais

**Résultat attendu :**
- ❌ Échec après 3 tentatives
- ❌ Message : "Erreur de connexion après 3 tentatives"
- ❌ Status : `error`

---

## ✅ Validation

**Critères de succès :**
- [x] Retry automatique avec backoff exponentiel (1s, 2s, 4s)
- [x] Validation de durée audio (max 60 min)
- [x] Indicateur de progression multi-étapes (4 étapes)
- [x] Estimation de temps (durée audio / 10)
- [x] Logs détaillés pour debugging
- [x] Tests Vitest 100% (98/98)
- [x] Messages d'erreur clairs et actionnables

**Livrables :**
- ✅ `server/utils/retry.ts` (150 lignes)
- ✅ `server/utils/retry.test.ts` (175 lignes)
- ✅ `client/src/utils/audioValidation.ts` (220 lignes)
- ✅ `client/src/utils/audioValidation.test.ts` (150 lignes)
- ✅ `client/src/components/TranscriptionProgress.tsx` (200 lignes)
- ✅ `client/src/pages/Upload.tsx` (modifications)
- ✅ `server/workers/transcriptionWorker.ts` (modifications)
- ✅ `JOUR_17_DECISIONS.md` (355 lignes)
- ✅ `JOUR_17_SPECIFICATIONS.md` (450 lignes)

---

**Prochaine étape :** Jour 18 - Analytics et Statistiques
