# Jour 12 - Dashboard avec Liste des Transcriptions

**Date :** 17 Janvier 2026 (reporté au 22 Janvier 2026)  
**Objectif :** Créer le dashboard principal avec la liste des transcriptions et le polling automatique  
**Durée estimée :** 7 heures

---

## 📋 Tâches Techniques (Ordre Chronologique)

### Tâche 1 : Créer la page Dashboard (/dashboard) [2h]

**Détails :**
- Layout avec header (logo + user menu)
- Section titre "Mes Transcriptions" + bouton "+ Nouveau"
- Styling avec Tailwind CSS + Bento UI Grid

**Livrables :**
- `client/src/pages/Dashboard.tsx` (mise à jour)
- Header avec logo Transcribe Express
- UserMenu intégré (déjà créé au Jour 11)
- Bouton "+ Nouvelle Transcription" avec icône

---

### Tâche 2 : Créer le composant TranscriptionList.tsx [2h]

**Détails :**
- Table avec colonnes : Nom, Durée, Statut, Actions
- Utilisation de shadcn/ui Table
- Mapping des données depuis `trpc.transcriptions.list.useQuery()`

**Livrables :**
- `client/src/components/TranscriptionList.tsx`
- Table responsive avec shadcn/ui
- Colonnes :
  - **Nom** : Nom du fichier audio/vidéo
  - **Durée** : Durée du fichier (format MM:SS)
  - **Statut** : Badge avec StatusBadge.tsx
  - **Actions** : Boutons Télécharger, Voir, Supprimer

**Procédure tRPC à utiliser :**
```typescript
const { data: transcriptions, isLoading } = trpc.transcriptions.list.useQuery();
```

---

### Tâche 3 : Créer le composant StatusBadge.tsx [1h]

**Détails :**
- Badge avec icône + texte
- Couleurs :
  - **Complété** (vert) : `bg-green-500/10 text-green-500`
  - **En cours** (jaune avec pulse) : `bg-yellow-500/10 text-yellow-500 animate-pulse`
  - **En attente** (gris) : `bg-gray-500/10 text-gray-500`
  - **Erreur** (rouge) : `bg-red-500/10 text-red-500`
- Utilisation de shadcn/ui Badge

**Livrables :**
- `client/src/components/StatusBadge.tsx`
- Props : `status: 'completed' | 'processing' | 'pending' | 'error'`
- Icônes :
  - Complété : ✓ (CheckCircle)
  - En cours : ⟳ (Loader avec rotation)
  - En attente : ⏱ (Clock)
  - Erreur : ✕ (XCircle)

---

### Tâche 4 : Implémenter le polling automatique [1h]

**Détails :**
- Hook `usePolling.ts` avec `setInterval` 5 secondes
- Invalidation de `trpc.transcriptions.list` toutes les 5 secondes
- Nettoyage avec `clearInterval` au démontage du composant

**Livrables :**
- `client/src/hooks/usePolling.ts`
- Configuration TanStack Query pour le polling :
```typescript
const { data } = trpc.transcriptions.list.useQuery(undefined, {
  refetchInterval: 5000, // 5 secondes
  refetchIntervalInBackground: true,
});
```

**Alternative (avec hook personnalisé) :**
```typescript
// client/src/hooks/usePolling.ts
export function usePolling(callback: () => void, interval: number) {
  useEffect(() => {
    const id = setInterval(callback, interval);
    return () => clearInterval(id);
  }, [callback, interval]);
}
```

---

### Tâche 5 : Tester le dashboard [1h]

**Tests à effectuer :**
1. **Affichage de la liste vide** si aucune transcription
   - Message : "Aucune transcription pour le moment"
   - Bouton "+ Nouvelle Transcription" visible
2. **Affichage de la liste avec transcriptions mockées**
   - Créer 3-5 transcriptions test en BDD
   - Vérifier l'affichage de toutes les colonnes
3. **Polling automatique avec mise à jour des statuts**
   - Modifier le statut d'une transcription en BDD
   - Vérifier que le dashboard se met à jour automatiquement après 5 secondes

**Tests Vitest à créer :**
- `server/transcriptions.list.test.ts` : Test de la procédure tRPC `transcriptions.list`

---

## 📦 Composants à Créer/Modifier

| Fichier | Action | Description |
|:--------|:-------|:------------|
| `client/src/pages/Dashboard.tsx` | Modifier | Ajouter TranscriptionList et bouton "+ Nouveau" |
| `client/src/components/TranscriptionList.tsx` | Créer | Table avec colonnes Nom, Durée, Statut, Actions |
| `client/src/components/StatusBadge.tsx` | Créer | Badge coloré avec icônes pour les statuts |
| `client/src/hooks/usePolling.ts` | Créer (optionnel) | Hook pour polling automatique |
| `server/transcriptions.list.test.ts` | Créer | Tests Vitest pour la procédure tRPC |

---

## 🎯 Critères d'Acceptation

À la fin du Jour 12, les fonctionnalités suivantes doivent être **opérationnelles** et **testées** :

1. ✅ **Dashboard** : L'utilisateur voit la liste de ses transcriptions avec les statuts en temps réel (polling 5s)
2. ✅ **Liste vide** : Message "Aucune transcription" affiché si l'utilisateur n'a pas encore de transcriptions
3. ✅ **Statuts visuels** : Les badges de statut sont colorés et animés (pulse pour "En cours")
4. ✅ **Polling automatique** : La liste se met à jour automatiquement toutes les 5 secondes sans refresh manuel
5. ✅ **Tests** : Tous les tests Vitest passent

---

## 🔗 Dépendances

**Procédure tRPC requise :**
- `transcriptions.list` : Récupère la liste des transcriptions de l'utilisateur connecté

**Schéma BDD (déjà créé au Jour 8) :**
```typescript
export const transcriptions = sqliteTable('transcriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  fileName: text('file_name').notNull(),
  fileUrl: text('file_url').notNull(),
  duration: integer('duration'), // en secondes
  status: text('status').notNull(), // 'pending' | 'processing' | 'completed' | 'error'
  transcriptText: text('transcript_text'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
```

---

## 📝 Notes Importantes

1. **Polling** : Utiliser `refetchInterval` de TanStack Query plutôt qu'un `setInterval` manuel pour éviter les fuites mémoire
2. **Optimisation** : Ne pas faire de polling si l'utilisateur n'a aucune transcription "En cours"
3. **UX** : Ajouter un skeleton loader pendant le chargement initial de la liste
4. **Accessibilité** : S'assurer que les badges de statut ont des labels ARIA pour les lecteurs d'écran

---

**Livrable attendu :** Dashboard fonctionnel avec liste des transcriptions et polling automatique.
