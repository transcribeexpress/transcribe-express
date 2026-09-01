# Audit final de persistance et de reprise des transcriptions

**Date :** 31 août 2026  
**Auteur :** Manus AI  
**Application :** Transcribe Express  
**Méthode :** A-CDD — contexte, risques, décision d’architecture, preuves et validation

## Conclusion exécutive

> Une publication normale de Transcribe Express remplace le code et les artefacts de build, mais ne réinitialise ni la base MySQL/TiDB ni le stockage AWS S3. Les transcriptions terminées, leurs fichiers sources, les textes édités, les segments Whisper et les données de compte sont donc conservés après publication.

L’audit avait identifié trois risques techniques : un ancien test capable de supprimer globalement la table `transcriptions`, une dérive entre le schéma Drizzle et la base déployée, puis l’absence de reprise automatique d’une transcription interrompue par un redémarrage. **Ces trois risques sont corrigés.**

L’option A retenue ajoute une coordination durable en BDD. Chaque worker doit acquérir une lease atomique avant de traiter un fichier ; une lease abandonnée expire ; le traitement peut alors repartir depuis la clé S3. La finalisation du texte, du statut et des crédits est transactionnelle et protégée contre les doubles déductions.

| Domaine | Verdict | Niveau de preuve |
|---|---|---|
| Transcriptions terminées après publication | **Garanti par l’architecture** | BDD externe au build, schéma aligné, aucun reset au démarrage |
| Fichiers audio/vidéo sources | **Persistants dans S3** | `fileKey` durable enregistré avant le déclenchement du worker |
| Texte original, texte édité et segments | **Persistants en BDD** | Colonnes Drizzle déployées et fonctions d’écriture vérifiées |
| Travaux interrompus | **Récupérables** | Lease, échéance, tentatives et trois voies de relance |
| Double traitement ou double débit | **Prévenu** | Acquisition conditionnelle, verrou de ligne et marqueur `creditsDeductedAt` |
| Reprise après suppression/corruption | **À organiser** | Sauvegardes TiDB et versioning S3 encore à vérifier opérationnellement |

## Sources de vérité et effet d’une publication

| Donnée | Source durable | Référence persistée | Effet d’une publication |
|---|---|---|---|
| Compte, rôle, plan et crédits | MySQL/TiDB | Ligne `users` | Aucun effacement |
| Métadonnées de transcription | MySQL/TiDB | `id`, `userId`, `fileName`, `fileKey`, `fileUrl` | Aucun effacement |
| Texte original | MySQL/TiDB | `transcriptText` | Aucun effacement |
| Texte corrigé | MySQL/TiDB | `editedText` | Aucun effacement |
| Segments Whisper | MySQL/TiDB | `segmentsData` | Aucun effacement |
| Coordination du worker | MySQL/TiDB | lease, échéance, tentatives et marqueur de débit | Permet la reprise après redémarrage |
| Fichier audio ou vidéo | AWS S3 | Clé `transcriptions/{userId}/{timestamp}-{random}.{ext}` | Aucun effacement |
| Fichiers FFmpeg ou copies de travail | Disque temporaire de l’instance | Aucune référence durable | Peuvent disparaître ; ils sont reconstruits depuis S3 |

Le script `build` exécute la validation TypeScript/JSX, la compilation Vite et le bundle serveur. Le script `start` démarre l’application compilée. La commande de migration reste séparée. Le bootstrap Express ne contient ni `DROP`, ni `TRUNCATE`, ni migration automatique, ni suppression S3.

## Flux durable d’une transcription

La séquence nominale est désormais la suivante :

1. Le quota est vérifié avant l’upload.
2. Le média est envoyé vers S3 avec une clé non ambiguë.
3. L’existence de l’objet est vérifiée.
4. La ligne BDD est créée en `pending` avec `fileKey` et `fileUrl`.
5. Le worker acquiert atomiquement une lease et passe la ligne en `processing`.
6. Les progressions renouvellent l’échéance de la lease.
7. Les segments Whisper sont écrits en BDD.
8. Le texte, la durée, le statut final et le débit de crédits sont validés dans une transaction unique.
9. La copie locale temporaire est supprimée après l’écriture durable.

