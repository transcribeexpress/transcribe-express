# Bugs Identifiés et Corrections - Transcribe Express

**Date:** 02 février 2026  
**Sprint:** Sprint 2 - Jour 20  
**Statut:** En cours de correction

---

## 🐛 Bugs Connus (SPRINT_2_PLAN)

### Bug #1: Tests Vitest avec timing MySQL (délais insuffisants)

**Statut:** 🔍 En investigation

**Description:**
Les tests Vitest peuvent échouer de manière intermittente en raison de délais insuffisants pour les opérations MySQL/TiDB.

**Impact:** Faible (tests seulement)

**Reproduction:**
1. Exécuter `pnpm test` plusieurs fois
2. Observer des échecs aléatoires sur les tests de base de données

**Cause probable:**
- Opérations MySQL asynchrones qui prennent plus de temps que prévu
- Timeouts trop courts dans les tests
- Latence réseau vers TiDB

**Solution proposée:**
- Augmenter les timeouts dans les tests de base de données
- Ajouter des `await` explicites pour toutes les opérations async
- Utiliser `waitFor` pour les assertions sur des données async

**Correction:**
```typescript
// Avant
test('should create transcription', async () => {
  const result = await caller.transcriptions.create({ ... });
  expect(result).toBeDefined();
});

// Après
test('should create transcription', async () => {
  const result = await caller.transcriptions.create({ ... });
  // Attendre que la BDD soit à jour
  await new Promise(resolve => setTimeout(resolve, 100));
  expect(result).toBeDefined();
}, 10000); // Timeout augmenté à 10s
```

**Tests de régression:** À créer après correction

---

### Bug #2: Erreur WebSocket Vite HMR (configuration manquante)

**Statut:** 🔍 En investigation

**Description:**
Erreurs WebSocket dans la console du navigateur lors du Hot Module Replacement (HMR) de Vite.

**Impact:** Faible (développement seulement)

**Reproduction:**
1. Démarrer le serveur de dev (`pnpm dev`)
2. Ouvrir la console du navigateur
3. Modifier un fichier source
4. Observer l'erreur WebSocket

**Erreur observée:**
```
WebSocket connection to 'ws://localhost:3000/' failed: Connection refused
```

**Cause probable:**
- Configuration WebSocket manquante dans `vite.config.ts`
- Proxy HMR non configuré correctement
- Conflit de ports

**Solution proposée:**
- Ajouter la configuration WebSocket dans `vite.config.ts`
- Configurer le proxy HMR correctement
- Vérifier que le port 3000 est disponible

**Correction:**
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 3000,
    },
  },
});
```

**Tests de régression:** Test manuel en développement

---

### Bug #3: Polling dashboard continue après déconnexion

**Statut:** ✅ Corrigé

**Description:**
Le polling automatique du Dashboard continue de s'exécuter même après que l'utilisateur se soit déconnecté, causant des requêtes inutiles et des erreurs 401.

**Impact:** Moyen (performance + erreurs console)

**Reproduction:**
1. Se connecter et accéder au Dashboard
2. Observer le polling toutes les 5 secondes
3. Se déconnecter
4. Observer que le polling continue dans la console

**Erreur observée:**
```
TRPCClientError: UNAUTHORIZED
```

**Cause probable:**
- `useEffect` cleanup non implémenté dans le Dashboard
- `refetchInterval` de tRPC non arrêté lors de la déconnexion
- État d'authentification non vérifié dans le polling

**Solution proposée:**
- Ajouter une condition `enabled` basée sur `isSignedIn`
- Implémenter le cleanup dans `useEffect`
- Arrêter le polling lors de la déconnexion

**Correction:**
```typescript
// Dashboard.tsx - Avant
const { data: transcriptions } = trpc.transcriptions.list.useQuery(undefined, {
  refetchInterval: 5000,
});

// Dashboard.tsx - Après
const { isSignedIn } = useAuth();
const { data: transcriptions } = trpc.transcriptions.list.useQuery(undefined, {
  refetchInterval: 5000,
  enabled: isSignedIn, // Arrêter le polling si déconnecté
});
```

**Tests de régression:**
- Test manuel: Se connecter, attendre le polling, se déconnecter, vérifier que le polling s'arrête
- Test automatisé: Mock de `useAuth` et vérification que la query est disabled

---

### Bug #4: Upload de fichiers > 16MB échoue sans message clair

**Statut:** ✅ Corrigé

**Description:**
L'upload de fichiers audio/vidéo de plus de 16MB échoue sans message d'erreur clair pour l'utilisateur. La limite de 16MB est imposée par l'API Whisper mais n'est pas communiquée clairement.

**Impact:** Élevé (UX + frustration utilisateur)

**Reproduction:**
1. Essayer d'uploader un fichier > 16MB
2. Observer que l'upload échoue
3. Aucun message d'erreur clair n'est affiché

**Erreur observée:**
```
Error: File too large
```

**Cause probable:**
- Validation côté client manquante pour la taille de fichier
- Message d'erreur générique non informatif
- Limite de 16MB non documentée dans l'UI

**Solution proposée:**
- Ajouter une validation côté client pour la taille de fichier
- Afficher un message d'erreur clair avec la limite
- Ajouter une indication de la limite dans l'UI (ex: "Max 16MB")

**Correction:**
```typescript
// audioValidation.ts - Avant
export async function validateAudioFile(file: File): Promise<ValidationResult> {
  // Pas de validation de taille
  return { valid: true };
}

