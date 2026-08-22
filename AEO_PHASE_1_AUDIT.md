# Audit des fondations techniques AEO — Phase 1

**Date :** 22 août 2026  
**Périmètre :** pages publiques de Transcribe Express  
**Domaine canonique :** `https://transcribeexpress.fr`

## Résumé

L’audit confirme que Transcribe Express possède déjà une première base AEO sur les pages Accueil, Tarifs et Démo, notamment des FAQ et plusieurs blocs JSON-LD. Cette base reste toutefois hétérogène : les fichiers de découverte sont incomplets, les métadonnées ne sont pas gérées par route et certaines données structurées contiennent des informations non vérifiables ou obsolètes.

| Zone contrôlée | État initial | Action phase 1 |
|---|---|---|
| `llms.txt` | Absent | Créer une source synthétique et factuelle |
| `robots.txt` | Crawlers IA autorisés, routes privées non exclues | Autoriser les contenus publics et exclure les routes applicatives |
| `sitemap.xml` | Référencé mais absent | Créer le sitemap canonique des pages publiques |
| Domaine canonique | Ancien domaine Manus encore présent sur des pages juridiques | Remplacer par `transcribeexpress.fr` |
| Métadonnées par page | Titre et description globaux, pas de canonical par route | Centraliser les métadonnées SEO/AEO |
| JSON-LD | Présent mais dupliqué et parfois contradictoire | Centraliser et relier les entités par identifiants stables |
| Avis et notes | Note agrégée sans source dans le schéma Démo | Supprimer toute note non issue d’avis vérifiés |
| Offres | Tarifs présents mais propriétés Schema.org incomplètes | Publier des `Offer` et `UnitPriceSpecification` valides |
| Réponse directe | Partielle sur trois pages | Créer une réponse autonome de 30 à 60 mots par page |
| Passages autonomes | Absents | Ajouter un passage factuel de 150 à 300 mots par page prioritaire |

## Principes de correction

Les données structurées ne publieront que des informations vérifiables dans le code, les pages contractuelles ou la configuration tarifaire de production. Aucune note, aucun volume d’utilisateurs et aucune supériorité concurrentielle absolue ne seront ajoutés sans preuve publique. Les pages privées, les callbacks d’authentification et les pages de paiement seront exclus des fichiers de découverte.

## Critères d’acceptation

La phase sera considérée comme terminée lorsque `/llms.txt`, `/robots.txt` et `/sitemap.xml` seront servis avec un contenu cohérent ; que les pages Accueil, Tarifs et Démo exposeront des métadonnées canoniques et des graphes JSON-LD valides ; que les faits contradictoires auront été supprimés ; et que des tests automatisés couvriront ces exigences.
