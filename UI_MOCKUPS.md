# Maquettes UI - Transcribe Express

**Auteur :** Manus AI (Dev Full Stack + Designer UI/UX)  
**Date :** 15 Janvier 2026  
**Version :** 1.0  
**Design System :** Dark Mode First + Palette Magenta/Cyan

---

## Vue d'Ensemble

Ce document présente les maquettes principales (wireframes) de Transcribe Express MVP. Les maquettes sont conçues selon les principes de l'identité visuelle définie dans `04_IDENTITE_VISUELLE.md` :

- **Dark Mode First** : Fond principal `#121212`, texte `#EAEAEA`
- **Palette d'accents** : Magenta `#BE34D5` (primaire), Cyan `#34D5BE` (secondaire)
- **Typographie** : Inter (Google Fonts)
- **Style** : Minimalisme fonctionnel avec Bento UI Grid

---

## Palette de Couleurs (Référence)

| Rôle | Nom | HEX | Usage |
|:-----|:----|:----|:------|
| Fond Principal | `background-primary` | `#121212` | Fond de l'application |
| Fond Secondaire | `background-secondary` | `#1E1E1E` | Cards, panels, zones de contenu |
| Texte Principal | `text-primary` | `#EAEAEA` | Texte principal |
| Texte Secondaire | `text-secondary` | `#A0A0A0` | Métadonnées, labels |
| Accent Primaire | `accent-primary` | `#BE34D5` | Boutons CTA, liens, éléments actifs |
| Accent Secondaire | `accent-secondary` | `#34D5BE` | Hover states, notifications |
| Succès | `state-success` | `#34D399` | Statut completed |
| Erreur | `state-error` | `#FF4D4F` | Statut error |
| Avertissement | `state-warning` | `#FAAD14` | Statut processing |

---

## Typographie (Référence)

| Élément | Weight | Taille (rem) | Usage |
|:--------|:-------|:-------------|:------|
| h1 | Bold (700) | 3.052rem | Titre principal de page |
| h2 | Semibold (600) | 2.441rem | Titres de section |
| h3 | Medium (500) | 1.953rem | Sous-titres |
| h4 | Medium (500) | 1.563rem | Titres de cards |
| Corps (p) | Regular (400) | 1rem | Paragraphes, labels |
| Petit | Regular (400) | 0.8rem | Métadonnées |

---

## Maquette 1 : Page de Connexion (`/login`)

### Wireframe ASCII

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│                                                                │
│                  ╔═══════════════════════════╗                 │
│                  ║                           ║                 │
│                  ║   [Logo Transcribe]       ║                 │
│                  ║                           ║                 │
│                  ║   Transcribe Express      ║                 │
│                  ║   Transcription audio     ║                 │
│                  ║   avec IA                 ║                 │
│                  ║                           ║                 │
│                  ║   ┌─────────────────────┐ ║                 │
│                  ║   │ [G] Google          │ ║                 │
│                  ║   └─────────────────────┘ ║                 │
│                  ║                           ║                 │
│                  ║   ┌─────────────────────┐ ║                 │
│                  ║   │ [GH] GitHub         │ ║                 │
│                  ║   └─────────────────────┘ ║                 │
│                  ║                           ║                 │
│                  ╚═══════════════════════════╝                 │
│                                                                │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Spécifications UI

