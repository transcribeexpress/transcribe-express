# Thèmes de Gestion du Compte Client — Transcribe Express

**Date :** 30 juillet 2026  
**Contexte :** SaaS de transcription audio/vidéo — plans Free / Starter / Créateur / Agence  
**Objectif :** Définir les thèmes d'une gestion de compte à la fois complète et intuitive, en adéquation avec les spécificités du produit.

---

## Principe directeur

> Un bon espace compte client répond à trois questions que l'utilisateur se pose en permanence : **Où en suis-je ?** (état de mon abonnement et de mes crédits), **Que puis-je faire ?** (actions disponibles sans friction), **Que s'est-il passé ?** (historique et traçabilité).

La gestion de compte ne doit pas être un formulaire administratif. C'est une **surface de confiance** : chaque information affichée et chaque action proposée renforce (ou érode) la relation entre l'utilisateur et le service.

---

## Thème 1 — Tableau de bord du compte (vue synthétique)

**Pourquoi :** L'utilisateur doit pouvoir saisir son état en moins de 5 secondes sans naviguer entre plusieurs pages.

**Ce que cela couvre :**

| Élément | Donnée source | Priorité |
|:--------|:-------------|:---------|
| Plan actif avec badge visuel (Free / Starter / Créateur / Agence) | `users.plan` | Critique |
| Crédits restants avec barre de progression | `users.creditsMinutes` | Critique |
| Date de renouvellement (abonnements Créateur/Agence) | `subscriptions.currentPeriodEnd` | Haute |
| Statut de l'essai gratuit avec compte à rebours | `users.trialExpiresAt` | Haute |
| Nombre de transcriptions ce mois | `transcriptions` (agrégat) | Moyenne |
| Alerte proactive si crédits < 20% | Calculé côté client | Haute |

**Principe UX :** Une seule card "Mon Plan" visible en permanence dans la sidebar ou en haut du dashboard, avec un CTA contextuel (Recharger / Upgrader / Gérer).

---

## Thème 2 — Gestion de l'abonnement

**Pourquoi :** C'est le cœur de la relation commerciale. Toute friction ici génère du churn ou des tickets support.

**Ce que cela couvre :**

| Action | Mécanisme | Priorité |
|:-------|:----------|:---------|
| Voir le plan actuel et ses avantages | `stripe.getUserPlan` | Critique |
| Upgrader vers un plan supérieur | `stripe.createCheckoutSession` → Stripe Checkout | Critique |
| Changer de cycle (mensuel ↔ annuel) | Portail Stripe | Haute |
| Annuler l'abonnement | Portail Stripe | Haute |
| Reprendre un abonnement annulé | Portail Stripe | Haute |
| Voir la date de fin et le renouvellement automatique | `subscriptions.currentPeriodEnd` | Haute |
| Downgrader (Agence → Créateur) | Portail Stripe | Moyenne |

**Principe UX :** Distinguer clairement les actions **immédiates** (upgrade → Checkout direct) des actions **déléguées** (annulation, changement de cycle → Portail Stripe). Ne jamais forcer l'utilisateur à contacter le support pour annuler.

---

## Thème 3 — Crédits et consommation (spécifique Starter)

**Pourquoi :** Le plan Starter est basé sur des recharges ponctuelles. L'utilisateur doit comprendre ce qu'il a acheté, ce qu'il a consommé, et pouvoir recharger en 1 clic.

**Ce que cela couvre :**

| Élément | Détail | Priorité |
|:--------|:-------|:---------|
| Solde de crédits en minutes | `users.creditsMinutes` | Critique |
| Équivalent en heures et en fichiers estimés | Calculé (1 min audio ≈ 1 min crédit) | Haute |
| Historique des recharges | Webhook `checkout.session.completed` | Haute |
| Boutons de recharge rapide (5€ / 10€ / 20€ / 50€) | `stripe.createCheckoutSession` | Critique |
| Alerte "crédits faibles" (< 30 min) | Notification proactive | Haute |
| Crédits expirés (essai gratuit) | `users.trialExpiresAt` | Haute |

**Principe UX :** Afficher les crédits en **minutes** (pas en euros) pour que l'utilisateur raisonne en termes d'usage, pas de coût. Proposer la recharge directement depuis la page d'upload si les crédits sont insuffisants.

---

## Thème 4 — Historique de facturation et reçus

**Pourquoi :** La transparence financière est un facteur de confiance majeur. L'utilisateur doit pouvoir retrouver ses factures sans contacter le support.

**Ce que cela couvre :**

