# Schéma de Base de Données - Transcribe Express

**Auteur :** Manus AI (Dev Full Stack)  
**Date :** 15 Janvier 2026  
**Version :** 1.0  
**ORM :** Drizzle ORM  
**Base de données :** MySQL (TiDB Cloud)

---

## Vue d'Ensemble

Le schéma de base de données de Transcribe Express est conçu pour gérer l'authentification des utilisateurs et le cycle de vie complet des transcriptions audio/vidéo. L'architecture repose sur deux tables principales qui forment le cœur du système MVP.

La conception privilégie la **simplicité** et la **scalabilité progressive**. Les relations entre tables utilisent des contraintes référentielles strictes (`ON DELETE CASCADE`) pour garantir l'intégrité des données. Les timestamps automatiques permettent un audit complet des opérations.

---

## Diagramme ERD (Entity-Relationship Diagram)

```
┌─────────────────────────────────────────────────────────────────┐
│                            USERS                                │
├─────────────────────────────────────────────────────────────────┤
│ PK  id              INT (AUTO_INCREMENT)                        │
│ UQ  openId          VARCHAR(64)  [Manus OAuth ID]              │
│     name            TEXT                                        │
│     email           VARCHAR(320)                                │
│     loginMethod     VARCHAR(64)  [google, github, email]       │
│     role            ENUM('user', 'admin') DEFAULT 'user'        │
│     createdAt       TIMESTAMP DEFAULT NOW()                     │
│     updatedAt       TIMESTAMP DEFAULT NOW() ON UPDATE NOW()     │
│     lastSignedIn    TIMESTAMP DEFAULT NOW()                     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ 1:N
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        TRANSCRIPTIONS                           │
├─────────────────────────────────────────────────────────────────┤
│ PK  id              INT (AUTO_INCREMENT)                        │
│ FK  userId          INT → users.id (ON DELETE CASCADE)          │
│     status          ENUM('pending','processing',                │
│                          'completed','error')                   │
│                     DEFAULT 'pending'                           │
│     fileUrl         TEXT [S3 URL du fichier source]            │
│     fileName        VARCHAR(255)                                │
│     duration        INT [Durée en secondes]                     │
│     resultUrl       TEXT [S3 URL du dossier résultats]         │
│     resultSrt       TEXT [Contenu SRT]                          │
│     resultVtt       TEXT [Contenu VTT]                          │
│     resultTxt       TEXT [Contenu TXT]                          │
│     errorMessage    TEXT                                        │
│     createdAt       TIMESTAMP DEFAULT NOW()                     │
│     updatedAt       TIMESTAMP DEFAULT NOW() ON UPDATE NOW()     │
└─────────────────────────────────────────────────────────────────┘

Indexes:
  - users.openId (UNIQUE)
  - transcriptions.userId (FK INDEX)
```

---

## Table : `users`

La table `users` gère l'authentification et les informations de profil des utilisateurs. Elle est synchronisée avec Clerk via OAuth et sert de référence pour toutes les opérations liées aux transcriptions.

### Structure

| Colonne | Type | Contraintes | Description |
|:--------|:-----|:------------|:------------|
| **id** | INT | PRIMARY KEY, AUTO_INCREMENT | Identifiant unique interne de l'utilisateur |
| **openId** | VARCHAR(64) | NOT NULL, UNIQUE | Identifiant OAuth Manus (provenant de Clerk) |
| **name** | TEXT | NULLABLE | Nom complet de l'utilisateur |
| **email** | VARCHAR(320) | NULLABLE | Adresse email de l'utilisateur |
| **loginMethod** | VARCHAR(64) | NULLABLE | Méthode de connexion (google, github, email) |
| **role** | ENUM('user', 'admin') | NOT NULL, DEFAULT 'user' | Rôle de l'utilisateur |
| **createdAt** | TIMESTAMP | NOT NULL, DEFAULT NOW() | Date de création du compte |
| **updatedAt** | TIMESTAMP | NOT NULL, DEFAULT NOW(), ON UPDATE NOW() | Date de dernière mise à jour |
| **lastSignedIn** | TIMESTAMP | NOT NULL, DEFAULT NOW() | Date de dernière connexion |

### Indexes

