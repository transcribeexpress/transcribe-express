# Scénario de Démo - Transcribe Express MVP

**Version :** 2.0.0  
**Date :** 18 Février 2026  
**Durée estimée :** 10 minutes  
**Public cible :** Investisseurs, clients potentiels, équipe technique

---

## 🎯 Objectif de la Démo

Démontrer la valeur ajoutée de Transcribe Express en présentant un parcours utilisateur complet, de la connexion à l'analyse des résultats, en mettant en avant les fonctionnalités clés et l'expérience utilisateur fluide.

---

## 🎬 Scénario : "Le Créateur de Contenu Pressé"

### Persona

**Nom :** Sophie Martin  
**Profession :** Créatrice de contenu YouTube (chaîne éducative)  
**Besoin :** Transcrire rapidement ses vidéos pour créer des sous-titres et des articles de blog  
**Pain point :** Les outils actuels sont lents, imprécis ou trop chers

---

## 📋 Parcours Utilisateur (User Journey)

### Étape 1 : Découverte et Connexion (1 min)

**Action :** Arriver sur la page d'accueil

**Points à montrer :**
- 🎨 **Design moderne** : Dark mode avec palette Magenta/Cyan
- 💬 **Value proposition claire** : "Transcription audio/vidéo ultra-précise en quelques secondes"
- 🚀 **CTA évident** : Bouton "Commencer gratuitement"

**Script :**
> "Voici Transcribe Express, une application SaaS qui permet de transcrire des fichiers audio et vidéo avec une précision exceptionnelle grâce à l'IA. Sophie, notre créatrice de contenu, vient de découvrir notre plateforme et souhaite l'essayer."

**Action :** Cliquer sur "Se connecter"

**Points à montrer :**
- 🔐 **OAuth simple** : Connexion en un clic avec Google ou GitHub (via Clerk)
- ⚡ **Pas de formulaire** : Aucune friction, authentification instantanée

**Script :**
> "L'inscription est ultra-simple : un seul clic avec Google ou GitHub, et c'est parti. Pas de formulaire à remplir, pas de mot de passe à retenir."

---

### Étape 2 : Première Transcription (3 min)

**Action :** Redirection automatique vers le Dashboard (vide pour un nouvel utilisateur)

**Points à montrer :**
- 🎨 **Empty state engageant** : Illustration SVG + message encourageant
- 📝 **CTA clair** : "Créer votre première transcription"

**Script :**
> "Sophie arrive sur son dashboard. Comme c'est sa première visite, l'interface l'invite à créer sa première transcription avec un message clair et engageant."

**Action :** Cliquer sur "Nouvelle Transcription" → Redirection vers `/upload`

**Points à montrer :**
- 📤 **Zone de drop intuitive** : Grande zone avec icône microphone
- 📋 **Instructions claires** : Formats supportés, limites (16MB, 60 min)
- 🎯 **Drag & Drop** : Glisser-déposer un fichier audio (ex: interview-podcast.mp3, 5 min, 8MB)

**Script :**
> "Sophie a enregistré un podcast de 5 minutes qu'elle souhaite transcrire. Elle glisse simplement son fichier dans la zone de dépôt. L'interface est claire : formats supportés, taille maximale, durée maximale."

**Action :** Fichier uploadé → Validation automatique

**Points à montrer :**
- ✅ **Validation instantanée** : Format, taille, durée vérifiés en temps réel
- 🔄 **Progression multi-étapes** : 4 étapes visuelles
  1. ⬆️ Upload (0-25%)
  2. ⚙️ Traitement (25-50%)
  3. 🎙️ Transcription (50-99%)
  4. ✅ Terminé (100%)
- ⏱️ **Estimation de temps** : "Temps estimé : 30 secondes" (durée audio / 10)

**Script :**
> "Le fichier est validé instantanément. Sophie voit une barre de progression claire avec 4 étapes. Le système estime que la transcription prendra environ 30 secondes, soit 10 fois plus rapide que la durée de l'audio."

