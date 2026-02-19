# Tests Manuels - Jour 21 - Validation MVP

**Date :** 18 Février 2026  
**Projet :** Transcribe Express V.2  
**Version :** 2d463d20  
**URL de test :** https://3000-iusza8oc1jdocziz5swrj-0ebcd05b.us2.manus.computer

---

## 📋 Vue d'Ensemble

Ce document liste tous les tests manuels à effectuer pour valider le MVP complet selon les critères du Jour 21 du SPRINT_2_PLAN.

**Durée estimée :** 1 heure  
**Prérequis :** Compte utilisateur connecté via Clerk (Google ou GitHub OAuth)

---

## ✅ Scénario 1 : Recherche et Filtres Combinés

### Objectif
Valider que la recherche et les filtres fonctionnent correctement, seuls et combinés.

### Étapes de test

1. **Accéder au Dashboard**
   - [ ] Se connecter via Google ou GitHub OAuth
   - [ ] Vérifier que le Dashboard s'affiche avec la liste des transcriptions
   - [ ] Vérifier la présence de la barre de recherche en haut

2. **Test de recherche simple**
   - [ ] Taper "test" dans la barre de recherche
   - [ ] Vérifier que seules les transcriptions contenant "test" s'affichent
   - [ ] Vérifier le compteur de résultats (ex: "3 résultats")
   - [ ] Effacer la recherche et vérifier que toutes les transcriptions réapparaissent

3. **Test des filtres par statut**
   - [ ] Cliquer sur le filtre "Complété"
   - [ ] Vérifier que seules les transcriptions complétées s'affichent
   - [ ] Tester les autres statuts : "En cours", "En attente", "Erreur"
   - [ ] Revenir à "Tous" et vérifier que toutes les transcriptions réapparaissent

4. **Test des filtres par date**
   - [ ] Sélectionner "Aujourd'hui" dans le filtre de date
   - [ ] Vérifier que seules les transcriptions d'aujourd'hui s'affichent
   - [ ] Tester "Cette semaine" et "Ce mois"
   - [ ] Tester le filtre "Personnalisé" avec une plage de dates

5. **Test de recherche + filtres combinés**
   - [ ] Taper "audio" dans la recherche
   - [ ] Sélectionner le statut "Complété"
   - [ ] Sélectionner "Cette semaine" pour la date
   - [ ] Vérifier que seules les transcriptions matchant TOUS les critères s'affichent
   - [ ] Vérifier que le compteur reflète le bon nombre de résultats

### Critères de succès
- ✅ La recherche est insensible à la casse
- ✅ Les filtres sont combinables (logique AND)
- ✅ Le compteur de résultats est correct
- ✅ Pas de lag lors de la saisie (debounce 300ms)
- ✅ Les résultats se mettent à jour instantanément

---

## ✅ Scénario 2 : Pagination et Tri

### Objectif
Valider que la pagination et le tri des transcriptions fonctionnent correctement.

### Étapes de test

1. **Test de pagination**
   - [ ] Vérifier que la pagination s'affiche si > 20 transcriptions
   - [ ] Cliquer sur "Page 2" et vérifier le changement de page
   - [ ] Vérifier que l'URL change (ex: ?page=2)
   - [ ] Utiliser les boutons "Précédent" et "Suivant"
   - [ ] Vérifier le compteur "Affichage 21-40 sur 50"

2. **Test de tri par date**
   - [ ] Cliquer sur l'en-tête "Date de création"
   - [ ] Vérifier que les transcriptions sont triées par date décroissante
   - [ ] Cliquer à nouveau pour inverser l'ordre (croissant)
   - [ ] Vérifier l'icône de tri (↑ ou ↓)

3. **Test de tri par nom**
   - [ ] Cliquer sur l'en-tête "Nom du fichier"
   - [ ] Vérifier le tri alphabétique A→Z
   - [ ] Cliquer à nouveau pour Z→A

4. **Test de tri par durée**
   - [ ] Cliquer sur l'en-tête "Durée"
   - [ ] Vérifier le tri par durée croissante
   - [ ] Inverser pour durée décroissante

5. **Test de tri par statut**
   - [ ] Cliquer sur l'en-tête "Statut"
   - [ ] Vérifier le tri par statut (ordre: Complété, En cours, En attente, Erreur)

6. **Test de persistance dans l'URL**
   - [ ] Trier par date décroissante, aller page 2
   - [ ] Copier l'URL (ex: ?page=2&sort=createdAt&order=desc)
   - [ ] Ouvrir l'URL dans un nouvel onglet
   - [ ] Vérifier que la page 2 avec le tri est conservée