- **PRIMARY KEY** : `id`
- **UNIQUE INDEX** : `openId` (garantit l'unicité de l'identifiant OAuth)

### Relations

- **1:N** avec `transcriptions` (un utilisateur peut avoir plusieurs transcriptions)

### Règles Métier

1. **Synchronisation Clerk** : Le champ `openId` est rempli automatiquement lors de la première connexion via le webhook Clerk `user.created`.
2. **Rôle admin** : Le propriétaire du projet (identifié par `OWNER_OPEN_ID`) reçoit automatiquement le rôle `admin` lors de l'upsert.
3. **Mise à jour automatique** : Le champ `updatedAt` est mis à jour automatiquement à chaque modification de l'enregistrement.
4. **Tracking de connexion** : Le champ `lastSignedIn` est mis à jour à chaque connexion réussie.

### Exemple de Données

```json
{
  "id": 1,
  "openId": "user_2abc123def456",
  "name": "Jean Dupont",
  "email": "jean.dupont@example.com",
  "loginMethod": "google",
  "role": "user",
  "createdAt": "2026-01-15T10:30:00Z",
  "updatedAt": "2026-01-15T10:30:00Z",
  "lastSignedIn": "2026-01-15T10:30:00Z"
}
```

---

## Table : `transcriptions`

La table `transcriptions` stocke l'ensemble du cycle de vie d'une transcription audio/vidéo, depuis l'upload initial jusqu'au résultat final. Elle est conçue pour supporter un workflow asynchrone avec un worker qui traite les jobs en arrière-plan.

### Structure

| Colonne | Type | Contraintes | Description |
|:--------|:-----|:------------|:------------|
| **id** | INT | PRIMARY KEY, AUTO_INCREMENT | Identifiant unique de la transcription |
| **userId** | INT | NOT NULL, FOREIGN KEY → users.id (ON DELETE CASCADE) | Propriétaire de la transcription |
| **status** | ENUM('pending', 'processing', 'completed', 'error') | NOT NULL, DEFAULT 'pending' | État actuel du job |
| **fileUrl** | TEXT | NOT NULL | URL S3 du fichier audio/vidéo source |
| **fileName** | VARCHAR(255) | NOT NULL | Nom original du fichier uploadé |
| **duration** | INT | NULLABLE | Durée du fichier en secondes (détectée par Groq) |
| **resultUrl** | TEXT | NULLABLE | URL S3 du dossier contenant les résultats |
| **resultSrt** | TEXT | NULLABLE | URL S3 du fichier SRT |
| **resultVtt** | TEXT | NULLABLE | URL S3 du fichier VTT |
| **resultTxt** | TEXT | NULLABLE | URL S3 du fichier TXT |
| **errorMessage** | TEXT | NULLABLE | Message d'erreur en cas d'échec |
| **createdAt** | TIMESTAMP | NOT NULL, DEFAULT NOW() | Date de création du job |
| **updatedAt** | TIMESTAMP | NOT NULL, DEFAULT NOW(), ON UPDATE NOW() | Date de dernière mise à jour |

### Indexes

- **PRIMARY KEY** : `id`
- **FOREIGN KEY INDEX** : `userId` (optimise les requêtes par utilisateur)

### Relations

- **N:1** avec `users` (plusieurs transcriptions appartiennent à un utilisateur)
- **ON DELETE CASCADE** : Suppression automatique des transcriptions si l'utilisateur est supprimé

### Machine à États (Status)

Le champ `status` suit un workflow strict :

```
pending → processing → completed
                    ↘ error
```

| Statut | Description | Actions possibles |
|:-------|:------------|:------------------|
| **pending** | Job créé, en attente de traitement | Worker peut démarrer le traitement |
| **processing** | Worker en cours de transcription | Attente de la réponse Groq API |
| **completed** | Transcription terminée avec succès | Téléchargement des résultats disponible |
| **error** | Échec de la transcription | `errorMessage` contient les détails |

### Règles Métier

1. **Création initiale** : Lors de la création, seuls `userId`, `fileUrl`, et `fileName` sont requis. Le statut est automatiquement `pending`.
2. **Worker asynchrone** : Un worker avec polling (5s) récupère les jobs `pending`, les passe en `processing`, appelle Groq API, génère les formats SRT/VTT/TXT, upload vers S3, puis met à jour le statut en `completed`.
3. **Gestion des erreurs** : En cas d'échec (Groq API timeout, S3 upload error), le statut passe à `error` et `errorMessage` est rempli.
4. **Suppression en cascade** : Si un utilisateur est supprimé, toutes ses transcriptions sont automatiquement supprimées de la BDD ET de S3 (via la procédure tRPC `transcriptions.delete`).

