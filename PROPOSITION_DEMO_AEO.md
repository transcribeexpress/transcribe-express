# Proposition de Démo Interactive — Transcribe Express
## Accélérateur de Conversion + Point d'Entrée AEO

---

## 1. Diagnostic : Pourquoi le bouton « Voir la démo » doit évoluer

Actuellement, le bouton « Voir la démo » sur la page d'accueil ne mène nulle part. Il représente pourtant le **point de conversion le plus stratégique** du SaaS : c'est le moment où un visiteur curieux décide de devenir un utilisateur convaincu.

Dans le contexte AEO (Answer Engine Optimization), ce bouton a une double mission :

1. **Convertir les visiteurs directs** — ceux qui arrivent depuis la page d'accueil
2. **Servir de landing page AEO** — quand un moteur de recherche IA (ChatGPT, Perplexity, Google AI Overview) recommande Transcribe Express, le visiteur doit atterrir sur une page qui **confirme immédiatement** la recommandation de l'IA

---

## 2. Solution recommandée : La « Micro-Sandbox » sans inscription

### Concept

Une page `/demo` qui permet au visiteur de **voir une transcription se dérouler en temps réel** sur un fichier audio pré-chargé, **sans aucune inscription**. Le visiteur constate la qualité de Whisper en 30 secondes.

### Pourquoi ce format