| Élément | Source | Priorité |
|:--------|:-------|:---------|
| Liste des paiements (date, montant, statut) | Stripe API via Portail | Haute |
| Téléchargement des factures PDF | Stripe (génération automatique) | Haute |
| Statut des paiements (réussi / échoué / remboursé) | Stripe webhook | Haute |
| Méthode de paiement active (derniers 4 chiffres) | Portail Stripe | Moyenne |
| Mise à jour de la carte bancaire | Portail Stripe | Haute |

**Principe UX :** Déléguer l'intégralité de la facturation au **Portail Client Stripe** (déjà implémenté via `stripe.createPortalSession`). Ne pas recréer une interface de facturation maison — Stripe est plus fiable, conforme PCI-DSS, et maintenu automatiquement.

---

## Thème 5 — Profil et identité

**Pourquoi :** L'utilisateur doit pouvoir identifier qui est connecté et corriger ses informations si nécessaire.

**Ce que cela couvre :**

| Élément | Source | Priorité |
|:--------|:-------|:---------|
| Nom complet | Clerk (`user.fullName`) | Haute |
| Adresse email principale | Clerk (`user.primaryEmailAddress`) | Haute |
| Photo de profil / avatar | Clerk (`user.imageUrl`) | Moyenne |
| Date d'inscription | `users.createdAt` | Basse |
| Méthode de connexion (Google / GitHub / Email) | `users.loginMethod` | Basse |
| Modifier le nom | Clerk User Management | Moyenne |
| Modifier l'email | Clerk User Management | Moyenne |

**Principe UX :** Les données d'identité sont gérées par **Clerk** (source de vérité). L'interface doit afficher ces données mais déléguer les modifications à Clerk pour éviter les désynchronisations.

---

## Thème 6 — Sécurité et accès

**Pourquoi :** La sécurité du compte est une préoccupation croissante. L'utilisateur doit pouvoir agir sans passer par le support.

**Ce que cela couvre :**

| Action | Mécanisme | Priorité |
|:-------|:----------|:---------|
| Changer le mot de passe | Clerk (email envoyé) | Haute |
| Voir les sessions actives | Clerk Session Management | Haute |
| Révoquer une session distante | Clerk | Haute |
| Activer / désactiver 2FA | Clerk | Moyenne |
| Voir les connexions OAuth liées (Google, GitHub) | Clerk | Basse |
| Déconnexion de tous les appareils | Clerk `signOut({ sessionId })` | Haute |

**Principe UX :** Afficher les sessions actives avec le device, la localisation approximative et la date de dernière activité. Permettre la révocation en 1 clic.

---

## Thème 7 — Préférences et personnalisation

**Pourquoi :** Les préférences réduisent la friction à l'usage quotidien et augmentent la rétention.

**Ce que cela couvre :**

| Préférence | Détail | Priorité |
|:-----------|:-------|:---------|
| Langue de l'interface (FR / EN) | `localStorage` ou BDD | Haute |
| Langue de transcription par défaut | `users` table (nouveau champ) | Haute |
| Format d'export par défaut (TXT / SRT / VTT) | `localStorage` ou BDD | Moyenne |
| Notifications email (transcription terminée, crédits faibles) | `users` table | Haute |
| Thème visuel (dark / light) | `localStorage` | Basse |

**Principe UX :** La **langue de transcription par défaut** est une préférence critique pour ce SaaS — elle évite à l'utilisateur de la resélectionner à chaque upload. Elle doit être visible et modifiable facilement.

---

## Thème 8 — Données personnelles et conformité RGPD

**Pourquoi :** Obligation légale (RGPD) et facteur de confiance. L'utilisateur doit pouvoir exercer ses droits sans friction.

**Ce que cela couvre :**

| Droit | Action | Priorité |
|:------|:-------|:---------|
| Droit d'accès | Export de toutes les données (JSON/CSV) | Haute |
| Droit à l'effacement | Suppression du compte et de toutes les transcriptions | Haute |
| Droit de rectification | Modification du profil (délégué à Clerk) | Haute |
| Politique de conservation | Information claire sur la durée de stockage des fichiers | Moyenne |
| Consentement aux cookies | Bannière + préférences | Moyenne |

**Principe UX :** Le bouton "Supprimer mon compte" doit exister et fonctionner (avec confirmation). Son absence génère de la méfiance et des demandes RGPD manuelles coûteuses.

---

## Thème 9 — Notifications et alertes

**Pourquoi :** Les notifications proactives réduisent l'anxiété de l'utilisateur et préviennent les mauvaises surprises (crédits épuisés, paiement échoué).

**Ce que cela couvre :**