### Exemple de Données

#### Job Pending
```json
{
  "id": 42,
  "userId": 1,
  "status": "pending",
  "fileUrl": "https://s3.eu-west-3.amazonaws.com/transcribe-express-files/user-1/audio-abc123.mp3",
  "fileName": "interview-podcast.mp3",
  "duration": null,
  "resultUrl": null,
  "resultSrt": null,
  "resultVtt": null,
  "resultTxt": null,
  "errorMessage": null,
  "createdAt": "2026-01-15T11:00:00Z",
  "updatedAt": "2026-01-15T11:00:00Z"
}
```

#### Job Completed
```json
{
  "id": 42,
  "userId": 1,
  "status": "completed",
  "fileUrl": "https://s3.eu-west-3.amazonaws.com/transcribe-express-files/user-1/audio-abc123.mp3",
  "fileName": "interview-podcast.mp3",
  "duration": 1847,
  "resultUrl": "https://s3.eu-west-3.amazonaws.com/transcribe-express-files/user-1/results/",
  "resultSrt": "https://s3.eu-west-3.amazonaws.com/transcribe-express-files/user-1/results/audio-abc123.srt",
  "resultVtt": "https://s3.eu-west-3.amazonaws.com/transcribe-express-files/user-1/results/audio-abc123.vtt",
  "resultTxt": "https://s3.eu-west-3.amazonaws.com/transcribe-express-files/user-1/results/audio-abc123.txt",
  "errorMessage": null,
  "createdAt": "2026-01-15T11:00:00Z",
  "updatedAt": "2026-01-15T11:05:32Z"
}
```

---

## Migrations SQL

Le schéma est géré via Drizzle Kit avec génération automatique des migrations SQL. Les migrations sont versionnées et appliquées séquentiellement.

### Migration 0000 : Création de la table `users`

```sql
CREATE TABLE `users` (
  `id` int AUTO_INCREMENT NOT NULL,
  `openId` varchar(64) NOT NULL,
  `name` text,
  `email` varchar(320),
  `loginMethod` varchar(64),
  `role` enum('user','admin') NOT NULL DEFAULT 'user',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `lastSignedIn` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `users_id` PRIMARY KEY(`id`),
  CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
```

### Migration 0001 : Création de la table `transcriptions`

```sql
CREATE TABLE `transcriptions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `status` enum('pending','processing','completed','error') NOT NULL DEFAULT 'pending',
  `fileUrl` text NOT NULL,
  `fileName` varchar(255) NOT NULL,
  `duration` int,
  `resultUrl` text,
  `resultSrt` text,
  `resultVtt` text,
  `resultTxt` text,
  `errorMessage` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `transcriptions_id` PRIMARY KEY(`id`)
);

ALTER TABLE `transcriptions` 
  ADD CONSTRAINT `transcriptions_userId_users_id_fk` 
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) 
  ON DELETE cascade 
  ON UPDATE no action;
```

---

## Requêtes Courantes

### Récupérer toutes les transcriptions d'un utilisateur

```typescript
const transcriptions = await db
  .select()
  .from(transcriptions)
  .where(eq(transcriptions.userId, userId))
  .orderBy(desc(transcriptions.createdAt));
```

### Récupérer les jobs en attente pour le worker

```typescript
const pendingJobs = await db
  .select()
  .from(transcriptions)
  .where(eq(transcriptions.status, "pending"))
  .limit(10);
```

### Mettre à jour le statut d'une transcription

```typescript
await db
  .update(transcriptions)
  .set({ 
    status: "completed",
    resultSrt: srtUrl,
    resultVtt: vttUrl,
    resultTxt: txtUrl,
    duration: audioDuration
  })
  .where(eq(transcriptions.id, transcriptionId));
```

### Supprimer une transcription (avec suppression S3)

```typescript
// 1. Récupérer les URLs S3
const transcription = await db
  .select()
  .from(transcriptions)
  .where(eq(transcriptions.id, transcriptionId))
  .limit(1);

