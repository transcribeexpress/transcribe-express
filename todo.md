# TODO - Transcribe Express

## 📊 Vue d'Ensemble

| Phase | Statut | Progression |
|:------|:-------|:------------|
| **Sprint 1 - Jour 11** | ✅ Terminé | 100% |
| **Sprint 1 - Jour 12** | ✅ Terminé | 100% |
| **Sprint 1 - Jour 13** | ⏳ En attente | 0% |
| **Sprint 1 - Jour 14** | ⏳ En attente | 0% |

---

## ✅ Jour 11 - Authentification Clerk (TERMINÉ)

### Tâche 1 : Page de connexion /login
- [x] Créer le fichier client/src/pages/Login.tsx
- [x] Créer le composant client/src/components/LoginButton.tsx avec icônes Google/GitHub
- [x] Utiliser Clerk SDK (@clerk/clerk-react)
- [x] Appliquer le styling Tailwind CSS avec palette Magenta (#BE34D5) et Cyan (#34D5BE)
- [x] Tester l'affichage de la page /login

### Tâche 2 : Hook useAuth()
- [x] Créer le hook client/src/hooks/useAuth.ts
- [x] Wrapper autour des hooks Clerk (useUser, useClerk)
- [x] Exposer user, isLoading, isAuthenticated, signOut()
- [x] Tester le hook dans la page Dashboard

### Tâche 3 : Composant UserMenu.tsx
- [x] Créer le fichier client/src/components/UserMenu.tsx
- [x] Avatar utilisateur avec initiales (40x40px, border-radius 50%)
- [x] Dropdown avec shadcn/ui DropdownMenu
- [x] Options : Profil, Paramètres, Déconnexion
- [x] Tester l'affichage du menu utilisateur

### Tâche 4 : Tests du flux complet
- [x] Tester redirection OAuth Google → Clerk
- [x] Tester redirection OAuth GitHub → Clerk
- [x] Tests Vitest pour validation des clés API Clerk

### Tâche 5 : Documentation
- [x] Documenter les choix techniques dans JOUR_11_DECISIONS.md
- [x] Créer JOUR_11_SPECIFICATIONS.md
- [ ] Créer un checkpoint Manus

**Fichiers créés :**
- client/src/pages/Login.tsx
- client/src/pages/Dashboard.tsx
- client/src/pages/SSOCallback.tsx
- client/src/components/LoginButton.tsx
- client/src/components/UserMenu.tsx
- client/src/hooks/useAuth.ts
- server/clerk.test.ts
- JOUR_11_DECISIONS.md
- JOUR_11_SPECIFICATIONS.md

---

## ✅ Jour 12 - Dashboard avec Polling (TERMINÉ)

### Tâche 1 : Mettre à jour la page Dashboard
- [x] Ajouter le header avec logo Transcribe Express
- [x] Intégrer le UserMenu (déjà créé au Jour 11)
- [x] Ajouter la section titre "Mes Transcriptions"
- [x] Créer le bouton "+ Nouvelle Transcription" avec icône
- [x] Appliquer le styling Tailwind CSS + Bento UI Grid

### Tâche 2 : Créer le composant TranscriptionList.tsx
- [x] Créer le fichier client/src/components/TranscriptionList.tsx
- [x] Implémenter la table shadcn/ui avec colonnes (Nom, Durée, Statut, Actions)
- [x] Mapper les données depuis trpc.transcriptions.list.useQuery()
- [x] Ajouter les boutons d'action (Télécharger, Voir, Supprimer)
- [x] Gérer l'état de chargement avec skeleton loader
- [x] Gérer l'état vide avec message "Aucune transcription"

### Tâche 3 : Créer le composant StatusBadge.tsx
- [x] Créer le fichier client/src/components/StatusBadge.tsx
- [x] Implémenter les 4 statuts avec couleurs (Completé, En cours, En attente, Erreur)
- [x] Ajouter les icônes pour chaque statut
- [x] Ajouter l'animation pulse pour le statut "En cours"
- [x] Utiliser shadcn/ui Badge comme base

### Tâche 4 : Implémenter le polling automatique
- [x] Configurer TanStack Query avec refetchInterval: 5000
- [x] Activer refetchIntervalInBackground: true
- [x] Tester le polling automatique (mise à jour toutes les 5s)
- [x] (Optionnel) Créer le hook usePolling.ts - Non nécessaire, implémenté directement dans useQuery

### Tâche 5 : Tester le dashboard
- [x] Tester l'affichage de la liste vide
- [x] Créer des transcriptions test en BDD
- [x] Tester l'affichage de la liste avec données
- [x] Tester le polling automatique avec changement de statut
- [x] Créer le test Vitest server/transcriptions.list.test.ts
- [x] Exécuter tous les tests et vérifier qu'ils passent (4/4 ✅)

### Tâche 6 : Documentation
- [x] Documenter les choix techniques dans JOUR_12_DECISIONS.md
- [x] Mettre à jour le TODO.md avec les tâches complétées
- [ ] Créer un checkpoint Manus

**Livrable attendu :** ✅ Dashboard fonctionnel avec liste des transcriptions et polling automatique

**Fichiers créés :**
- drizzle/schema.ts (table transcriptions)
- server/db.ts (helpers transcriptions)
- server/routers.ts (procédure transcriptions.list)
- server/transcriptions.list.test.ts (tests Vitest)
- client/src/components/StatusBadge.tsx
- client/src/components/TranscriptionList.tsx
- JOUR_12_DECISIONS.md
- JOUR_12_SPECIFICATIONS.md

---

## ⏳ Jour 13 - Upload et Transcription (À FAIRE)

### Tâche 1 : Créer UploadZone.tsx
- [ ] Zone de drag & drop avec react-dropzone
- [ ] Validation des formats (mp3, wav, mp4, webm)
- [ ] Limite de taille (25MB pour plan gratuit)

### Tâche 2 : Créer UploadProgress.tsx
- [ ] Barre de progression avec pourcentage
- [ ] Animation fluide

### Tâche 3 : Intégration S3
- [ ] Upload vers S3 via storagePut()
- [ ] Génération d'URL signée

### Tâche 4 : Déclenchement du worker
- [ ] Créer la transcription en BDD
- [ ] Déclencher le worker asynchrone

---

## ⏳ Jour 14 - Résultats et Export (À FAIRE)

### Tâche 1 : Créer TranscriptionViewer.tsx
- [ ] Affichage du texte transcrit
- [ ] Horodatage par segment

### Tâche 2 : Créer ExportButton.tsx
- [ ] Export TXT
- [ ] Export SRT (sous-titres)
- [ ] Export JSON

### Tâche 3 : Page de résultats /transcription/:id
- [ ] Récupération de la transcription par ID
- [ ] Affichage avec TranscriptionViewer
- [ ] Boutons d'export

---

## 📝 Notes

- **Jour 11 terminé le 21 Janvier 2026**
- Authentification Clerk implémentée avec succès
- Tests OAuth Google et GitHub validés
- **Jour 12 terminé le 22 Janvier 2026**
- Dashboard avec polling automatique 5s implémenté
- 4 tests Vitest passent (100%)
- Prêt pour le Jour 13
