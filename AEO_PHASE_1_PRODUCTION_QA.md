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