// 2. Supprimer les fichiers de S3
await deleteFromS3(transcription.fileUrl);
await deleteFromS3(transcription.resultSrt);
await deleteFromS3(transcription.resultVtt);
await deleteFromS3(transcription.resultTxt);

// 3. Supprimer l'enregistrement de la BDD
await db
  .delete(transcriptions)
  .where(eq(transcriptions.id, transcriptionId));
```

---

## Optimisations Futures

### Phase 2 (Sprint 2) : Monétisation

Ajout de colonnes pour la gestion des crédits :

```typescript
export const users = mysqlTable("users", {
  // ... colonnes existantes
  credits: int("credits").default(0).notNull(),
  plan: mysqlEnum("plan", ["free", "creator_pro", "studio_pro"]).default("free").notNull(),
});

export const transcriptions = mysqlTable("transcriptions", {
  // ... colonnes existantes
  costInCredits: int("costInCredits"), // Coût en crédits de la transcription
});
```

### Phase 3 (Sprint 3) : Fonctionnalités Pro

Ajout de tables pour les fonctionnalités avancées :

```typescript
// Table pour les chapitres YouTube
export const chapters = mysqlTable("chapters", {
  id: int("id").autoincrement().primaryKey(),
  transcriptionId: int("transcriptionId").notNull().references(() => transcriptions.id, { onDelete: "cascade" }),
  timestamp: int("timestamp").notNull(), // en secondes
  title: varchar("title", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Table pour les résumés SEO
export const summaries = mysqlTable("summaries", {
  id: int("id").autoincrement().primaryKey(),
  transcriptionId: int("transcriptionId").notNull().references(() => transcriptions.id, { onDelete: "cascade" }),
  summary: text("summary").notNull(),
  keywords: text("keywords"), // JSON array
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
```

---

## Validation de la Cohérence

### Conformité avec MVP_DEFINITION.md

| Exigence MVP | Implémentation | Statut |
|:-------------|:---------------|:-------|
| Authentification OAuth (Clerk) | Table `users` avec `openId` unique | ✅ Conforme |
| Gestion des transcriptions | Table `transcriptions` avec workflow complet | ✅ Conforme |
| Statuts (pending → completed/error) | Enum `status` avec 4 états | ✅ Conforme |
| Stockage S3 (source + résultats) | Colonnes `fileUrl`, `resultSrt`, `resultVtt`, `resultTxt` | ✅ Conforme |
| Relation User → Transcriptions | Foreign key avec ON DELETE CASCADE | ✅ Conforme |
| Timestamps automatiques | `createdAt`, `updatedAt` sur toutes les tables | ✅ Conforme |

### Conformité avec ARCHITECTURE.md

| Exigence Architecture | Implémentation | Statut |
|:----------------------|:---------------|:-------|
| ORM : Drizzle | Schéma défini avec Drizzle ORM | ✅ Conforme |
| Base de données : MySQL | Migrations SQL générées pour MySQL | ✅ Conforme |
| Hébergement : TiDB Cloud | Compatible MySQL | ✅ Conforme |
| Sécurité : ON DELETE CASCADE | Implémenté sur la foreign key `userId` | ✅ Conforme |

---

## Checklist de Validation

- [x] Schéma Drizzle créé et documenté
- [x] Migrations SQL générées (0000_useful_anthem.sql, 0001_milky_komodo.sql)
- [x] Migrations poussées vers MySQL avec `pnpm db:push`
- [x] Relations entre tables définies (users → transcriptions)
- [x] Contraintes référentielles (ON DELETE CASCADE)
- [x] Indexes créés automatiquement (PRIMARY KEY, UNIQUE, FOREIGN KEY)
- [x] Types TypeScript générés (`User`, `InsertUser`, `Transcription`, `InsertTranscription`)
- [x] Cohérence validée avec MVP_DEFINITION.md
- [x] Cohérence validée avec ARCHITECTURE.md
- [x] Diagramme ERD créé
- [x] Requêtes courantes documentées
- [x] Optimisations futures planifiées

---

**Document validé par :** Manus AI (Dev Full Stack)  
**Date de validation :** 15 Janvier 2026  
**Version du schéma :** 1.0 (MVP)