La suppression d’une transcription reste une action utilisateur authentifiée avec contrôle de propriété. L’annulation passe le statut en `cancelled` et libère la lease. La publication ne déclenche aucune de ces procédures.

## Option A — Reprise durable en BDD

| Mécanisme | Implémentation | Garantie recherchée |
|---|---|---|
| Propriétaire de lease | `workerLeaseOwner` | Identifier l’instance autorisée à écrire |
| Échéance | `workerLeaseExpiresAt` | Rendre récupérable un traitement abandonné |
| Compteur | `workerAttemptCount` | Limiter les reprises à trois tentatives |
| Acquisition | `UPDATE` conditionnel | Une seule instance peut gagner la prise en charge |
| Renouvellement | Mise à jour lors des progressions | Empêcher la reprise d’un worker encore actif |
| Finalisation | Transaction et `SELECT FOR UPDATE` | Sérialiser le résultat et le débit de crédits |
| Idempotence | `creditsDeductedAt` | Interdire un second débit lors d’un rejeu |
| Capacité locale | Trois workers maximum par instance | Éviter une reprise massive en mémoire |

TiDB documente que le mode transactionnel pessimiste applique les verrous pendant l’exécution et que `SELECT FOR UPDATE` permet de verrouiller les lignes concernées.[3] La référence SQL précise que cette clause protège les données du résultat contre les mises à jour concurrentes.[4]

### Voies de relance

La récupération ne dépend pas d’un timer en mémoire. Elle peut être déclenchée par trois voies complémentaires :

| Déclencheur | Portée | État |
|---|---|---|
| Démarrage du serveur | Tous les jobs récupérables | Implémenté et validé |
| Polling du dashboard | Jobs du compte connecté | Implémenté, limité à un scan par utilisateur toutes les trente secondes |
| Endpoint périodique signé | Tous les jobs récupérables | Activé toutes les cinq minutes UTC ; premier passage HTTP 200 réussi |

L’endpoint `/api/scheduled/transcription-recovery` refuse les utilisateurs ordinaires et n’accepte que les identités périodiques signées. Il complète le démarrage et le dashboard lorsque le SaaS ne reçoit pas de visite. La tâche de projet `GT4rsJt8WPFSoakLicq3n6` est active toutes les cinq minutes UTC ; son premier passage a renvoyé HTTP 200 et a trouvé zéro transcription à récupérer, ce qui est cohérent avec le contrôle agrégé de la base.

## Schéma et migrations

Le schéma Drizzle et la base déployée sont alignés sur les sept tables gérées. La table `transcriptions` contient désormais vingt-trois colonnes.

| Table | Colonnes Drizzle | Colonnes déployées | Écart |
|---|---:|---:|---:|
| `users` | 13 | 13 | 0 |
| `transcriptions` | 23 | 23 | 0 |
| `subscriptions` | 9 | 9 | 0 |
| `creditRechargeHistory` | 11 | 11 | 0 |
| `userPreferences` | 9 | 9 | 0 |
| `supportTickets` | 11 | 11 | 0 |
| `gdprRequests` | 8 | 8 | 0 |

La migration `0009_organic_lilandra.sql` réconcilie les colonnes historiques d’export. La migration `0010_sparkling_ultron.sql` ajoute les quatre champs de reprise et l’index de récupération. Les deux migrations utilisent des clauses `IF NOT EXISTS`. TiDB documente `CREATE TABLE IF NOT EXISTS` et l’ajout de colonne en ligne.[1] [2]

Après application de la migration `0010`, un contrôle agrégé a confirmé **sept transcriptions, toutes terminées, aucun job actif et aucune lease résiduelle**. Aucun contenu utilisateur n’a été lu et aucune ligne existante n’a été réécrite.

## Isolation des tests

