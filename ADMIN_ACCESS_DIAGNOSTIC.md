# Diagnostic d’accès administrateur

**Date :** 4 septembre 2026

## Reproduction initiale

L’ouverture de `https://transcribeexpress.manus.space/admin` dans une session sans authentification a renvoyé une page blanche ne contenant que le badge d’hébergement. Aucun élément de connexion, de refus d’accès ou d’administration n’était rendu, et la console navigateur ne signalait aucune erreur JavaScript.

Ce constat indique un problème de chargement ou de routage avant le contrôle de rôle ; il ne permet pas de conclure sur le rôle administrateur de l’utilisateur. Aucune donnée n’a été modifiée pendant cette vérification.

## Diagnostic

Le domaine historique `transcribeexpress.manus.space` répond bien en HTTP 200, mais il ne fait pas partie du domaine canonique configuré pour Clerk Production. Le chargement de Clerk sur cet hôte sans session valide ne rendait pas le parcours de connexion attendu, ce qui se manifestait par une page blanche. À l’inverse, `https://transcribeexpress.fr/admin` rend le contrôle d’accès administrateur et la connexion vers `/login?redirect=/admin`.

Les contrôles agrégés de la table `users` confirment qu’une identité locale avec le rôle `admin` est active. Le problème ne résulte donc pas de la suppression du rôle administrateur ni de la désactivation de toutes les identités.

## Correction

Les domaines Manus historiques `transcribeexpress.manus.space` et `transcribex-orqyqwhw.manus.space` redirigent désormais leurs requêtes `GET` et `HEAD` avec HTTP 308 vers `https://transcribeexpress.fr`, en conservant le chemin et les paramètres. Par exemple, `/admin` devient `https://transcribeexpress.fr/admin`. Les requêtes d’écriture et les API ne sont pas redirigées. Quatre tests Vitest couvrent le domaine, le chemin, la requête et les hôtes non concernés.

La correction doit être publiée avant vérification finale dans le navigateur. Aucune donnée n’a été nettoyée ou modifiée durant ce diagnostic.
