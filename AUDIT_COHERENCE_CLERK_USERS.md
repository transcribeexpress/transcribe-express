# Audit de cohérence Clerk Production ↔ table `users` Manus

**Date :** 4 septembre 2026  
**Auteur :** Manus AI  
**Périmètre :** création, mise à jour, désactivation et rapprochement des identités, sans lecture ni exposition du contenu utilisateur.

## Conclusion

Les deux comptes actuellement présents dans Clerk Production possèdent tous les deux une ligne correspondante dans la base Manus. **Aucun compte Clerk Production ne manque dans la base.** L’écart de volume provient de lignes historiques, de fixtures de test et de cinq références Clerk qui n’existent plus dans l’instance Production actuelle.

| Mesure anonymisée | Résultat |
|---|---:|
| Lignes totales dans `users` | 9 |
| Comptes visibles dans Clerk Production | 2 |
| Comptes Clerk Production absents de la base | 0 |
| Lignes de forme Clerk dans la base | 7 |
| Identités Clerk encore actives en Production | 2 |
| Identités Clerk absentes de Production | 5 |
| Fixture de test | 1 |
| Identité historique non-Clerk | 1 |

Les cinq identités Clerk absentes ne possèdent, d’après les contrôles agrégés, ni transcription, ni souscription, ni historique de recharge. La ligne historique non-Clerk possède une relation de souscription ; elle ne doit donc pas être supprimée sur la seule base d’une comparaison avec Clerk.

## Cause de l’écart

La table `users` n’était pas un miroir événementiel de Clerk. Le pont `/api/clerk/sync` créait ou mettait à jour une ligne seulement lorsqu’un utilisateur connecté visitait une page utilisant le hook de synchronisation. Une suppression réalisée directement dans Clerk ne déclenchait aucune désactivation dans la base. Les lignes provenant d’un environnement antérieur ou supprimées depuis Clerk pouvaient donc subsister.

Clerk documente les événements `user.created`, `user.updated` et `user.deleted` pour synchroniser une base applicative. Le fournisseur précise également que les webhooks sont éventuellement cohérents et que leur signature doit être vérifiée avant traitement.[1]

## Correction retenue : synchronisation sûre

L’option choisie ne supprime jamais automatiquement les données métier à la réception de `user.deleted`. Elle distingue l’identité d’accès des transcriptions, fichiers S3, abonnements, crédits et historiques.

| Événement | Traitement local |
|---|---|
| `user.created` | Création idempotente du profil d’identité et initialisation normale du compte |
| `user.updated` | Mise à jour limitée au nom, à l’email et à la méthode de connexion |
| `user.deleted` | Passage de l’identité locale à `disabled`, sans suppression BDD, S3 ou Stripe |
| Événement non abonné | Réponse explicite `ignored`, sans écriture |

Quatre colonnes non destructives ont été ajoutées à `users` : `identityProvider`, `identityStatus`, `identityLastSyncedAt` et `identityDisabledAt`. Les événements plus anciens que le dernier état enregistré sont ignorés, afin d’éviter qu’une livraison tardive réactive un compte déjà désactivé.

Le point d’authentification central refuse désormais une session dont `identityStatus` vaut `disabled`. La procédure complète de suppression de compte reste séparée et ne peut toujours être lancée que depuis le SaaS par l’utilisateur ou un administrateur autorisé.

## Renforcement complémentaire du pont de session

L’audit a détecté que l’ancien endpoint `/api/clerk/sync` acceptait un identifiant fourni par le navigateur puis interrogeait l’API Clerk, sans prouver cryptographiquement que la session appartenait à cet identifiant. Le flux a été renforcé : le navigateur transmet maintenant son jeton de session Clerk, le serveur vérifie sa signature et ses parties autorisées, puis exige que le sujet `sub` corresponde exactement à l’utilisateur demandé avant de créer la session applicative.

## Réconciliation initiale

Une réconciliation unique et non destructive a été exécutée après confirmation de l’option A. Elle a conservé les neuf lignes : deux identités Clerk ont été marquées `active`, cinq identités Clerk absentes de Production ont été marquées `disabled`, et les deux lignes non classées comme Clerk n’ont pas été modifiées.

La commande `pnpm audit:clerk` reste strictement en lecture seule. Une réconciliation exige à la fois le paramètre `--reconcile` et la confirmation explicite `ALLOW_CLERK_IDENTITY_RECONCILIATION=true`. Aucun chemin de suppression n’existe dans ce script.

## Validation

| Contrôle | Résultat |
|---|---|
| Build de production | Réussi |
| Suite Vitest complète | **388 tests réussis**, 22 tests BDD dédiés volontairement ignorés |
| Tests ciblés Clerk | **14 tests réussis** |
| Parité du schéma | 7 tables alignées ; `users` 17/17 colonnes |
| Comptes Clerk Production manquants en BDD | 0 |
| Suppressions de données pendant l’audit | 0 |

Les tests couvrent notamment : secret webhook absent, signature invalide, événement non abonné, création/mise à jour, désactivation non destructive, ordre des événements, absence de suppression métier, session sans jeton, jeton invalide et tentative d’utiliser le jeton d’un autre utilisateur.

## Mise en service restante

L’endpoint à déclarer dans Clerk Production est :

`https://transcribeexpress.fr/api/webhooks/clerk`

Seuls les événements `user.created`, `user.updated` et `user.deleted` doivent être cochés. L’endpoint Production a été créé et son secret de signature `whsec_…` est enregistré exclusivement dans la variable serveur `CLERK_WEBHOOK_SIGNING_SECRET`. Après republication, un événement signé inoffensif de type `session.created` a été accepté par l’endpoint public avec HTTP 200 et explicitement ignoré, sans écrire de donnée. Cette preuve confirme l’URL publiée, l’injection du secret et la vérification Svix.

Le test fonctionnel réel a ensuite été réalisé sur un compte de test contrôlé : deux événements `user.updated` successifs, correspondant à une modification temporaire puis à son rétablissement, apparaissent dans le journal Clerk avec l’état **Succeeded** pour l’URL publique Transcribe Express. Le contrôle agrégé postérieur confirme que la base conserve neuf lignes, avec deux identités Clerk actives, cinq identités Clerk désactivées et deux lignes historiques non classées ; aucune suppression métier n’a été produite.

## Référence

[1] [Clerk — Sync Clerk data to your app with webhooks](https://clerk.com/docs/guides/development/webhooks/syncing)