Les cinq suites d’intégration BDD n’utilisent plus implicitement `DATABASE_URL`. Elles sont ignorées sauf si les trois conditions suivantes sont réunies :

| Condition | Valeur exigée |
|---|---|
| Environnement | `NODE_ENV=test` |
| Base isolée | `TEST_DATABASE_URL` définie et différente de `DATABASE_URL` |
| Consentement destructif | `ALLOW_DATABASE_TESTS=true` |

L’ancien `DELETE FROM transcriptions` global a été retiré. Les nettoyages restants sont filtrés par identifiant de fixture et ne peuvent s’exécuter que sur une BDD de test explicitement autorisée.

Une politique pure, sans connexion BDD, couvre l’acquisition d’une lease absente ou expirée, le refus d’une lease active, l’épuisement des tentatives, la libération de la lease et l’unicité du débit. Un scénario d’intégration transactionnel supplémentaire est prêt mais restera ignoré tant qu’une `TEST_DATABASE_URL` dédiée n’aura pas été fournie.

## Validation finale

| Contrôle | Résultat | Observation |
|---|---|---|
| Build de production | **Réussi** | TypeScript/JSX, Vite et bundle serveur |
| Vitest complet | **365 tests réussis** | 22 tests BDD volontairement ignorés |
| Tests ciblés de persistance/reprise | **28 tests réussis** | Aucun accès à la BDD applicative ; audit S3 contrôlé |
| Intégrations Brevo et Clerk | **7 tests réussis** | Délai réseau porté à vingt secondes |
| Audit de schéma | **Réussi** | Sept tables alignées ; `transcriptions` 23/23 |
| Redémarrage serveur | **Réussi** | Scan de reprise chargé sans erreur |
| Déclenchement périodique public | **Réussi** | Tâche active, première exécution HTTP 200, aucun job abandonné détecté |
| Propreté du diff | **Réussie** | Aucun défaut signalé par `git diff --check` |

Le premier lancement complet, limité à cinq secondes par test, a rencontré trois expirations réseau sur Brevo et Clerk. Les sept tests externes ont ensuite réussi avec un délai de vingt secondes, puis la suite complète a réussi avec ce délai. Aucun échec de persistance, de lease ou d’idempotence n’a été observé.

## Procédure recommandée avant et après publication

| Moment | Contrôle | Critère de succès |
|---|---|---|
| Avant publication | `pnpm build` | Build terminé sans erreur |
| Avant publication | Vitest séquentiel avec délai réseau adapté | Tests non BDD réussis ; suites BDD ignorées sans base dédiée |
| Avant publication | `pnpm audit:schema` | Aucun champ manquant ou non suivi |
| Avant migration | Relecture du SQL généré | Aucune suppression ou altération destructive |
| Après migration | Comptage agrégé et contrôle du schéma | Lignes préservées et colonnes attendues présentes |
| Après publication | Journaux de démarrage | Aucun échec de récupération |
| Après publication | Dashboard | Transcriptions terminées visibles ; job interrompu repris après expiration |
| Après publication | Déclenchement périodique | Endpoint appelé avec succès et journal d’exécution vérifié |

## Sauvegarde et restauration indépendantes

La persistance primaire protège contre une publication de code. Elle ne protège pas, à elle seule, contre une suppression accidentelle, une corruption ou un incident fournisseur.

TiDB Cloud Starter et Essential réalisent des sauvegardes automatiques quotidiennes. La rétention documentée est d’un jour pour Starter gratuit et configurable de un à trente jours pour Starter avec plafond de dépense ou Essential. Une restauration crée une nouvelle instance.[5] Le niveau exact de l’instance Transcribe Express doit être vérifié dans **Data > Backup**, puis une restauration non destructive vers une instance distincte doit être testée.

S3 Versioning est désactivé par défaut. Une fois activé, il conserve plusieurs versions et place un marqueur de suppression, ce qui facilite la récupération après écrasement ou suppression accidentelle.[6] AWS documente la restauration d’une version antérieure par copie afin de préserver l’historique.[7]

