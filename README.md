# 🎙️ Transcribe Express

**Application SaaS de transcription audio/vidéo ultra-précise pour créateurs de contenu français**

Convertissez vos fichiers audio et vidéo en texte en quelques secondes avec une précision exceptionnelle grâce à l'intelligence artificielle (Groq Whisper API).

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/votre-repo/transcribe-express)
[![Tests](https://img.shields.io/badge/tests-102%2F102-success.svg)](https://github.com/votre-repo/transcribe-express)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## 📋 Table des Matières

- [Fonctionnalités](#-fonctionnalités)
- [Stack Technique](#-stack-technique)
- [Prérequis](#-prérequis)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Utilisation](#-utilisation)
- [Tests](#-tests)
- [Déploiement](#-déploiement)
- [Architecture](#-architecture)
- [Contribution](#-contribution)
- [License](#-license)

---

## ✨ Fonctionnalités

### Fonctionnalités Principales

**Transcription Audio/Vidéo**
- Upload de fichiers audio et vidéo (mp3, wav, m4a, webm, mp4, ogg)
- Transcription automatique via Groq Whisper Large v3-turbo
- Support de fichiers jusqu'à 16MB et 60 minutes
- Retry automatique avec backoff exponentiel (max 3 tentatives)
- Estimation du temps de transcription en temps réel

**Gestion des Transcriptions**
- Dashboard avec liste complète des transcriptions
- Recherche en temps réel (debounce 300ms)
- Filtres par statut (Complété, En cours, En attente, Erreur)
- Filtres par date (Aujourd'hui, Cette semaine, Ce mois, Personnalisé)
- Pagination (20 transcriptions par page)
- Tri multi-colonnes (Date, Nom, Durée, Statut)
- Suppression de transcriptions (BDD + S3)

**Export Multi-Format**
- Export TXT (texte brut)
- Export SRT (sous-titres)
- Export VTT (sous-titres web)
- Copie rapide dans le presse-papiers

**Analytics et Statistiques**
- 4 KPIs : Total, Durée totale, Temps moyen, Taux de succès
- Graphique temporel : Transcriptions par jour (7 derniers jours)
- Graphique donut : Répartition par statut
- Export CSV des statistiques

**UX et Animations**
- Animations fluides avec Framer Motion
- Skeleton loaders sur toutes les pages
- Toast notifications avec Sonner (succès, erreur, info)
- Empty states avec illustrations SVG
- Dark mode par défaut avec palette Magenta/Cyan
- Design responsive (mobile, tablet, desktop)

**Authentification**
- OAuth via Clerk (Google, GitHub)
- Gestion automatique des sessions
- Synchronisation Clerk ↔ Manus OAuth

---

## 🛠️ Stack Technique

### Frontend
- **Framework :** React 19 + TypeScript
- **Build Tool :** Vite 7
- **Styling :** Tailwind CSS 4
- **Routing :** Wouter 3
- **State Management :** TanStack Query (React Query)
- **Animations :** Framer Motion 12
- **UI Components :** shadcn/ui + Radix UI
- **Charts :** Recharts 2
- **Notifications :** Sonner 2

### Backend
- **Runtime :** Node.js 22
- **Framework :** Express 4
- **API :** tRPC 11 (type-safe RPC)
- **Database :** MySQL (TiDB via Drizzle ORM)
- **Authentication :** Clerk + Manus OAuth
- **Transcription :** Groq Whisper API
- **Storage :** AWS S3 (via Manus)

### DevOps & Testing
- **Tests :** Vitest 2 (102/102 tests passent - 100%)
- **Linting :** ESLint + Prettier
- **CI/CD :** GitHub Actions (à venir)
- **Deployment :** Manus Sandbox
- **Load Testing :** k6

---

## 📦 Prérequis

- **Node.js** >= 22.x
- **pnpm** >= 10.x
- **MySQL** >= 8.0 (ou TiDB)
- **Compte Clerk** (pour OAuth)
- **Compte Groq** (pour transcription)
- **Compte AWS** (pour S3, ou utiliser Manus S3)

---

## 🚀 Installation

### 1. Cloner le repository

```bash
git clone https://github.com/votre-repo/transcribe-express.git
cd transcribe-express
```

### 2. Installer les dépendances

```bash
pnpm install
```

### 3. Configurer les variables d'environnement

Créer un fichier `.env` à la racine du projet :

```env
# Database
DATABASE_URL=mysql://user:password@host:port/database

# Clerk Authentication
CLERK_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx

# Groq API
GROQ_API_KEY=gsk_xxxxx

# AWS S3
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=transcribe-express

# JWT Secret
JWT_SECRET=your-secret-key-here

# Manus OAuth (si déployé sur Manus)
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im/oauth
VITE_APP_ID=your-app-id
OWNER_OPEN_ID=your-owner-id
OWNER_NAME=Your Name
```

### 4. Initialiser la base de données

```bash
pnpm db:push
```

Cette commande génère et applique les migrations Drizzle.

### 5. Lancer le serveur de développement

```bash
pnpm dev
```

L'application sera accessible sur `http://localhost:3000`

---

## ⚙️ Configuration

### Clerk OAuth

1. Créer un compte sur [Clerk.com](https://clerk.com)
2. Créer une nouvelle application
3. Activer les providers OAuth (Google, GitHub)
4. Copier les clés API dans `.env`

### Groq API

1. Créer un compte sur [Groq.com](https://groq.com)
2. Générer une clé API
3. Copier la clé dans `.env` (`GROQ_API_KEY`)

### AWS S3

1. Créer un bucket S3
2. Configurer les permissions IAM
3. Copier les credentials dans `.env`

**Note :** Si déployé sur Manus, les credentials S3 sont automatiquement injectés.

---

## 💻 Utilisation

### Démarrage rapide

1. **Connexion**
   - Cliquer sur "Se connecter" en haut à droite
   - Choisir Google ou GitHub OAuth
   - Autoriser l'application

2. **Upload d'un fichier**
   - Cliquer sur "Nouvelle Transcription" ou aller sur `/upload`
   - Glisser-déposer un fichier audio/vidéo (< 16MB, < 60 min)
   - Attendre la transcription automatique (durée audio / 10)

3. **Consulter les résultats**
   - Redirection automatique vers `/results/:id`
   - Télécharger en TXT, SRT ou VTT
   - Copier le texte dans le presse-papiers

4. **Gérer les transcriptions**
   - Dashboard : Rechercher, filtrer, trier, paginer
   - Analytics : Visualiser les statistiques et graphiques

---

## 🧪 Tests

### Lancer tous les tests

```bash
pnpm test
```

**Résultat attendu :** 102/102 tests passent (100%)

### Tests par catégorie

```bash
# Tests backend uniquement
pnpm test server/

# Tests frontend uniquement
pnpm test client/

# Tests avec couverture
pnpm test:coverage
```

### Vérification TypeScript

```bash
pnpm check
```

### Audit de sécurité

```bash
pnpm audit
```

### Tests de charge

```bash
# Installer k6
curl -L https://github.com/grafana/k6/releases/download/v0.54.0/k6-v0.54.0-linux-amd64.tar.gz -o k6.tar.gz
tar -xzf k6.tar.gz
sudo mv k6-v0.54.0-linux-amd64/k6 /usr/local/bin/

# Lancer les tests de charge (10 utilisateurs simultanés)
k6 run load-test.js
```

---

## 🚀 Déploiement

### Déploiement sur Manus

1. **Créer un checkpoint**

```bash
# Via l'interface Manus ou via CLI
# Les checkpoints sont automatiques après chaque commit
```

2. **Publier**

- Cliquer sur le bouton "Publish" dans l'interface Manus
- Choisir le domaine (xxx.manus.space ou domaine personnalisé)
- Valider le déploiement

3. **Vérifier**

- Accéder à l'URL de production
- Tester les fonctionnalités principales
- Vérifier les logs en cas d'erreur

### Déploiement manuel (autre plateforme)

```bash
# Build de production
pnpm build

# Démarrer le serveur
NODE_ENV=production node dist/index.js
```

**Note :** Assurez-vous que toutes les variables d'environnement sont configurées en production.

---

## 🏗️ Architecture

### Structure du projet

```
transcribe-express/
├── client/                 # Frontend React
│   ├── public/            # Assets statiques
│   ├── src/
│   │   ├── components/    # Composants réutilisables
│   │   ├── pages/         # Pages de l'application
│   │   ├── hooks/         # Custom hooks
│   │   ├── lib/           # Utilitaires (trpc, etc.)
│   │   ├── App.tsx        # Routes et layout
│   │   └── main.tsx       # Point d'entrée
│   └── index.html
├── server/                # Backend Express + tRPC
│   ├── _core/             # Infrastructure (OAuth, LLM, etc.)
│   ├── db.ts              # Helpers base de données
│   ├── routers.ts         # Procédures tRPC
│   └── *.test.ts          # Tests Vitest
├── drizzle/               # Schéma et migrations BDD
│   └── schema.ts
├── docs/                  # Documentation
├── lighthouse-reports/    # Rapports Lighthouse
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### Flux de données

```
User → React UI → tRPC Client → tRPC Server → Database/S3/Groq
                                            ↓
                                    Worker (transcription)
                                            ↓
                                    Update Database
                                            ↓
                                    Polling (5s) → UI Update
```

### Authentification

```
User → Clerk OAuth (Google/GitHub) → JWT Token
                                    ↓
                            /api/clerk/sync
                                    ↓
                        Manus OAuth Cookie (app_session_id)
                                    ↓
                        tRPC Context (ctx.user)
```

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Voici comment contribuer :

1. **Fork le projet**
2. **Créer une branche** (`git checkout -b feature/AmazingFeature`)
3. **Commit les changements** (`git commit -m 'Add some AmazingFeature'`)
4. **Push vers la branche** (`git push origin feature/AmazingFeature`)
5. **Ouvrir une Pull Request**

### Guidelines

- Suivre la méthodologie A-CDD (Agile-Context Driven Development)
- Écrire des tests pour toutes les nouvelles fonctionnalités
- Maintenir la couverture de tests > 80%
- Documenter les décisions techniques dans `docs/`
- Respecter les conventions de code (ESLint + Prettier)

---

## 📄 License

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

## 📞 Support

Pour toute question ou problème :

- **Issues :** [GitHub Issues](https://github.com/votre-repo/transcribe-express/issues)
- **Email :** support@transcribe-express.com
- **Documentation :** [Wiki](https://github.com/votre-repo/transcribe-express/wiki)

---

## 🙏 Remerciements

- **Groq** pour l'API Whisper ultra-rapide
- **Clerk** pour l'authentification OAuth simplifiée
- **Manus** pour la plateforme de déploiement
- **shadcn/ui** pour les composants UI de qualité

---

**Développé avec ❤️ par l'équipe Transcribe Express**
