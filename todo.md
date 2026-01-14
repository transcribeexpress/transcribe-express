# TODO - Transcribe Express

## 🚀 Phase 1 : Infrastructure Technique (Jour 8)

### Schéma de Base de Données
- [x] Configurer le schéma Drizzle avec tables User et Transcription
- [x] Ajouter les relations entre User et Transcription
- [x] Créer les indexes pour optimiser les requêtes
- [x] Pousser le schéma vers MySQL avec `pnpm db:push`

### Authentification Clerk
- [x] Configurer les variables d'environnement Clerk
- [ ] Implémenter le hook useAuth avec Clerk
- [ ] Créer la page de connexion avec OAuth Google/GitHub
- [ ] Implémenter la synchronisation utilisateur (webhook Clerk)

### API Backend (tRPC)
- [x] Créer la procédure `transcriptions.getUploadUrl` pour générer des URLs pré-signées S3
- [x] Créer la procédure `transcriptions.list` (GET)
- [x] Créer la procédure `transcriptions.create` (POST)
- [x] Créer la procédure `transcriptions.get` (GET par ID)
- [x] Créer la procédure `transcriptions.delete` (DELETE)
- [ ] Implémenter la validation des fichiers (taille, format)

### Worker Asynchrone
- [x] Créer le worker pour traiter les jobs de transcription
- [x] Intégrer Groq API (Whisper Large v3-turbo)
- [x] Générer les formats SRT, VTT, TXT
- [x] Uploader les résultats vers S3
- [x] Mettre à jour le statut des transcriptions
- [x] Démarrer le worker automatiquement au lancement du serveur

### Frontend (Next.js)
- [ ] Configurer Tailwind CSS avec Dark Mode et palette de couleurs
- [ ] Créer la page d'upload avec drag & drop
- [ ] Créer le dashboard avec liste des transcriptions
- [ ] Implémenter le polling pour les statuts en temps réel
- [ ] Créer les composants de téléchargement des résultats

### Configuration
- [x] Configurer les variables d'environnement AWS S3
- [x] Configurer les variables d'environnement Groq API
- [x] Configurer les variables d'environnement MySQL
- [x] Tester la connexion à tous les services (via vitest)

### Documentation
- [x] Créer le document ARCHITECTURE.md avec diagrammes
- [x] Documenter les décisions techniques
- [ ] Créer le README du projet

## 🐛 Bugs Connus

Aucun bug pour le moment.

## 📝 Notes

- Architecture hybride : Vercel (Frontend) + O2switch (Backend/BDD)
- Palette de couleurs : #BE34D5 (Magenta), #34D5BE (Cyan)
- Typographie : Inter
- Dark Mode First

## 📊 Progression

- ✅ Schéma de base de données : 4/4 (100%)
- ⏳ Authentification Clerk : 1/4 (25%)
- ✅ API Backend (tRPC) : 5/6 (83%)
- ✅ Worker Asynchrone : 6/6 (100%)
- ⏳ Frontend (Next.js) : 0/5 (0%)
- ✅ Configuration : 4/4 (100%)
- ⏳ Documentation : 2/3 (67%)

**Total : 22/32 tâches (69%)**