Un audit S3 **strictement en lecture seule** est désormais disponible via `pnpm audit:s3`. Deux tests Vitest vérifient que le script n’emploie que des commandes `Get*` de configuration et qu’il n’énumère, ne télécharge ni n’expose aucun objet utilisateur. Son exécution a confirmé que l’identité applicative n’est pas autorisée à lire la configuration du bucket (`s3:GetBucketVersioning`, `s3:GetLifecycleConfiguration` et `s3:GetBucketObjectLockConfiguration`). Cette restriction est cohérente avec le principe du moindre privilège ; elle signifie cependant que l’état réel du versioning, des règles Lifecycle et d’Object Lock reste **non vérifié** depuis l’application. Aucune modification S3 n’a été tentée et l’absence de droit de lecture ne permet pas de conclure que le versioning est désactivé.

| Action externe | Objectif | État |
|---|---|---|
| Vérifier la rétention TiDB | Connaître le point de restauration réel | À réaliser |
| Tester une restauration TiDB vers une nouvelle instance | Vérifier la procédure et le temps de reprise | À réaliser |
| Activer le versioning S3 | Restaurer un média supprimé ou écrasé | À réaliser après validation |
| Définir une règle Lifecycle | Maîtriser le coût et la durée de conservation | À définir |
| Adapter la suppression RGPD | Purger aussi les versions historiques requises | À documenter avant activation |

Le contrôle complet doit être réalisé depuis le compte AWS administrateur ou avec une identité distincte, limitée à la lecture de ces trois configurations. Les permissions d’écriture ou de suppression ne sont pas nécessaires pour l’audit.

S3 Object Lock peut empêcher la suppression ou l’écrasement d’une version pendant une durée donnée, mais il doit être évalué avec prudence au regard des obligations de suppression des données personnelles.[8] MFA Delete renforce les suppressions permanentes ; AWS précise toutefois qu’il exige le compte propriétaire et qu’il n’est pas compatible avec les configurations Lifecycle.[9]

## Limites résiduelles

En hébergement autoscale, un traitement asynchrone reste dépendant de la durée de vie de l’instance. **La lease ne rend pas l’instance permanente** : elle transforme une interruption en travail récupérable et empêche une double finalisation. Une continuité stricte 24/7 exigerait ultérieurement un worker persistant ou une file externe.

La transaction réelle d’acquisition et de finalisation n’a pas été exécutée sur les données applicatives, conformément à l’exigence de non-interférence. Le scénario est présent dans une suite isolée et devra être exécuté sur une base de test dédiée avant toute refonte future de la logique de worker.

Enfin, la planification périodique ne peut être activée et vérifiée qu’après publication de l’endpoint. Jusqu’à cette étape, la reprise repose sur le démarrage du serveur et le polling du dashboard.

## Références

[1] [TiDB — CREATE TABLE](https://docs.pingcap.com/tidb/stable/sql-statement-create-table/)

[2] [TiDB — ADD COLUMN](https://docs.pingcap.com/tidb/stable/sql-statement-add-column/)

[3] [TiDB Cloud — Transactions](https://docs.pingcap.com/tidbcloud/transaction-concepts/)

[4] [TiDB Cloud — SELECT et SELECT FOR UPDATE](https://docs.pingcap.com/tidbcloud/sql-statement-select/)

[5] [TiDB Cloud — Sauvegarder et restaurer les données Starter ou Essential](https://docs.pingcap.com/tidbcloud/backup-and-restore-serverless/)

[6] [AWS — Retaining multiple versions of objects with S3 Versioning](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html)

[7] [AWS — Restoring previous versions](https://docs.aws.amazon.com/AmazonS3/latest/userguide/RestoringPreviousVersions.html)

[8] [AWS — Locking objects with S3 Object Lock](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html)

[9] [AWS — Configuring MFA delete](https://docs.aws.amazon.com/AmazonS3/latest/userguide/MultiFactorAuthenticationDelete.html)
