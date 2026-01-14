# Architecture Technique - Transcribe Express

**Date de création** : 14 janvier 2026  
**Version** : 1.0  
**Auteur** : Manus AI

---

## Vue d'Ensemble

Transcribe Express est une application SaaS de transcription audio/vidéo construite avec une architecture hybride moderne combinant **Vercel** pour le frontend et **O2switch** pour le backend et la base de données. Cette architecture permet de bénéficier de la performance globale de Vercel pour le frontend tout en conservant un contrôle total sur les données sensibles via un hébergement européen (O2switch).

### Principes Architecturaux

L'architecture de Transcribe Express repose sur trois principes fondamentaux qui guident toutes les décisions techniques. Le premier principe est la **séparation des responsabilités**, où le frontend Next.js gère exclusivement l'interface utilisateur et les interactions, tandis que le backend Express.js se concentre sur la logique métier, l'authentification et le traitement asynchrone. Le deuxième principe est la **scalabilité progressive**, permettant de commencer avec un worker simple basé sur le polling et d'évoluer vers une architecture de queue distribuée (Bull/BullMQ) lorsque le volume augmente. Enfin, le principe de **sécurité par conception** garantit que toutes les données sensibles (clés API, fichiers utilisateurs) sont chiffrées en transit et au repos, avec une authentification forte via Clerk OAuth.

---

## Stack Technique

### Frontend (Vercel)

