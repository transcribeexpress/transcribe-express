# QA de production — Optimisation éditoriale AEO, phase 2

**Date :** 22 août 2026  
**Domaine :** `https://transcribeexpress.fr`

## Guide éditorial

La route `/guide-transcription` est disponible sur le domaine de production. Le contenu publié comprend le hero, la réponse directe, les indicateurs documentés, les cinq catégories, les vingt réponses autonomes, les citations visibles, la méthodologie, les sources et le double CTA final.

## Métadonnées et données structurées

Le contrôle exécuté dans Chromium après rendu JavaScript retourne les valeurs suivantes :

| Contrôle | Résultat en production |
|---|---|
| `document.title` | `Guide de la transcription audio et vidéo \| Transcribe Express` |
| Canonical | `https://transcribeexpress.fr/guide-transcription` |
| Meta description | Conforme au guide en 20 réponses |
| Types JSON-LD | `Organization`, `WebSite`, `TechArticle`, `FAQPage`, `BreadcrumbList` |
| Questions dans `FAQPage` | 20 |
| Passages visibles marqués AEO | 20 |
| Liens externes de sources | 37 |

La valeur de titre générique affichée par l’extracteur au tout début du chargement est remplacée après hydratation par le titre spécifique attendu, confirmé directement par `document.title`.

## Fichiers de découverte

Les fichiers publics ont été récupérés directement depuis le domaine de production après publication.

| Fichier | Vérification |
|---|---|
| `https://transcribeexpress.fr/sitemap.xml` | Route `/guide-transcription` présente avec `lastmod` au 22 août 2026, fréquence mensuelle et priorité 0,9 |
| `https://transcribeexpress.fr/llms.txt` | Guide référencé comme ressource de 20 réponses sourcées sur Whisper, la précision, YouTube, SRT, WebVTT, la confidentialité et l’accessibilité |

## Conclusion

La phase 2 est conforme en production : le contenu visible, les sources, les métadonnées, le graphe JSON-LD et les fichiers de découverte exposent la même entité canonique et les mêmes faits vérifiables.