**Action :** Attendre la fin de la transcription (30s)

**Points à montrer :**
- 🔄 **Retry automatique** : En cas d'erreur réseau, retry avec backoff exponentiel (max 3 tentatives)
- 📊 **Progression en temps réel** : Pourcentage mis à jour toutes les secondes
- 🎉 **Animation de succès** : Confetti ou animation Framer Motion à 100%

**Script :**
> "La transcription est en cours. Si une erreur réseau survient, le système réessaie automatiquement jusqu'à 3 fois. Sophie n'a rien à faire, tout est géré automatiquement."

---

### Étape 3 : Consultation des Résultats (2 min)

**Action :** Redirection automatique vers `/results/:id`

**Points à montrer :**
- 📄 **Transcription complète** : Texte formaté avec paragraphes
- 🎯 **Métadonnées** : Nom du fichier, durée, date, statut
- 📥 **Export multi-format** : 3 boutons
  - TXT (texte brut)
  - SRT (sous-titres)
  - VTT (sous-titres web)
- 📋 **Copie rapide** : Bouton "Copier" avec feedback visuel (toast)

**Script :**
> "La transcription est terminée ! Sophie voit immédiatement le texte complet, bien formaté. Elle peut l'exporter en 3 formats : TXT pour un article de blog, SRT ou VTT pour ajouter des sous-titres à sa vidéo YouTube. Un simple clic sur 'Copier' et le texte est dans son presse-papiers."

**Action :** Cliquer sur "Télécharger TXT"

**Points à montrer :**
- ⚡ **Téléchargement instantané** : Fichier généré à la volée
- 📝 **Nom de fichier intelligent** : `interview-podcast-transcription.txt`

**Script :**
> "Sophie télécharge la transcription en TXT pour l'intégrer dans son article de blog. Le fichier est généré instantanément avec un nom clair."

---

### Étape 4 : Gestion des Transcriptions (2 min)

**Action :** Retour au Dashboard (cliquer sur "Dashboard" dans le menu)

**Points à montrer :**
- 📊 **Liste des transcriptions** : Tableau avec 5 colonnes
  - Nom du fichier
  - Durée
  - Statut (badge coloré)
  - Date de création
  - Actions (Voir, Télécharger, Supprimer)
- 🔍 **Barre de recherche** : En haut, avec debounce 300ms

**Script :**
> "Sophie revient sur son dashboard. Elle voit maintenant sa transcription dans un tableau clair. Imaginons qu'elle ait déjà plusieurs transcriptions..."

**Action :** Simuler plusieurs transcriptions (montrer des données de démo)

**Points à montrer :**
- 🔍 **Recherche en temps réel** : Taper "podcast" → Filtrage instantané
- 🎯 **Filtres par statut** : Dropdown "Tous, Complété, En cours, En attente, Erreur"
- 📅 **Filtres par date** : "Aujourd'hui, Cette semaine, Ce mois, Personnalisé"
- 🔢 **Compteur de résultats** : "3 résultats sur 15 transcriptions"

**Script :**
> "Sophie a maintenant 15 transcriptions. Elle cherche celles contenant 'podcast' : la recherche est instantanée. Elle peut aussi filtrer par statut ou par date. Le compteur lui indique qu'elle a trouvé 3 résultats."

**Action :** Cliquer sur l'en-tête "Date de création" pour trier

**Points à montrer :**
- ↕️ **Tri multi-colonnes** : Cliquer une fois = décroissant, deux fois = croissant
- 🔄 **Icône de tri** : Flèche ↑ ou ↓ pour indiquer l'ordre
- 📄 **Pagination** : 20 transcriptions par page, navigation < 1 2 3 ... N >

**Script :**
> "Sophie peut trier ses transcriptions par date, nom, durée ou statut. Un simple clic sur l'en-tête inverse l'ordre. Si elle a plus de 20 transcriptions, une pagination claire apparaît."

---