Le frontend est construit avec **Next.js 15** (App Router) et déployé sur **Vercel** pour bénéficier de l'edge computing et du CDN global. L'interface utilisateur utilise **React 19** avec **TypeScript** pour la sécurité des types, **Tailwind CSS 4** pour le styling avec une palette de couleurs personnalisée (Magenta #BE34D5 et Cyan #34D5BE), et **shadcn/ui** pour les composants UI modernes et accessibles. L'authentification côté client est gérée par **@clerk/nextjs** qui fournit des hooks React pour l'état d'authentification et la gestion des sessions.

La communication avec le backend se fait via **tRPC 11**, offrant une expérience de développement type-safe de bout en bout sans avoir à définir manuellement des contrats d'API. Les requêtes tRPC sont automatiquement typées côté client grâce à l'inférence TypeScript, éliminant ainsi les erreurs de typage entre frontend et backend.

### Backend (O2switch)

Le backend est construit avec **Express.js 4** et hébergé sur **O2switch** (hébergement mutualisé français). Il expose une API tRPC pour toutes les opérations métier, gère l'authentification via **Clerk** (vérification des JWT), et orchestre le traitement asynchrone des transcriptions. Le backend utilise **Drizzle ORM** pour interagir avec la base de données MySQL de manière type-safe, et **SuperJSON** pour sérialiser automatiquement les types complexes (Date, BigInt) entre le client et le serveur.

### Base de Données (O2switch)

La base de données **MySQL 8.0** est hébergée sur O2switch et gère deux tables principales : `users` (synchronisée avec Clerk via webhooks) et `transcriptions` (jobs de transcription avec statuts et résultats). Le schéma est défini avec **Drizzle ORM** et versionné via des migrations SQL générées automatiquement. Les relations entre tables utilisent des clés étrangères avec cascade delete pour maintenir l'intégrité référentielle.

### Services Externes

L'architecture s'appuie sur quatre services externes critiques. **Clerk** gère l'authentification OAuth (Google, GitHub) et fournit des JWT sécurisés pour l'autorisation. **AWS S3** stocke les fichiers audio/vidéo uploadés et les résultats de transcription (SRT, VTT, TXT) avec des URLs pré-signées pour un accès sécurisé. **Groq API** effectue la transcription audio avec le modèle **Whisper Large v3-turbo**, offrant un excellent rapport qualité/prix. Enfin, **Vercel** héberge le frontend Next.js avec déploiement automatique depuis GitHub.

---

## Modèle de Données

### Table `users`

La table `users` stocke les informations des utilisateurs synchronisées avec Clerk. Elle contient les champs suivants :

| Champ | Type | Description |
|-------|------|-------------|
| `id` | INT AUTO_INCREMENT | Clé primaire |
| `openId` | VARCHAR(64) UNIQUE | Identifiant Clerk (OAuth) |
| `name` | TEXT | Nom complet de l'utilisateur |
| `email` | VARCHAR(320) | Adresse email |
| `loginMethod` | VARCHAR(64) | Méthode de connexion (google, github, email) |
| `role` | ENUM('user', 'admin') | Rôle de l'utilisateur |
| `createdAt` | TIMESTAMP | Date de création |
| `updatedAt` | TIMESTAMP | Date de dernière mise à jour |
| `lastSignedIn` | TIMESTAMP | Date de dernière connexion |

### Table `transcriptions`

La table `transcriptions` stocke les jobs de transcription et leurs résultats. Elle contient les champs suivants :

| Champ | Type | Description |
|-------|------|-------------|
| `id` | INT AUTO_INCREMENT | Clé primaire |
| `userId` | INT | Clé étrangère vers `users.id` |
| `status` | ENUM('pending', 'processing', 'completed', 'error') | Statut du job |
| `fileUrl` | TEXT | URL S3 du fichier audio/vidéo |
| `fileName` | VARCHAR(255) | Nom original du fichier |
| `duration` | INT | Durée en secondes (rempli après transcription) |
| `resultUrl` | TEXT | URL S3 du fichier SRT principal |
| `resultSrt` | TEXT | Contenu du fichier SRT |
| `resultVtt` | TEXT | Contenu du fichier VTT |
| `resultTxt` | TEXT | Contenu du fichier TXT (transcription brute) |
| `errorMessage` | TEXT | Message d'erreur en cas d'échec |
| `createdAt` | TIMESTAMP | Date de création |
| `updatedAt` | TIMESTAMP | Date de dernière mise à jour |

### Relations

La relation entre `users` et `transcriptions` est de type **1:N** (un utilisateur peut avoir plusieurs transcriptions). La clé étrangère `userId` dans `transcriptions` référence `users.id` avec `ON DELETE CASCADE`, ce qui signifie que la suppression d'un utilisateur supprime automatiquement toutes ses transcriptions associées.

---

## Flux de Données

### Flux d'Authentification

Le flux d'authentification commence lorsque l'utilisateur clique sur "Se connecter" et est redirigé vers Clerk (OAuth Google/GitHub). Après authentification réussie, Clerk redirige vers `/api/oauth/callback` avec un code d'autorisation. Le backend échange ce code contre un JWT Clerk, crée ou met à jour l'utilisateur dans MySQL via `upsertUser()`, et définit un cookie de session sécurisé (HttpOnly, Secure, SameSite=None). Le frontend lit l'état d'authentification via `useAuth()` qui appelle `trpc.auth.me.useQuery()`, et toutes les requêtes suivantes incluent automatiquement le cookie de session.

### Flux de Transcription

Le flux de transcription se déroule en plusieurs étapes orchestrées entre le frontend, le backend et les services externes. Tout d'abord, l'utilisateur sélectionne un fichier audio/vidéo dans le frontend, qui appelle `trpc.transcriptions.getUploadUrl.useMutation()` pour obtenir une URL pré-signée S3. Le frontend uploade ensuite directement le fichier vers S3 via cette URL, puis appelle `trpc.transcriptions.create.useMutation()` avec le `fileUrl` et `fileName`. Le backend crée un enregistrement dans `transcriptions` avec `status='pending'`.

Le worker asynchrone, qui tourne en boucle toutes les 5 secondes, détecte le nouveau job pending et met à jour son statut à `processing`. Il télécharge le fichier audio depuis S3, appelle Groq API pour la transcription, génère les formats SRT, VTT et TXT, uploade les résultats vers S3, et met à jour l'enregistrement avec `status='completed'` et les URLs des résultats. Le frontend, qui poll régulièrement `trpc.transcriptions.list.useQuery()`, détecte le changement de statut et affiche les boutons de téléchargement.

### Flux de Téléchargement

Lorsque l'utilisateur clique sur "Télécharger SRT", le frontend récupère le contenu depuis `transcription.resultSrt` (stocké en base) et crée un blob pour téléchargement direct, sans passer par S3. Cette approche évite les frais de bande passante S3 pour les petits fichiers texte.

---

## Décisions Techniques

### Pourquoi tRPC au lieu de REST ?

Le choix de tRPC plutôt que REST s'explique par plusieurs avantages significatifs. Premièrement, la **sécurité des types de bout en bout** garantit que les types TypeScript sont automatiquement synchronisés entre le client et le serveur sans génération de code manuelle. Deuxièmement, l'**expérience développeur** est grandement améliorée avec l'autocomplétion IDE, la détection d'erreurs à la compilation et la refactorisation automatique. Troisièmement, il n'y a **pas de contrat d'API à maintenir** séparément (pas de Swagger/OpenAPI), ce qui réduit la charge de maintenance. Enfin, la **sérialisation automatique** via SuperJSON gère les types complexes (Date, BigInt) sans transformation manuelle.

### Pourquoi Groq API au lieu de OpenAI Whisper ?

Le choix de Groq API avec Whisper Large v3-turbo repose sur deux critères principaux. D'abord, le **coût** est significativement inférieur à OpenAI Whisper (environ 50% moins cher pour une qualité équivalente). Ensuite, la **performance** est meilleure avec des temps de transcription plus rapides grâce à l'infrastructure optimisée de Groq (LPU - Language Processing Unit).

### Pourquoi un Worker Simple au lieu d'une Queue ?

Pour le MVP, un worker simple basé sur le polling (toutes les 5 secondes) est suffisant car le volume attendu est faible (< 100 transcriptions/jour). Cette approche présente plusieurs avantages : **simplicité** (pas de dépendance externe comme Redis), **coût** (pas d'infrastructure supplémentaire), et **débogage facile** (logs simples dans la console). Pour l'évolution future, lorsque le volume augmentera, il sera possible de migrer vers **Bull/BullMQ** avec Redis pour une gestion avancée des jobs (retry, priorité, concurrence).

### Pourquoi Clerk au lieu d'Auth.js ?

Le choix de Clerk plutôt qu'Auth.js (anciennement NextAuth) s'explique par plusieurs facteurs. Premièrement, l'**expérience utilisateur** est meilleure avec des composants UI pré-construits, un portail utilisateur intégré et une gestion des sessions robuste. Deuxièmement, la **sécurité** est renforcée avec une protection anti-bot intégrée, une détection des anomalies et une conformité RGPD native. Troisièmement, les **fonctionnalités avancées** incluent la gestion des organisations, les webhooks pour la synchronisation et le support multi-tenant. Enfin, le **support** est professionnel avec une documentation complète et une assistance réactive.

---

## Sécurité

### Authentification et Autorisation

L'authentification est gérée par Clerk avec OAuth 2.0 (Google, GitHub) et des JWT signés avec RS256. Toutes les routes API protégées vérifient le JWT via `protectedProcedure` dans tRPC, qui extrait et valide le token automatiquement. Les cookies de session sont sécurisés avec les flags `HttpOnly` (protection XSS), `Secure` (HTTPS uniquement) et `SameSite=None` (support cross-origin pour Vercel/O2switch).

### Stockage des Fichiers

Les fichiers audio/vidéo et les résultats de transcription sont stockés sur AWS S3 avec des URLs pré-signées à durée limitée (1 heure). Les clés S3 incluent un suffixe aléatoire (nanoid) pour éviter l'énumération des fichiers. Les fichiers sont organisés par utilisateur (`uploads/{userId}/` et `results/{userId}/`) pour faciliter la gestion des permissions et la suppression en cascade.

### Protection des Données Sensibles

Toutes les clés API (Clerk, AWS, Groq) sont stockées dans des variables d'environnement et ne sont jamais exposées côté client. Les communications entre services utilisent HTTPS/TLS 1.3 pour le chiffrement en transit. Les données en base (MySQL) sont chiffrées au repos par O2switch (AES-256).

---

## Performance et Scalabilité

### Optimisations Frontend

Le frontend bénéficie de plusieurs optimisations pour garantir une expérience utilisateur fluide. Le **code splitting** automatique de Next.js charge uniquement le code nécessaire pour chaque page. Le **caching** des requêtes tRPC avec React Query évite les appels redondants au backend. Les **images optimisées** via `next/image` utilisent le format WebP et le lazy loading. Enfin, le **CDN global** de Vercel réduit la latence en servant les assets depuis le point d'accès le plus proche de l'utilisateur.

### Optimisations Backend

Le backend est optimisé pour gérer efficacement les requêtes et le traitement asynchrone. Le **pooling de connexions** MySQL (via Drizzle) réutilise les connexions existantes pour réduire la latence. Les **indexes** sur `userId` et `status` dans la table `transcriptions` accélèrent les requêtes fréquentes. Le **streaming** des fichiers audio depuis S3 évite de charger tout le fichier en mémoire. Enfin, le **worker asynchrone** traite les transcriptions en arrière-plan sans bloquer les requêtes API.

### Évolution Future

Pour supporter une croissance du trafic, plusieurs améliorations sont envisageables. Le passage à une **queue distribuée** (Bull/BullMQ avec Redis) permettra de gérer des milliers de jobs simultanés avec retry automatique. L'ajout de **workers multiples** (horizontal scaling) permettra de traiter plusieurs transcriptions en parallèle. L'implémentation d'un **cache Redis** pour les résultats de transcription fréquemment consultés réduira la charge sur MySQL. Enfin, la migration vers **AWS RDS** ou **PlanetScale** offrira une meilleure scalabilité de la base de données.

---

## Monitoring et Observabilité

### Logs

Les logs sont structurés avec des préfixes clairs pour faciliter le débogage. Le backend utilise `console.log` avec des tags `[Worker]`, `[OAuth]`, `[Database]` pour identifier rapidement la source des logs. En production, il est recommandé d'utiliser un service de logging centralisé comme **Logtail** ou **Datadog** pour agréger et analyser les logs.

### Métriques

Les métriques clés à surveiller incluent le **temps de transcription moyen** (Groq API), le **taux de succès des jobs** (completed vs error), le **temps de réponse API** (tRPC), et l'**utilisation de la bande passante S3** (upload/download). Ces métriques peuvent être collectées via **Vercel Analytics** pour le frontend et des outils comme **Prometheus** ou **Grafana** pour le backend.

### Alertes

Des alertes doivent être configurées pour les événements critiques : **échec de transcription** (> 5% d'erreurs), **latence API élevée** (> 2s), **échec de connexion MySQL** (indisponibilité de la base), et **quota S3 dépassé** (limite de stockage atteinte). Les alertes peuvent être envoyées via **email**, **Slack** ou **PagerDuty** selon la criticité.

---

## Diagramme d'Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         UTILISATEUR                              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Vercel)                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Next.js 15 + React 19 + TypeScript + Tailwind CSS 4   │    │
│  │  - Pages : Home, Dashboard, Upload, Transcriptions     │    │
│  │  - Auth : @clerk/nextjs (useAuth hook)                 │    │
│  │  - API Client : tRPC + React Query                     │    │
│  └─────────────────────────────────────────────────────────┘    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ tRPC over HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (O2switch)                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Express.js 4 + TypeScript + tRPC 11                   │    │
│  │  - Routes : /api/trpc/* (tRPC procedures)              │    │
│  │  - Auth : Clerk JWT verification                       │    │
│  │  - ORM : Drizzle (MySQL)                               │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Worker Asynchrone (Polling 5s)                        │    │
│  │  - Détecte jobs pending                                │    │
│  │  - Télécharge audio depuis S3                          │    │
│  │  - Appelle Groq API (Whisper)                          │    │
│  │  - Génère SRT/VTT/TXT                                  │    │
│  │  - Upload résultats vers S3                            │    │
│  │  - Met à jour statut en BDD                            │    │
│  └─────────────────────────────────────────────────────────┘    │
└───────┬───────────────────┬─────────────────────────────────────┘
        │                   │
        │                   │ SQL
        │                   ▼
        │         ┌─────────────────────────┐
        │         │   MySQL 8.0 (O2switch)  │
        │         │  - Table : users        │
        │         │  - Table : transcriptions│
        │         └─────────────────────────┘
        │
        │ HTTPS
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVICES EXTERNES                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Clerk      │  │   AWS S3     │  │   Groq API   │          │
│  │  (OAuth)     │  │  (Storage)   │  │  (Whisper)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Conclusion

L'architecture de Transcribe Express combine les meilleures pratiques modernes de développement web avec une approche pragmatique adaptée au MVP. L'utilisation de tRPC garantit une expérience développeur exceptionnelle avec une sécurité des types de bout en bout, tandis que l'architecture hybride Vercel/O2switch offre un équilibre optimal entre performance globale et contrôle des données. Le worker asynchrone simple permet de démarrer rapidement tout en gardant une voie d'évolution claire vers une architecture plus robuste avec Bull/BullMQ. Cette base solide permettra de faire évoluer l'application en fonction des besoins réels des utilisateurs sans refonte majeure.

---

**Document maintenu par** : Manus AI  
**Dernière mise à jour** : 14 janvier 2026
