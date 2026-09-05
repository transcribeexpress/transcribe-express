# Diagnostic d’accès administrateur

**Date :** 4 septembre 2026

## Reproduction initiale

L’ouverture de `https://transcribeexpress.manus.space/admin` dans une session sans authentification a renvoyé une page blanche ne contenant que le badge d’hébergement. Aucun élément de connexion, de refus d’accès ou d’administration n’était rendu, et la console navigateur ne signalait aucune erreur JavaScript.

Ce constat indique un problème de chargement ou de routage avant le contrôle de rôle ; il ne permet pas de conclure sur le rôle administrateur de l’utilisateur. Aucune donnée n’a été modifiée pendant cette vérification.

## Diagnostic

Le domaine historique `transcribeexpress.manus.space` répond bien en HTTP 200, mais il ne fait pas partie du domaine canonique configuré pour Clerk Production. Le chargement de Clerk sur cet hôte sans session valide ne rendait pas le parcours de connexion attendu, ce qui se manifestait par une page blanche. À l’inverse, `https://transcribeexpress.fr/admin` rend le contrôle d’accès administrateur et la connexion vers `/login?redirect=/admin`.

L’analyse des deux parcours vidéo a mis en évidence deux causes successives. Premièrement, le compte Google utilisé correspondait à une identité Clerk Production active, mais cette ligne ne portait pas encore le rôle `admin` ; le rôle existait seulement sur des identités historiques ou désactivées. Après confirmation explicite de l’utilisateur, une seule ligne Clerk active a été promue, sans modifier ses données métier.

Deuxièmement, le parcours complet pouvait encore échouer pendant `/api/clerk/sync`. La validation bas niveau du jeton renvoyait un refus générique et l’interface transformait l’erreur technique en simple page « Accès refusé ». Le rôle restait pourtant `admin` en base après la tentative, ce qui exclut un écrasement du rôle par l’upsert.

## Correction

Les domaines Manus historiques `transcribeexpress.manus.space` et `transcribex-orqyqwhw.manus.space` redirigent désormais leurs requêtes `GET` et `HEAD` avec HTTP 308 vers `https://transcribeexpress.fr`, en conservant le chemin et les paramètres. Par exemple, `/admin` devient `https://transcribeexpress.fr/admin`. Les requêtes d’écriture et les API ne sont pas redirigées. Quatre tests Vitest couvrent le domaine, le chemin, la requête et les hôtes non concernés.

La synchronisation de session vérifie désormais la signature et les dates du jeton Clerk, le sujet attendu et l’origine `azp` lorsqu’elle est présente. Elle accepte conformément à la documentation Clerk un jeton signé sans claim `azp`, mais refuse toute origine présente qui ne figure pas dans l’allowlist. Les refus sont journalisés par code non sensible. Le client peut demander un jeton neuf et relancer réellement la synchronisation ; la page Admin affiche une erreur dédiée avec un bouton de reprise au lieu d’un faux diagnostic de rôle.

Le build et la suite complète ont réussi : **397 tests réussis**, 23 tests d’intégration BDD volontairement ignorés sans base de test dédiée. La correction doit être publiée puis validée dans Safari avant toute purge. Aucune donnée utilisateur n’a été supprimée pendant ce diagnostic.

## Références officielles

- [Clerk — `verifyToken()`](https://clerk.com/docs/reference/backend/verify-token) : vérification de signature, dates et allowlist `authorizedParties`.
- [Clerk — Manual JWT verification](https://clerk.com/docs/guides/sessions/manual-jwt-verification) : validation du claim `azp` lorsqu’il est présent ; ce contrôle peut être omis lorsque le claim n’existe pas.