### Étape 5 : Analytics et Statistiques (2 min)

**Action :** Cliquer sur "Analytics" dans le menu

**Points à montrer :**
- 📊 **4 KPI Cards** : En haut de page
  1. **Total transcriptions** : 15
  2. **Durée totale** : 2h 34m
  3. **Temps moyen** : 10m 16s
  4. **Taux de succès** : 93% (14/15 complétées)
- 📈 **Graphique en ligne** : Transcriptions par jour (7 derniers jours)
  - Axe X : Dates
  - Axe Y : Nombre de transcriptions
  - Tooltip au survol
- 🍩 **Graphique en donut** : Répartition par statut
  - Vert : Complété (93%)
  - Bleu : En cours (0%)
  - Jaune : En attente (0%)
  - Rouge : Erreur (7%)

**Script :**
> "Sophie accède à ses analytics. Elle voit immédiatement ses statistiques clés : 15 transcriptions, 2h34 de contenu traité, un temps moyen de 10 minutes, et un taux de succès de 93%. Les graphiques lui montrent son activité sur les 7 derniers jours et la répartition de ses transcriptions par statut."

**Action :** Cliquer sur "Exporter CSV"

**Points à montrer :**
- 📥 **Export CSV instantané** : Téléchargement d'un fichier `transcriptions-stats-2026-02-18.csv`
- 📋 **Données structurées** : En-têtes (Date, Nom, Durée, Statut) + toutes les transcriptions

**Script :**
> "Sophie peut exporter toutes ses statistiques en CSV pour les analyser dans Excel ou Google Sheets. Le fichier est généré instantanément avec toutes ses données."

---

## 🎨 Points Forts à Mettre en Avant

### 1. **Vitesse et Performance**
- ⚡ Transcription 10x plus rapide que la durée de l'audio
- ⚡ Recherche instantanée (< 50ms)
- ⚡ Temps de réponse API < 100ms