### Critères de succès
- ✅ Pagination fonctionne (20 par page)
- ✅ Tri stable et prévisible
- ✅ État persisté dans l'URL (bookmarkable)
- ✅ Navigation au clavier possible (Tab + Enter)

---

## ✅ Scénario 3 : Upload avec Retry Automatique

### Objectif
Valider le flux d'upload complet avec gestion d'erreurs et retry automatique.

### Étapes de test

1. **Upload réussi**
   - [ ] Aller sur /upload
   - [ ] Glisser-déposer un fichier audio valide (mp3, < 16MB, < 60 min)
   - [ ] Vérifier les 4 étapes de progression :
     - Upload → Traitement → Transcription → Terminé
   - [ ] Vérifier l'estimation de temps (durée audio / 10)
   - [ ] Vérifier la redirection automatique vers /results/:id

2. **Validation de format**
   - [ ] Tenter d'uploader un fichier .txt
   - [ ] Vérifier le message d'erreur : "Format non supporté"
   - [ ] Vérifier les formats acceptés affichés

3. **Validation de taille**
   - [ ] Tenter d'uploader un fichier > 16MB
   - [ ] Vérifier le message d'erreur : "Fichier trop volumineux (max 16MB)"

4. **Validation de durée**
   - [ ] Tenter d'uploader un fichier audio > 60 minutes
   - [ ] Vérifier le message d'erreur : "Durée maximale : 60 minutes"

5. **Test de retry automatique** (simulation)
   - [ ] Observer les logs dans la console du navigateur (F12)
   - [ ] En cas d'erreur réseau temporaire, vérifier le retry automatique
   - [ ] Vérifier le backoff exponentiel : 1s, 2s, 4s
   - [ ] Vérifier le message "Tentative 2/3..." pendant le retry

### Critères de succès
- ✅ Upload fonctionne pour tous les formats supportés
- ✅ Validation de taille et durée fonctionnelle
- ✅ Retry automatique (max 3 tentatives)
- ✅ Messages d'erreur clairs et actionnables
- ✅ Estimation de temps affichée

---

## ✅ Scénario 4 : Visualisation des Analytics

### Objectif
Valider l'affichage des statistiques et graphiques dans la page Analytics.

### Étapes de test

1. **Accéder à la page Analytics**
   - [ ] Cliquer sur "Analytics" dans le menu
   - [ ] Vérifier le chargement de la page sans erreur

2. **Vérifier les 4 KPI Cards**
   - [ ] **Total transcriptions** : Vérifier le nombre affiché
   - [ ] **Durée totale** : Vérifier le format (ex: "2h 34m")
   - [ ] **Temps moyen** : Vérifier le calcul (ex: "3m 45s")
   - [ ] **Taux de succès** : Vérifier le pourcentage (ex: "95%")

3. **Graphique : Transcriptions par jour**
   - [ ] Vérifier l'affichage du graphique en ligne
   - [ ] Vérifier les 7 derniers jours affichés
   - [ ] Survoler les points pour voir les tooltips
   - [ ] Vérifier les axes (X: dates, Y: nombre)

4. **Graphique : Répartition par statut**
   - [ ] Vérifier l'affichage du graphique en donut
   - [ ] Vérifier les 4 segments : Complété, En cours, En attente, Erreur
   - [ ] Vérifier les couleurs (Vert, Bleu, Jaune, Rouge)
   - [ ] Survoler pour voir les pourcentages

5. **Export CSV**
   - [ ] Cliquer sur "Exporter CSV"
   - [ ] Vérifier le téléchargement du fichier
   - [ ] Ouvrir le CSV et vérifier :
     - En-têtes : Date, Nom, Durée, Statut
     - Données correctement formatées
     - Encodage UTF-8 (accents corrects)

### Critères de succès
- ✅ KPIs affichés correctement
- ✅ Graphiques responsive et interactifs
- ✅ Export CSV fonctionnel avec formatage correct
- ✅ Pas d'erreur de calcul dans les statistiques

---

## ✅ Scénario 5 : Animations et Transitions

### Objectif
Valider que les animations Framer Motion sont fluides et améliorent l'UX.

### Étapes de test

1. **Skeleton loaders**
   - [ ] Rafraîchir le Dashboard (F5)
   - [ ] Observer les skeleton loaders pendant le chargement
   - [ ] Vérifier la transition fluide vers le contenu réel
   - [ ] Tester sur Upload, Results, Analytics

2. **Transitions de page**
   - [ ] Naviguer de Home → Dashboard
   - [ ] Observer la transition fade-in
   - [ ] Naviguer entre toutes les pages
   - [ ] Vérifier que les transitions sont fluides (60 FPS)