| Format de démo | Taux de conversion moyen | Friction | Pertinence AEO |
|:--|:--|:--|:--|
| Vidéo passive | 10-15% de visionnage | Faible | Faible (non extractible par l'IA) |
| Formulaire « Book a demo » | 2-5% de complétion | Élevée | Nulle |
| Product Tour guidé | 20-30% d'engagement | Moyenne | Moyenne |
| **Micro-Sandbox sans inscription** | **+70% d'inscriptions à l'essai** | **Zéro** | **Maximale** |

> Les démos interactives génèrent des taux de conversion supérieurs de **32%** par rapport aux approches traditionnelles. Le top 25% des démos interactives surpasse les vidéos de **2,5 fois** en performance. [1]

### Architecture de la page `/demo`

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER : Logo + Navigation (Accueil | Tarifs | Contact | Mon Transcribe)  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  HERO AEO (H1 + paragraphe extractible par l'IA)               │
│  "Transcribe Express : Transcription IA ultra-précise           │
│   en français — Testez en 30 secondes"                          │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ZONE DÉMO INTERACTIVE                                          │
│  ┌───────────────────────────────────────────────────────┐      │
│  │  🎵 Fichier audio pré-chargé (30s interview FR)       │      │
│  │  [▶ Lancer la transcription]                          │      │
│  │                                                       │      │
│  │  Résultat en temps réel :                             │      │
│  │  "Bonjour, aujourd'hui nous allons parler de..."      │      │
│  │  ← Texte qui s'affiche mot par mot                   │      │
│  └───────────────────────────────────────────────────────┘      │
│                                                                 │
│  CTA : "Impressionné ? Essayez avec votre propre fichier →"    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SECTION "COMMENT ÇA MARCHE" (balisage HowTo)                  │
│  Étape 1 → Étape 2 → Étape 3                                   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SECTION "CAS D'USAGE" (blocs extractibles AEO)                │
│  • Pour les créateurs de contenu                                │
│  • Pour les journalistes                                        │
│  • Pour les entreprises                                         │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  FAQ STRUCTURÉE (balisage FAQPage)                              │
│  Q: Quelle est la précision de Transcribe Express ?             │
│  Q: Quels formats audio/vidéo sont supportés ?                  │
│  Q: Mes données sont-elles sécurisées ?                         │
│  Q: Combien coûte Transcribe Express ?                          │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CTA FINAL : "Commencer gratuitement — 30 minutes offertes"    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Optimisation AEO de la page `/demo`

### 3.1 Balisage Schema.org

Trois balises indispensables à implémenter dans le `<head>` de la page :

| Balise | Rôle | Contenu |
|:--|:--|:--|
| `SoftwareApplication` | Identifier Transcribe Express comme logiciel | Nom, catégorie, prix, OS, note |
| `FAQPage` | Réponses officielles aux questions fréquentes | 5-8 paires Q/R concises (50-100 mots) |
| `HowTo` | Expliquer le processus en 3 étapes | Upload → Transcription → Export |

### 3.2 Contenu « Answer-First »

Chaque section de la page doit commencer par une **réponse directe en 40-60 mots** avant de développer. Les LLM extraient des passages courts ; si l'information nécessite de lire trois paragraphes, l'IA l'ignorera.

**Exemple de paragraphe optimisé AEO :**

> Transcribe Express est un SaaS français de transcription audio/vidéo par intelligence artificielle. Basé sur le modèle Whisper, il offre une précision supérieure à 95% en français et traite les fichiers en quelques secondes. Conforme au RGPD, il est conçu pour les créateurs de contenu, journalistes et entreprises.

### 3.3 Accessibilité pour les crawlers IA

| Action technique | Pourquoi |
|:--|:--|
| Vérifier que GPTBot, ClaudeBot et PerplexityBot ne sont pas bloqués dans `robots.txt` | Les bots IA doivent pouvoir crawler la page |
| Contenu textuel en HTML statique (pas uniquement en JavaScript) | Les bots IA ne rendent pas toujours le JS |
| Méta-description optimisée pour la citation | « Transcribe Express — SaaS français de transcription IA (Whisper). Testez gratuitement en 30 secondes. » |
| Cohérence de l'entité sur toutes les plateformes | Même description sur G2, Capterra, LinkedIn |

### 3.4 Stratégie de maillage interne

La page `/demo` doit être liée depuis :
- La page d'accueil (bouton « Voir la démo »)
- La page tarifs (« Tester avant d'acheter »)
- La page contact (« Découvrir le service »)
- Tout futur article de blog (liens contextuels vers la démo)

---

## 4. Parcours utilisateur depuis une recommandation AEO

```
Utilisateur → "Quel outil de transcription IA en français ?"
     │
     ▼
ChatGPT/Perplexity → "Transcribe Express est un SaaS français
                       basé sur Whisper, précision >95%, RGPD..."
     │
     ▼
Clic sur transcribeexpress.fr/demo
     │
     ▼
Page /demo → Confirmation immédiate :
  • H1 reprend les termes de la recommandation IA
  • Démo live en 30 secondes (preuve de valeur)
  • FAQ qui répond aux sous-questions de l'IA
     │
     ▼
CTA → "Commencer gratuitement" → Inscription → Conversion
```

---

## 5. Implémentation technique proposée

### Ce que je peux développer maintenant :

1. **Page `/demo` complète** avec :
   - Header harmonisé (identique aux autres pages publiques)
   - Zone de démo interactive avec fichier audio pré-chargé
   - Transcription animée mot par mot (simulation réaliste)
   - Section « Comment ça marche » en 3 étapes
   - Section « Cas d'usage » par profil
   - FAQ structurée avec balisage Schema.org
   - CTA de conversion vers `/login`

2. **Balisage Schema.org** (JSON-LD) :
   - `SoftwareApplication` avec prix, catégorie, note
   - `FAQPage` avec 6-8 questions/réponses
   - `HowTo` avec les 3 étapes du processus

3. **Optimisation technique AEO** :
   - Contenu HTML statique (pas de rendu JS-only)
   - Méta-description optimisée pour les citations IA
   - Vérification `robots.txt` pour les bots IA

4. **Mise à jour du bouton « Voir la démo »** sur la page d'accueil pour pointer vers `/demo`

### Option future (phase 2) :

- Intégration d'une **vraie transcription live** via l'API Groq/Whisper (fichier court de 30s transcrit en temps réel côté serveur)
- Widget embarquable pour des sites partenaires
- Personnalisation du parcours selon le referer (UTM AEO)

---

## 6. Références

[1] Walnut.io — Interactive Demos Conversion Rates B2B 2026 Data
[2] Navattic — Interactive Demo Best Practices
[3] SimpleTiger — Answer Engine Optimization Guide
[4] CXL — AEO Comprehensive Guide
[5] SimilarWeb AI Search — AEO for SaaS Product Pages
[6] Semrush — SaaS AI Search Optimization

---

## 7. Prochaine étape

**Confirmez-moi si vous souhaitez que j'implémente cette page `/demo`** avec la micro-sandbox (simulation de transcription animée) et le balisage AEO complet. Je peux la développer en une session avec le même design que le reste du SaaS (dark mode, palette Magenta/Cyan, animations framer-motion).