| Notification | Déclencheur | Canal | Priorité |
|:-------------|:-----------|:------|:---------|
| Transcription terminée | Worker → BDD status=completed | Email + In-app | Haute |
| Crédits faibles (< 30 min) | Vérification à chaque transcription | In-app banner | Haute |
| Crédits épuisés | `creditsMinutes = 0` | In-app modal | Critique |
| Paiement échoué | Webhook `invoice.payment_failed` | Email + In-app | Critique |
| Essai gratuit expirant (J-3) | Cron job | Email | Haute |
| Renouvellement imminent (J-7) | Cron job | Email | Moyenne |
| Abonnement annulé confirmé | Webhook `subscription.deleted` | Email | Haute |

**Principe UX :** Les alertes critiques (crédits épuisés, paiement échoué) doivent bloquer l'action avec un CTA immédiat, pas seulement afficher un toast.

---

## Thème 10 — Support et aide contextuelle

**Pourquoi :** Un utilisateur bloqué qui ne trouve pas d'aide abandonne ou génère un ticket support. L'aide contextuelle réduit le churn et les coûts support.

**Ce que cela couvre :**

| Élément | Détail | Priorité |
|:--------|:-------|:---------|
| FAQ intégrée (formats supportés, limites, facturation) | Page statique ou accordéon | Haute |
| Lien vers la documentation | Lien externe | Moyenne |
| Formulaire de contact / signalement de bug | Email ou formulaire | Haute |
| Chat support (optionnel) | Intercom / Crisp | Basse |
| Statut du service (uptime) | Page statuts externe | Basse |

---

## Synthèse — Matrice de priorité

| Thème | Priorité | Complexité | Impact confiance |
|:------|:---------|:-----------|:----------------|
| 1. Tableau de bord compte | **Critique** | Faible | ⭐⭐⭐⭐⭐ |
| 2. Gestion abonnement | **Critique** | Moyenne | ⭐⭐⭐⭐⭐ |
| 3. Crédits et recharges (Starter) | **Critique** | Faible | ⭐⭐⭐⭐⭐ |
| 4. Historique facturation | **Haute** | Faible (Portail Stripe) | ⭐⭐⭐⭐ |
| 5. Profil et identité | **Haute** | Faible | ⭐⭐⭐ |
| 6. Sécurité et sessions | **Haute** | Moyenne | ⭐⭐⭐⭐ |
| 7. Préférences | **Haute** | Faible | ⭐⭐⭐ |
| 8. RGPD et données | **Haute** | Moyenne | ⭐⭐⭐⭐ |
| 9. Notifications et alertes | **Haute** | Moyenne | ⭐⭐⭐⭐ |
| 10. Support et aide | **Moyenne** | Faible | ⭐⭐⭐ |

---

## Architecture recommandée — Page `/account`

Plutôt que de disperser ces thèmes sur plusieurs pages (`/profile`, `/settings`), il est recommandé de **consolider** en une seule page `/account` avec navigation par onglets :

```
/account
├── Onglet "Mon Plan"          → Thèmes 1 + 2 + 3
├── Onglet "Facturation"       → Thème 4 (Portail Stripe)
├── Onglet "Profil"            → Thème 5
├── Onglet "Sécurité"          → Thème 6
├── Onglet "Préférences"       → Thème 7
└── Onglet "Données & RGPD"    → Thème 8
```

Les **notifications** (Thème 9) sont transversales : elles apparaissent dans la sidebar et dans les pages concernées (dashboard, upload), pas dans un onglet dédié.

Le **support** (Thème 10) est accessible via un lien permanent dans le footer ou la sidebar.

---

## Ce qui existe déjà vs ce qui manque

| Thème | État actuel | Gap identifié |
|:------|:-----------|:--------------|
| 1. Tableau de bord | ❌ Absent | À créer — card "Mon Plan" dans sidebar |
| 2. Abonnement | ⚠️ Partiel | Portail Stripe disponible, pas de page dédiée |
| 3. Crédits Starter | ⚠️ Partiel | Recharges disponibles dans Pricing, pas dans le compte |
| 4. Facturation | ⚠️ Partiel | Portail Stripe disponible, pas de lien direct depuis le compte |
| 5. Profil | ✅ Basique | Affichage seul, pas de modification |
| 6. Sécurité | ⚠️ Partiel | Déconnexion disponible, pas de gestion sessions |
| 7. Préférences | ⚠️ Partiel | Langue UI et thème, pas de langue transcription par défaut |
| 8. RGPD | ❌ Absent | Suppression compte non implémentée |
| 9. Notifications | ⚠️ Partiel | Toasts uniquement, pas d'alertes proactives |
| 10. Support | ❌ Absent | Aucune aide contextuelle |