3. **Toast notifications**
   - [ ] Uploader un fichier avec succès
   - [ ] Vérifier le toast vert avec icône ✓
   - [ ] Tenter une action qui échoue (ex: upload invalide)
   - [ ] Vérifier le toast rouge avec icône ✗
   - [ ] Vérifier que les toasts disparaissent après 5s

4. **Empty states**
   - [ ] Créer un compte vide (ou vider les transcriptions)
   - [ ] Aller sur Dashboard
   - [ ] Vérifier l'empty state avec illustration SVG
   - [ ] Vérifier le message "Aucune transcription"
   - [ ] Vérifier le CTA "Créer votre première transcription"

5. **Micro-interactions**
   - [ ] Survoler les boutons et observer l'effet hover
   - [ ] Cliquer sur un bouton et observer l'effet de pression
   - [ ] Observer l'animation pulse sur les badges "En cours"
   - [ ] Vérifier les animations de la barre de progression

### Critères de succès
- ✅ Animations fluides à 60 FPS
- ✅ Respect de `prefers-reduced-motion`
- ✅ Empty states avec message + CTA
- ✅ Toasts avec icônes et couleurs appropriées

---

## 📱 Tests Responsive Design

### Objectif
Valider que l'application est parfaitement utilisable sur mobile, tablet et desktop.

### 1. Mobile (< 640px)

**Tester avec Chrome DevTools (F12 → Toggle Device Toolbar → iPhone 12)**

- [ ] **Home**
  - [ ] Hero centré et lisible
  - [ ] Boutons empilés verticalement
  - [ ] Texte adapté (taille de police)

- [ ] **Dashboard**
  - [ ] Tableau responsive (scroll horizontal ou cards empilées)
  - [ ] Barre de recherche pleine largeur
  - [ ] Filtres accessibles (drawer ou accordion)
  - [ ] Pagination adaptée (< > au lieu de 1 2 3...)

- [ ] **Upload**
  - [ ] Zone de drop pleine largeur
  - [ ] Bouton "Parcourir" accessible
  - [ ] Progression visible

- [ ] **Results**
  - [ ] Cards empilées verticalement
  - [ ] Boutons de téléchargement accessibles
  - [ ] Texte de transcription lisible

- [ ] **Analytics**
  - [ ] KPI cards empilées (1 colonne)
  - [ ] Graphiques redimensionnés
  - [ ] Scroll vertical fluide

### 2. Tablet (640px - 1024px)

**Tester avec Chrome DevTools → iPad Air**

- [ ] **Dashboard**
  - [ ] Tableau avec 4-5 colonnes visibles
  - [ ] Filtres en ligne ou sidebar
  - [ ] Pagination complète visible

- [ ] **Analytics**
  - [ ] KPI cards en 2 colonnes
  - [ ] Graphiques côte à côte

### 3. Desktop (> 1024px)

**Tester en plein écran**

- [ ] **Toutes les pages**
  - [ ] Layout optimal (max-width container)
  - [ ] Espacement généreux
  - [ ] Aucun élément tronqué
  - [ ] Hover states fonctionnels

### Critères de succès
- ✅ Aucun scroll horizontal non intentionnel
- ✅ Tous les éléments cliquables/tapables (min 44x44px)
- ✅ Texte lisible sans zoom (min 16px)
- ✅ Navigation fluide sur tous les appareils

---

## 📝 Rapport de Test

### Instructions
Après avoir complété tous les tests, remplir ce tableau récapitulatif :

| Scénario | Statut | Bugs identifiés | Commentaires |
|:---------|:-------|:----------------|:-------------|
| 1. Recherche et filtres | ⬜ Pass / ⬜ Fail | | |
| 2. Pagination et tri | ⬜ Pass / ⬜ Fail | | |
| 3. Upload avec retry | ⬜ Pass / ⬜ Fail | | |
| 4. Analytics | ⬜ Pass / ⬜ Fail | | |
| 5. Animations | ⬜ Pass / ⬜ Fail | | |
| Responsive Mobile | ⬜ Pass / ⬜ Fail | | |
| Responsive Tablet | ⬜ Pass / ⬜ Fail | | |
| Responsive Desktop | ⬜ Pass / ⬜ Fail | | |

### Bugs identifiés
_(Lister tous les bugs trouvés avec leur sévérité : Critique, Majeur, Mineur)_

1. 
2. 
3. 

### Recommandations
_(Suggestions d'amélioration pour le Sprint 3)_

1. 
2. 
3. 

---

**Testeur :** _______________  
**Date de test :** _______________  
**Durée totale :** _______________  
**Verdict final :** ⬜ MVP validé / ⬜ Corrections nécessaires