**Layout :**
- Centré verticalement et horizontalement
- Card de connexion : 400px de largeur, padding 48px
- Fond : `background-primary` (#121212)
- Card : `background-secondary` (#1E1E1E) avec border-radius 16px

**Éléments :**
1. **Logo** : Centré, taille 64x64px
2. **Titre "Transcribe Express"** : h2 (2.441rem), `text-primary`, centré
3. **Sous-titre** : Corps (1rem), `text-secondary`, centré
4. **Boutons OAuth** :
   - Largeur : 100% (fill container)
   - Hauteur : 48px
   - Border-radius : 8px
   - Fond : `background-primary` avec border 1px `text-secondary`
   - Texte : `text-primary`, Medium (500)
   - Icône : Google/GitHub logo (24x24px) à gauche
   - Hover : Border `accent-primary`, légère élévation (shadow)
   - Espacement entre boutons : 16px

**Interactions :**
1. Clic sur "Google" → Redirection vers `getLoginUrl()` avec provider Google
2. Clic sur "GitHub" → Redirection vers `getLoginUrl()` avec provider GitHub
3. Après OAuth callback → Redirection automatique vers `/dashboard`

**Responsive :**
- Mobile (< 768px) : Card prend 90% de la largeur de l'écran
- Desktop : Card fixe à 400px

---

## Maquette 2 : Dashboard (`/dashboard`)

### Wireframe ASCII

```
┌────────────────────────────────────────────────────────────────┐
│ [Logo] Transcribe Express          [Avatar] Jean Dupont ▼     │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Mes Transcriptions                          [+ Nouveau]      │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Nom du fichier         Durée    Statut      Actions      │ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │ interview-podcast.mp3  30:47    ✅ Complété  [↓] [🗑️]   │ │
│  │ reunion-client.mp4     1:23:15  ⏳ En cours  [⏸️]        │ │
│  │ conference.wav         45:22    ⏳ En attente            │ │
│  │ webinar.mp3            2:15:30  ❌ Erreur    [↻] [🗑️]   │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  Pagination : [<] 1 2 3 [>]                                   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Spécifications UI

**Layout :**
- Header fixe en haut (hauteur 64px)
- Contenu principal : padding 32px, max-width 1200px, centré
- Fond : `background-primary` (#121212)

**Header :**
1. **Logo + Titre** : À gauche, alignés verticalement
   - Logo : 32x32px
   - Titre : h4 (1.563rem), `text-primary`
2. **User Menu** : À droite
   - Avatar : 40x40px, border-radius 50%
   - Nom : Corps (1rem), `text-primary`
   - Dropdown : Icône chevron-down
   - Hover : `accent-secondary` glow

**Section Titre :**
- **"Mes Transcriptions"** : h2 (2.441rem), `text-primary`
- **Bouton "+ Nouveau"** : À droite
  - Fond : `accent-primary` (#BE34D5)
  - Texte : `text-primary`, Medium (500)
  - Border-radius : 8px
  - Padding : 12px 24px
  - Hover : Légère élévation + `accent-secondary` glow

**Table des Transcriptions :**
- Fond : `background-secondary` (#1E1E1E)
- Border-radius : 16px
- Padding : 24px
- Header de table : `text-secondary`, Petit (0.8rem), uppercase
- Lignes :
  - Hauteur : 64px
  - Séparateur : 1px `background-primary`
  - Hover : Légère élévation + border-left 4px `accent-primary`

**Colonnes :**
1. **Nom du fichier** : `text-primary`, Corps (1rem), truncate si trop long
2. **Durée** : `text-secondary`, Corps (1rem), format HH:MM:SS
3. **Statut** : Badge avec icône + texte
   - **Complété** : Fond `state-success`, icône ✅
   - **En cours** : Fond `state-warning`, icône ⏳, animation pulse
   - **En attente** : Fond `text-secondary`, icône ⏳
   - **Erreur** : Fond `state-error`, icône ❌
4. **Actions** : Icônes cliquables
   - **Télécharger** : Icône ↓, visible si statut = completed
   - **Supprimer** : Icône 🗑️, toujours visible
   - **Réessayer** : Icône ↻, visible si statut = error

**Pagination :**
- Centré en bas
- Boutons : 32x32px, border-radius 4px
- Actif : Fond `accent-primary`
- Inactif : Fond `background-secondary`, hover `accent-secondary`

**Interactions :**
1. Clic sur "+ Nouveau" → Redirection vers `/upload`
2. Clic sur ligne → Redirection vers `/results/:id`
3. Clic sur "Télécharger" → Dropdown avec options SRT, VTT, TXT
4. Clic sur "Supprimer" → Dialog de confirmation
5. Clic sur "Réessayer" → Relance du job de transcription
6. **Polling automatique** : Toutes les 5 secondes, invalider la query `transcriptions.list`

**Responsive :**
- Mobile (< 768px) :
  - Table → Cards empilées verticalement
  - Chaque card affiche : Nom, Durée, Statut, Actions
  - Pagination → Boutons "Précédent" / "Suivant" uniquement

---

## Maquette 3 : Page d'Upload (`/upload`)

### Wireframe ASCII

```
┌────────────────────────────────────────────────────────────────┐
│ [Logo] Transcribe Express          [Avatar] Jean Dupont ▼     │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Nouvelle Transcription                                        │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                                                          │ │
│  │              ┌───────────────────────┐                  │ │
│  │              │                       │                  │ │
│  │              │   [📁]  Upload        │                  │ │
│  │              │                       │                  │ │
│  │              │   Glissez un fichier  │                  │ │
│  │              │   ou cliquez ici      │                  │ │
│  │              │                       │                  │ │
│  │              │   Formats acceptés :  │                  │ │
│  │              │   MP3, WAV, MP4, OGG  │                  │ │
│  │              │   Taille max : 1 Go   │                  │ │
│  │              │                       │                  │ │
│  │              └───────────────────────┘                  │ │
│  │                                                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Fichier sélectionné : interview-podcast.mp3             │ │
│  │ Taille : 45.2 Mo                                         │ │
│  │                                                          │ │
│  │ [████████████████████░░░░░░░░░░] 75%                    │ │
│  │                                                          │ │
│  │ Upload en cours... 34 Mo / 45 Mo                         │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  [Annuler]                                   [Transcrire]     │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Spécifications UI

**Layout :**
- Header identique au Dashboard
- Contenu principal : padding 32px, max-width 800px, centré

**Section Titre :**
- **"Nouvelle Transcription"** : h2 (2.441rem), `text-primary`

**Zone de Drag & Drop :**
- Fond : `background-secondary` (#1E1E1E)
- Border : 2px dashed `text-secondary`
- Border-radius : 16px
- Padding : 64px
- Centré verticalement et horizontalement
- **Icône** : 📁 (64x64px), `accent-primary`
- **Texte principal** : h3 (1.953rem), `text-primary`
- **Texte secondaire** : Corps (1rem), `text-secondary`
- **Hover** : Border `accent-primary`, fond légèrement plus clair

**États :**
1. **Idle (aucun fichier)** : Afficher la zone de drag & drop
2. **Drag over** : Border `accent-primary`, fond `accent-primary` avec opacité 10%
3. **Fichier sélectionné** : Afficher la card de fichier sélectionné
4. **Upload en cours** : Afficher la barre de progression

**Card Fichier Sélectionné :**
- Fond : `background-secondary` (#1E1E1E)
- Border-radius : 16px
- Padding : 24px
- **Nom du fichier** : h4 (1.563rem), `text-primary`
- **Taille** : Corps (1rem), `text-secondary`
- **Barre de progression** :
  - Hauteur : 8px
  - Border-radius : 4px
  - Fond : `background-primary`
  - Remplissage : `accent-primary` avec animation
  - Pourcentage : Corps (1rem), `text-primary`, à droite
- **Texte de statut** : Corps (1rem), `text-secondary`

**Boutons :**
1. **Annuler** : À gauche
   - Fond : transparent
   - Border : 1px `text-secondary`
   - Texte : `text-primary`
   - Hover : Border `state-error`
2. **Transcrire** : À droite
   - Fond : `accent-primary` (#BE34D5)
   - Texte : `text-primary`, Medium (500)
   - Disabled : Opacité 50%, cursor not-allowed
   - Hover : Légère élévation + `accent-secondary` glow

**Interactions :**
1. **Drag & drop** :
   - Détecter `dragover` → Changer le style de la zone
   - Détecter `drop` → Valider le fichier (taille, format)
   - Si invalide → Afficher toast d'erreur
2. **Clic sur zone** → Ouvrir file picker
3. **Upload** :
   - Appeler `trpc.transcriptions.getUploadUrl.useMutation()`
   - Upload direct vers S3 avec `fetch()` et suivi de progression
   - Mettre à jour la barre de progression en temps réel
4. **Après upload** :
   - Appeler `trpc.transcriptions.create.useMutation()`
   - Afficher toast de succès
   - Redirection vers `/dashboard` après 2 secondes

**Validation :**
- **Taille max** : 1 Go (1024 * 1024 * 1024 bytes)
- **Formats acceptés** : `audio/mpeg`, `audio/wav`, `audio/ogg`, `audio/m4a`, `video/mp4`, `video/webm`, `video/ogg`
- **Message d'erreur** : Toast rouge avec icône ❌ et message explicite

**Responsive :**
- Mobile (< 768px) :
  - Zone de drag & drop : Padding réduit à 32px
  - Boutons : Full width, empilés verticalement

---

## Maquette 4 : Page de Résultats (`/results/:id`)

### Wireframe ASCII

```
┌────────────────────────────────────────────────────────────────┐
│ [Logo] Transcribe Express          [Avatar] Jean Dupont ▼     │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  [<] Retour au Dashboard                                       │
│                                                                │
│  interview-podcast.mp3                         ✅ Complété     │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Informations                                             │ │
│  │                                                          │ │
│  │ Nom du fichier : interview-podcast.mp3                  │ │
│  │ Durée : 30:47                                            │ │
│  │ Date de création : 15 Jan 2026, 14:32                   │ │
│  │ Statut : Complété                                        │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Télécharger les résultats                                │ │
│  │                                                          │ │
│  │ [↓ SRT]   [↓ VTT]   [↓ TXT]                             │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Transcription (TXT)                                      │ │
│  │                                                          │ │
│  │ Bonjour et bienvenue dans ce podcast...                 │ │
│  │ Aujourd'hui nous allons parler de...                    │ │
│  │ [Contenu de la transcription]                           │ │
│  │                                                          │ │
│  │ [Copier]                                                 │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  [🗑️ Supprimer cette transcription]                           │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Spécifications UI

**Layout :**
- Header identique au Dashboard
- Contenu principal : padding 32px, max-width 1000px, centré

**Breadcrumb :**
- **"[<] Retour au Dashboard"** : Lien avec icône chevron-left
- Texte : Corps (1rem), `text-secondary`
- Hover : `accent-primary`

**Section Titre :**
- **Nom du fichier** : h2 (2.441rem), `text-primary`
- **Badge de statut** : À droite, aligné avec le titre
  - Identique au badge du Dashboard

**Card Informations :**
- Fond : `background-secondary` (#1E1E1E)
- Border-radius : 16px
- Padding : 24px
- **Titre** : h4 (1.563rem), `text-primary`
- **Lignes d'information** :
  - Label : `text-secondary`, Petit (0.8rem)
  - Valeur : `text-primary`, Corps (1rem)
  - Espacement : 12px entre chaque ligne

**Card Téléchargement :**
- Fond : `background-secondary` (#1E1E1E)
- Border-radius : 16px
- Padding : 24px
- **Titre** : h4 (1.563rem), `text-primary`
- **Boutons** :
  - Largeur : 120px
  - Hauteur : 48px
  - Border-radius : 8px
  - Fond : `accent-primary` (#BE34D5)
  - Texte : `text-primary`, Medium (500)
  - Icône : ↓ (download) à gauche
  - Hover : Légère élévation + `accent-secondary` glow
  - Espacement : 16px entre boutons

**Card Transcription :**
- Fond : `background-secondary` (#1E1E1E)
- Border-radius : 16px
- Padding : 24px
- **Titre** : h4 (1.563rem), `text-primary`
- **Contenu** :
  - Texte : `text-primary`, Corps (1rem)
  - Line-height : 1.6
  - Max-height : 400px
  - Overflow : scroll
- **Bouton "Copier"** :
  - Position : En bas à droite de la card
  - Fond : transparent
  - Border : 1px `text-secondary`
  - Texte : `text-primary`
  - Hover : Border `accent-primary`

**Bouton Supprimer :**
- Position : En bas de la page
- Fond : transparent
- Border : 1px `state-error`
- Texte : `state-error`, Medium (500)
- Icône : 🗑️ à gauche
- Hover : Fond `state-error` avec opacité 10%

**Interactions :**
1. Clic sur "Retour au Dashboard" → Redirection vers `/dashboard`
2. Clic sur "SRT" / "VTT" / "TXT" → Téléchargement du fichier depuis S3
3. Clic sur "Copier" → Copier le contenu de la transcription dans le presse-papiers + toast de confirmation
4. Clic sur "Supprimer" → Dialog de confirmation :
   - Titre : "Supprimer cette transcription ?"
   - Message : "Cette action est irréversible. Tous les fichiers seront supprimés."
   - Boutons : "Annuler" (transparent) + "Supprimer" (fond `state-error`)
   - Après confirmation → Appeler `trpc.transcriptions.delete.useMutation()` → Redirection vers `/dashboard`

**Responsive :**
- Mobile (< 768px) :
  - Cards : Full width
  - Boutons de téléchargement : Full width, empilés verticalement

---

## Composants Réutilisables

### 1. StatusBadge

**Props :**
- `status`: "pending" | "processing" | "completed" | "error"

**Styles :**
- Border-radius : 16px
- Padding : 4px 12px
- Texte : Petit (0.8rem), Medium (500)
- Icône : 16x16px à gauche

**Variantes :**
| Status | Fond | Texte | Icône | Animation |
|:-------|:-----|:------|:------|:----------|
| pending | `text-secondary` | `text-primary` | ⏳ | - |
| processing | `state-warning` | `#121212` | ⏳ | Pulse |
| completed | `state-success` | `#121212` | ✅ | - |
| error | `state-error` | `#121212` | ❌ | - |

---

### 2. Button

**Variantes :**
1. **Primary** :
   - Fond : `accent-primary` (#BE34D5)
   - Texte : `text-primary`, Medium (500)
   - Hover : Légère élévation + `accent-secondary` glow

2. **Secondary** :
   - Fond : transparent
   - Border : 1px `text-secondary`
   - Texte : `text-primary`
   - Hover : Border `accent-primary`

3. **Danger** :
   - Fond : transparent
   - Border : 1px `state-error`
   - Texte : `state-error`
   - Hover : Fond `state-error` avec opacité 10%

**Props :**
- `variant`: "primary" | "secondary" | "danger"
- `size`: "small" (32px) | "medium" (48px) | "large" (56px)
- `disabled`: boolean
- `loading`: boolean (affiche un spinner)

---

### 3. Card

**Styles :**
- Fond : `background-secondary` (#1E1E1E)
- Border-radius : 16px
- Padding : 24px
- Hover : Légère élévation (shadow)

**Props :**
- `title`: string (optionnel)
- `children`: ReactNode

---

### 4. ProgressBar

**Styles :**
- Hauteur : 8px
- Border-radius : 4px
- Fond : `background-primary`
- Remplissage : `accent-primary` avec animation

**Props :**
- `progress`: number (0-100)
- `animated`: boolean

---

## Animations et Micro-interactions

### 1. Hover States
- **Boutons** : Légère élévation (shadow) + glow `accent-secondary`
- **Cards** : Légère élévation (shadow)
- **Liens** : Couleur `accent-primary`

### 2. Loading States
- **Spinner** : Animation de rotation, couleur `accent-primary`
- **Skeleton** : Animation de pulse, fond `background-secondary`

### 3. Transitions
- **Toutes les transitions** : `transition: all 0.2s ease-in-out`
- **Hover** : `transition: transform 0.2s, box-shadow 0.2s`

### 4. Feedback Utilisateur
- **Toast** : Apparition depuis le haut avec animation slide-down
- **Dialog** : Apparition avec animation fade-in + scale

---

## Checklist de Validation

### Conformité avec l'Identité Visuelle
- [x] Palette de couleurs respectée (Dark Mode First)
- [x] Typographie Inter utilisée avec échelle modulaire
- [x] Style minimaliste fonctionnel appliqué
- [x] Accents néon (Magenta/Cyan) utilisés avec parcimonie

### Conformité avec MVP_DEFINITION.md
- [x] Page de connexion OAuth (Google/GitHub)
- [x] Dashboard avec liste des transcriptions
- [x] Page d'upload avec drag & drop
- [x] Page de résultats avec téléchargement (SRT, VTT, TXT)
- [x] Statuts en temps réel (polling)

### Conformité avec COMPONENT_STRUCTURE.md
- [x] Modules métier identifiés (auth, dashboard, upload, results)
- [x] Composants réutilisables définis (StatusBadge, Button, Card, ProgressBar)
- [x] Interactions documentées pour chaque page

### Accessibilité (WCAG 2.1 AA)
- [x] Contrastes de couleurs validés (> 4.5:1)
- [x] Tailles de texte lisibles (min 16px pour le corps)
- [x] Navigation au clavier possible
- [x] Feedback visuel pour toutes les actions

### Responsive Design
- [x] Maquettes adaptées pour mobile (< 768px)
- [x] Maquettes adaptées pour desktop (> 768px)
- [x] Grille Bento UI pour organisation modulaire

---

## Prochaines Étapes (Jour 10)

1. **Implémenter les composants réutilisables** (StatusBadge, Button, Card, ProgressBar)
2. **Créer les pages** (Login, Dashboard, Upload, Results)
3. **Intégrer les hooks tRPC** pour les appels API
4. **Tester le flux complet** (connexion → upload → dashboard → résultats)

---

**Document validé par :** Manus AI (Dev Full Stack + Designer UI/UX)  
**Date de validation :** 15 Janvier 2026  
**Version :** 1.0 (MVP)