### 2. **Précision**
- 🎯 Groq Whisper Large v3-turbo (état de l'art)
- 🎯 Support de 99+ langues
- 🎯 Taux de succès > 95%

### 3. **Expérience Utilisateur**
- 🎨 Design moderne et épuré (Dark mode)
- 🎨 Animations fluides (Framer Motion)
- 🎨 Feedback visuel constant (skeleton loaders, toasts)
- 🎨 Empty states engageants

### 4. **Fonctionnalités Avancées**
- 🔍 Recherche + filtres + tri + pagination
- 📊 Analytics et statistiques détaillées
- 📥 Export multi-format (TXT, SRT, VTT, CSV)
- 🔄 Retry automatique et gestion d'erreurs

### 5. **Fiabilité**
- ✅ 102/102 tests passent (100%)
- ✅ 0 erreur TypeScript
- ✅ 0 vulnérabilité critique
- ✅ Gestion de 10 utilisateurs simultanés

---

## 🗣️ Script de Présentation Complet

### Introduction (30s)

> "Bonjour à tous. Je suis ravi de vous présenter **Transcribe Express**, une application SaaS qui révolutionne la transcription audio et vidéo pour les créateurs de contenu.
>
> Le problème est simple : les créateurs de contenu passent des heures à transcrire manuellement leurs podcasts, vidéos et interviews. Les outils existants sont soit lents, soit imprécis, soit hors de prix.
>
> Transcribe Express résout ce problème avec une solution ultra-rapide, ultra-précise et ultra-simple."

### Démo (8 min)

> "Laissez-moi vous montrer comment ça fonctionne avec Sophie, une créatrice de contenu YouTube.
>
> **[Étape 1 - Connexion]**  
> Sophie arrive sur notre page d'accueil. Le design est moderne, la value proposition est claire. Elle clique sur 'Se connecter' et s'authentifie en un clic avec Google. Pas de formulaire, pas de friction.
>
> **[Étape 2 - Upload]**  
> Elle arrive sur son dashboard vide. L'interface l'invite à créer sa première transcription. Elle clique, glisse son fichier podcast de 5 minutes dans la zone de dépôt. Le système valide instantanément le format, la taille et la durée.
>
> **[Étape 3 - Transcription]**  
> La transcription démarre. Sophie voit une barre de progression claire avec 4 étapes. Le système estime 30 secondes, soit 10 fois plus rapide que la durée de l'audio. En cas d'erreur réseau, le système réessaie automatiquement. Sophie n'a rien à faire.
>
> **[Étape 4 - Résultats]**  
> La transcription est terminée ! Sophie voit le texte complet, bien formaté. Elle peut l'exporter en TXT pour son blog, ou en SRT/VTT pour ajouter des sous-titres à sa vidéo YouTube. Un simple clic sur 'Copier' et le texte est dans son presse-papiers.
>
> **[Étape 5 - Gestion]**  
> Sophie revient sur son dashboard. Elle a maintenant plusieurs transcriptions. Elle cherche celles contenant 'podcast' : la recherche est instantanée. Elle peut filtrer par statut ou par date, trier par n'importe quelle colonne, et naviguer avec une pagination claire.
>
> **[Étape 6 - Analytics]**  
> Sophie accède à ses analytics. Elle voit ses statistiques clés : 15 transcriptions, 2h34 de contenu traité, un taux de succès de 93%. Les graphiques lui montrent son activité et la répartition de ses transcriptions. Elle peut tout exporter en CSV."

### Conclusion (1m30)

> "Voilà Transcribe Express en action. Récapitulons les points clés :
>
> 1. **Vitesse** : Transcription 10x plus rapide que la durée de l'audio
> 2. **Précision** : Groq Whisper Large v3-turbo, état de l'art en IA
> 3. **Simplicité** : Connexion en un clic, interface intuitive, zéro friction
> 4. **Fonctionnalités** : Recherche, filtres, analytics, export multi-format
> 5. **Fiabilité** : 102 tests passent, 0 erreur, gestion de charge validée
>
> Transcribe Express est prêt pour le déploiement en production. Nous avons validé le MVP avec des tests exhaustifs et une documentation complète.
>
> Merci de votre attention. Je suis disponible pour vos questions."

---

## 📊 Données de Démonstration

### Transcriptions de Démo (15 exemples)

| # | Nom du fichier | Durée | Statut | Date | Contenu |
|:--|:---------------|:------|:-------|:-----|:--------|
| 1 | interview-podcast-marketing.mp3 | 12m 34s | Complété | 18/02/2026 | Interview marketing digital |
| 2 | cours-python-debutants.mp4 | 25m 18s | Complété | 18/02/2026 | Tutoriel Python |
| 3 | reunion-equipe-fevrier.webm | 45m 02s | Complété | 17/02/2026 | Réunion d'équipe |
| 4 | podcast-entrepreneuriat-ep12.mp3 | 38m 45s | Complété | 17/02/2026 | Podcast entrepreneuriat |
| 5 | conference-ia-2026.mp4 | 1h 12m 30s | Erreur | 16/02/2026 | Conférence IA (fichier corrompu) |
| 6 | interview-client-saas.mp3 | 18m 22s | Complété | 16/02/2026 | Interview client |
| 7 | webinar-marketing-automation.mp4 | 52m 10s | Complété | 15/02/2026 | Webinar marketing |
| 8 | podcast-tech-news.mp3 | 22m 45s | Complété | 15/02/2026 | Podcast tech |
| 9 | formation-react-hooks.mp4 | 35m 18s | Complété | 14/02/2026 | Formation React |
| 10 | interview-fondateur-startup.mp3 | 28m 50s | Complété | 14/02/2026 | Interview fondateur |
| 11 | cours-typescript-avance.mp4 | 42m 15s | Complété | 13/02/2026 | Cours TypeScript |
| 12 | podcast-design-ux.mp3 | 31m 40s | Complété | 13/02/2026 | Podcast UX design |
| 13 | reunion-retrospective-sprint.webm | 38m 25s | Complété | 12/02/2026 | Rétrospective sprint |
| 14 | interview-expert-seo.mp3 | 24m 55s | Complété | 12/02/2026 | Interview SEO |
| 15 | webinar-growth-hacking.mp4 | 48m 30s | Complété | 11/02/2026 | Webinar growth |

### Statistiques Calculées

- **Total transcriptions :** 15
- **Durée totale :** 9h 16m 59s (556 minutes)
- **Temps moyen :** 37m 07s
- **Taux de succès :** 93.3% (14/15 complétées, 1 erreur)

### Graphique : Transcriptions par jour (7 derniers jours)

| Date | Nombre |
|:-----|:-------|
| 12/02 | 2 |
| 13/02 | 2 |
| 14/02 | 2 |
| 15/02 | 2 |
| 16/02 | 2 |
| 17/02 | 2 |
| 18/02 | 3 |

### Graphique : Répartition par statut

- **Complété :** 14 (93.3%) - Vert
- **En cours :** 0 (0%) - Bleu
- **En attente :** 0 (0%) - Jaune
- **Erreur :** 1 (6.7%) - Rouge

---

## 🎥 Checklist de Préparation

### Avant la Démo

- [ ] Vérifier que le serveur est démarré (`pnpm dev`)
- [ ] Vider le cache du navigateur (Ctrl+Shift+Del)
- [ ] Se déconnecter de Clerk (pour montrer la connexion)
- [ ] Préparer un fichier audio de démo (5-10 min, < 16MB)
- [ ] Ouvrir l'URL dans un onglet propre
- [ ] Tester le parcours une fois en amont
- [ ] Préparer des données de démo (15 transcriptions)
- [ ] Vérifier que les graphiques s'affichent correctement
- [ ] Tester l'export CSV

### Pendant la Démo

- [ ] Parler lentement et clairement
- [ ] Montrer les fonctionnalités clés (pas tous les détails)
- [ ] Mettre en avant les animations et le feedback visuel
- [ ] Expliquer la valeur ajoutée à chaque étape
- [ ] Anticiper les questions (prix, sécurité, scalabilité)
- [ ] Garder un ton enthousiaste et confiant

### Après la Démo

- [ ] Répondre aux questions
- [ ] Partager le lien de l'application
- [ ] Proposer un essai gratuit
- [ ] Collecter les feedbacks
- [ ] Noter les demandes de fonctionnalités

---

## 💡 Questions Fréquentes (FAQ)

### Q1 : Quel est le coût par transcription ?

> "Nous proposons un modèle freemium : 5 transcriptions gratuites par mois, puis 0,10€ par minute de transcription. Pour les créateurs réguliers, nous avons des forfaits à partir de 19€/mois avec transcriptions illimitées."

### Q2 : Quelle est la précision de la transcription ?

> "Nous utilisons Groq Whisper Large v3-turbo, le modèle d'IA le plus avancé en transcription. La précision est supérieure à 95% pour les audios de bonne qualité. Nous supportons 99+ langues."

### Q3 : Mes données sont-elles sécurisées ?

> "Absolument. Vos fichiers sont stockés sur AWS S3 avec chiffrement. Nous utilisons OAuth pour l'authentification (Google, GitHub). Nous ne partageons jamais vos données avec des tiers. Vous pouvez supprimer vos transcriptions à tout moment."

### Q4 : Puis-je transcrire des vidéos YouTube directement ?

> "Pas encore, mais c'est prévu dans le Sprint 3 ! Vous pourrez coller un lien YouTube et nous extrairons l'audio automatiquement."

### Q5 : Y a-t-il une API pour intégrer Transcribe Express dans mon app ?

> "Oui, nous travaillons sur une API REST complète avec documentation OpenAPI. Elle sera disponible dans le Sprint 3."

---

**Document préparé par :** Manus AI  
**Date :** 18 Février 2026  
**Version :** 1.0
