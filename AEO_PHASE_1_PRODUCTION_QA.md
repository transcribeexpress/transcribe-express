# Vérification post-publication AEO — Phase 1

**Domaine :** `https://transcribeexpress.fr`  
**Date :** 22 août 2026

## Page d’accueil

La page d’accueil publiée charge avec le titre « Transcription audio et vidéo par IA | Transcribe Express ». Le bloc Answer-First est présent immédiatement après le hero, avec la question « Qu’est-ce que Transcribe Express ? », une réponse autonome et un passage explicatif complet. Les nouvelles formulations factuelles sont visibles dans les cartes publiques.

Les contrôles des fichiers de découverte, des balises canoniques, des graphes JSON-LD et des pages Tarifs/Démo sont poursuivis ci-dessous avant validation finale.

## Fichiers de découverte

| Ressource | Statut HTTP | Type de contenu | Résultat |
|---|---:|---|---|
| `/llms.txt` | 200 | `text/plain` | Identité, fonctionnalités, tarifs, limites et pages de référence présents |
| `/robots.txt` | 200 | `text/plain` | Crawlers de recherche/IA autorisés et routes privées exclues |
| `/sitemap.xml` | 200 | `application/xml` | Sept pages publiques canoniques présentes |

## Métadonnées et données structurées

La page d’accueil expose en production le canonical `https://transcribeexpress.fr/`, la même URL dans `og:url`, et un graphe JSON-LD contenant notamment `Organization`, `WebSite`, `SoftwareApplication`, `Offer` et `FAQPage`. Les pages Tarifs et Démo publient leurs titres spécifiques et les passages Answer-First attendus.

## Correction complémentaire

Le contrôle éditorial post-publication a permis d’identifier quelques formulations résiduelles non démontrées dans l’interface, notamment des volumes d’utilisateurs, des délais absolus et des bénéfices SEO automatiques. Elles ont été remplacées par des formulations factuelles et couvertes par les tests AEO avant une seconde publication.

## Seconde publication

La page Accueil publiée affiche désormais un CTA factuel sans volume d’utilisateurs. La page Tarifs remplace le badge de popularité, le volume mensuel non sourcé, la promesse d’inscription chronométrée et le libellé SSL impropre par des informations fonctionnelles vérifiables. Les titres de page et les blocs Answer-First restent présents après cette correction.

La page Démo publiée remplace les délais absolus, les descriptions SEO automatiques et les gains de temps non démontrés par des usages conditionnels et vérifiables. Son titre spécifique, sa réponse directe, son passage autonome et les deux modules de démonstration restent fonctionnels après la seconde publication.

La page Tarifs conserve après la seconde publication ses offres, sa FAQ et son passage Answer-First. Le badge « Pour les publications régulières », la gestion des crédits dans le compte, le traitement Stripe et le texte d’essai gratuit sont visibles sans les anciennes preuves non sourcées.

## Validation finale

| Contrôle | Accueil | Tarifs | Démo |
|---|---|---|---|
| Titre spécifique | Conforme | Conforme | Conforme |
| Canonical | `https://transcribeexpress.fr/` | `https://transcribeexpress.fr/pricing` | `https://transcribeexpress.fr/demo` |
| `og:url` aligné | Conforme | Conforme | Conforme |
| Réponse directe | Présente | Présente | Présente |
| Passage autonome | Présent | Présent | Présent |
| FAQ structurée | Présente | Présente | Présente |
| Schéma principal | `SoftwareApplication` | `Product` + `Offer` | `HowTo` + `SoftwareApplication` |
| Affirmations interdites contrôlées | Absentes | Absentes | Absentes |

Les ressources `/llms.txt`, `/robots.txt` et `/sitemap.xml` répondent toutes en HTTP 200 avec leur type de contenu attendu. Les pages Tarifs et Démo exposent leurs canoniques sans paramètre de cache et leurs graphes JSON-LD attendus. La phase 1 AEO est validée sur le domaine de production.