// audioValidation.ts - Après
const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB

export async function validateAudioFile(file: File): Promise<ValidationResult> {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Le fichier est trop volumineux (${(file.size / 1024 / 1024).toFixed(1)}MB). La taille maximale est de 16MB.`
    };
  }
  return { valid: true };
}
```

**UI - Indication de la limite:**
```tsx
// Upload.tsx
<p className="text-sm text-muted-foreground">
  Formats supportés: MP3, WAV, M4A, OGG, WEBM (max 16MB)
</p>
```

**Tests de régression:**
- Test automatisé: Valider qu'un fichier > 16MB est rejeté avec le bon message
- Test manuel: Essayer d'uploader un fichier > 16MB et vérifier le message d'erreur

---

## 🐛 Bugs Découverts Pendant les Tests

### Bug #5: Erreur S3 lors de la suppression de transcription (test)

**Statut:** 🟡 Faible priorité (tests seulement)

**Description:**
Lors des tests de suppression de transcription, une erreur S3 "404 Not Found" est loguée dans stderr, mais le test passe quand même.

**Impact:** Faible (tests seulement, pas de régression fonctionnelle)

**Erreur observée:**
```
Failed to delete file from S3: Error: Storage delete failed (404 Not Found): 404 page not found
```

**Cause probable:**
- Le fichier S3 n'existe pas dans l'environnement de test
- Mock S3 manquant dans les tests
- Gestion d'erreur S3 non silencieuse

**Solution proposée:**
- Mocker les appels S3 dans les tests
- Rendre la suppression S3 non-bloquante (log warning au lieu d'error)
- Vérifier l'existence du fichier avant de le supprimer

**Correction:**
```typescript
// routers.ts - Avant
await storageDelete(transcription.fileKey);

// routers.ts - Après
try {
  await storageDelete(transcription.fileKey);
} catch (error) {
  // Log warning mais ne pas bloquer la suppression
  console.warn(`Failed to delete file from S3: ${error}`);
}
```

**Tests de régression:** Vérifier que la suppression fonctionne même si S3 échoue

---

## 📊 Résumé des Bugs

| Bug # | Titre | Priorité | Statut | Impact |
|:------|:------|:---------|:-------|:-------|
| #1 | Tests Vitest timing MySQL | 🟡 Faible | 🔍 Investigation | Tests |
| #2 | WebSocket Vite HMR | 🟡 Faible | 🔍 Investigation | Dev |
| #3 | Polling après déconnexion | 🔴 Critique | ✅ Corrigé | Moyen |
| #4 | Upload > 16MB sans message | 🔴 Critique | ✅ Corrigé | Élevé |
| #5 | Erreur S3 dans tests | 🟢 Faible | 🔍 Investigation | Tests |

---

## ✅ Bugs Corrigés

### Bug #3: Polling dashboard continue après déconnexion

**Date de correction:** 02 février 2026

**Correction appliquée:**
Ajout de la condition `enabled: isSignedIn` dans la query tRPC du Dashboard pour arrêter automatiquement le polling lors de la déconnexion.

```typescript
// Dashboard.tsx
const { data: transcriptions = [], isLoading: isLoadingTranscriptions } = trpc.transcriptions.list.useQuery(
  undefined,
  {
    enabled: isSignedIn, // Arrêter le polling si déconnecté
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  }
);
```

**Test de régression:** Test manuel effectué - Le polling s'arrête correctement lors de la déconnexion.

---

### Bug #4: Upload de fichiers > 16MB échoue sans message clair

**Date de correction:** 02 février 2026

**Correction appliquée:**
Validation de taille de fichier implémentée dans `audioValidation.ts` avec message d'erreur clair.

```typescript
// audioValidation.ts
export const MAX_FILE_SIZE_MB = 16;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function validateSize(file: File): boolean {
  return file.size <= MAX_FILE_SIZE_BYTES;
}

// Dans validateAudioFile()
if (!validateSize(file)) {
  const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
  return {
    valid: false,
    error: `Fichier trop volumineux (${sizeMB} MB). Taille maximale : ${MAX_FILE_SIZE_MB} MB`,
    size: file.size,
  };
}
```

**Test de régression:** Tests automatiques existants (12 tests de validation audio passent).

---

## 📝 Notes

- Tous les bugs critiques (#3 et #4) doivent être corrigés avant la fin du Jour 20
- Les bugs de faible priorité (#1, #2, #5) peuvent être reportés au Sprint 3
- Tests de régression à créer pour chaque bug corrigé
- Documentation à mettre à jour après chaque correction
