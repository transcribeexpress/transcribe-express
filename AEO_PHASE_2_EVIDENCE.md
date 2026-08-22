# Registre de preuves éditoriales AEO — Phase 2

**Date de vérification :** 22 août 2026  
**Règle de publication :** une donnée de recherche décrit une technologie, un standard ou un contexte précis ; elle ne constitue jamais une garantie de performance de Transcribe Express.

## 1. Whisper et reconnaissance vocale

L’article fondateur de Whisper décrit un modèle Transformer encodeur-décodeur entraîné sur **680 000 heures** d’audio multilingue et multitâche faiblement supervisé. Parmi ces données, **117 000 heures couvrent 96 langues autres que l’anglais** et **125 000 heures** concernent la traduction de différentes langues vers l’anglais. Les fichiers d’entraînement sont découpés en segments de **30 secondes**. Ces chiffres décrivent le corpus du modèle publié par OpenAI ; ils ne mesurent pas la précision obtenue sur un fichier utilisateur ni le service Transcribe Express.[1]

Le même article rappelle que le Word Error Rate (WER) pénalise toutes les différences entre une sortie et une transcription de référence, y compris des différences de style ou de format sans incidence sémantique. Le WER est donc utile pour comparer des systèmes sur un protocole défini, mais il ne doit pas être affiché comme une « précision garantie » pour un fichier individuel.[1]

**Formulations publiables :**

- « Whisper est un modèle de reconnaissance vocale multilingue entraîné sur 680 000 heures d’audio selon son article fondateur. »
- « La qualité d’une transcription dépend du signal audio, de la langue, des voix et du vocabulaire ; une relecture reste recommandée. »
- « Le WER mesure substitutions, suppressions et insertions par rapport à une transcription de référence, mais ne résume pas à lui seul la lisibilité ou le sens. »

**Formulations interdites :** précision supérieure à 95 %, précision humaine garantie, résultat sans erreur, robustesse garantie aux accents ou au bruit, temps fixe de transcription.

## 2. Sous-titres YouTube

YouTube accepte plusieurs familles de fichiers de sous-titres et présente SRT parmi les formats simples. Sa documentation indique que les fichiers contiennent le texte parlé et des codes temporels ; certains formats ajoutent des informations de style ou de positionnement.[2]

YouTube précise aussi que la qualité de ses sous-titres automatiques peut varier avec la prononciation, les accents, les dialectes et les bruits de fond. La plateforme recommande de vérifier et de corriger les phrases mal transcrites. YouTube Studio permet de modifier le texte ainsi que les codes temporels.[3][4]

**Formulations publiables :**

- « Un fichier SRT ou VTT exporté par Transcribe Express peut être relu puis importé dans un workflow vidéo compatible. »
- « YouTube recommande de vérifier les sous-titres automatiques ; l’éditeur synchronisé facilite cette relecture avant publication. »

## 3. Transcriptions et accessibilité

Le W3C distingue une transcription simple — version textuelle de la parole et des informations audio nécessaires à la compréhension — d’une transcription descriptive, qui ajoute les informations visuelles nécessaires. Pour un contenu audio seul préenregistré, une alternative textuelle est requise au niveau A des WCAG. Pour une vidéo avec audio, les sous-titres synchronisés répondent à un besoin distinct ; une simple transcription ne suffit donc pas à rendre automatiquement toute vidéo conforme.[5]

Le W3C recommande de structurer une transcription en paragraphes, sections, titres et liens, d’identifier les locuteurs lorsque cela est utile et d’ajouter les informations visuelles importantes absentes des sous-titres. Ces recommandations peuvent guider les créateurs, mais Transcribe Express ne revendique pas une conformité WCAG automatique pour leurs publications.[5]

## 4. SRT et WebVTT

WebVTT est une spécification W3C destinée aux pistes textuelles externes associées à l’élément HTML `track`. Elle couvre notamment les sous-titres, descriptions textuelles, chapitres et métadonnées synchronisées. WebVTT accepte des réglages de positionnement et des mécanismes de style dont le rendu dépend du lecteur.[6]

SRT reste un format textuel simple composé de séquences numérotées, de codes temporels et de texte. YouTube prend en charge SRT et WebVTT. Transcribe Express exporte ces deux formats, mais l’utilisateur doit vérifier le texte, les timecodes et la compatibilité du lecteur ou logiciel cible avant publication.[2][6]

## 5. Confidentialité et sous-traitance

Le RGPD impose notamment la minimisation des données, la limitation de leur conservation et des mesures de sécurité adaptées. La CNIL rappelle que les traitements confiés à un sous-traitant doivent être encadrés par un contrat et que les responsabilités sont réparties entre le responsable du traitement et le sous-traitant.[7][8]

La durée de conservation doit être définie selon la finalité réelle du traitement. La recommandation CNIL de six mois trouvée pour l’enregistrement d’appels sur le lieu de travail est sectorielle : elle ne doit pas être généralisée aux fichiers importés dans un SaaS de transcription. Les contenus publics de Transcribe Express doivent renvoyer vers la politique de confidentialité pour les durées effectivement appliquées au service.[7][8]

## 6. Matrice de preuve

| Affirmation | Source | Contexte obligatoire | Publication |
|---|---|---|---|
| Whisper a été entraîné sur 680 000 heures | Article OpenAI | Corpus du modèle publié, pas performance du SaaS | Autorisée |
| 117 000 heures couvrent 96 autres langues | Article OpenAI | Données d’entraînement multilingues | Autorisée |
| Segments d’entraînement de 30 secondes | Article OpenAI | Architecture du modèle | Autorisée |
| La qualité varie avec accents et bruit | YouTube + littérature ASR | Recommandation de relecture | Autorisée |
| Les transcriptions contribuent à l’accessibilité | W3C | Elles ne suffisent pas toujours seules | Autorisée |
| WebVTT sert aux pistes textuelles web synchronisées | W3C | Rendu dépendant du lecteur | Autorisée |
| « 95 % de précision » | Aucun benchmark interne | Impossible à garantir | Interdite |
| « Conforme WCAG automatiquement » | Aucune preuve | Dépend du média et de l’intégration | Interdite |
| « Conservation audio six mois selon la CNIL » | Recommandation appels au travail | Contexte non applicable par défaut au SaaS | Interdite |

## Références

[1] [Radford et al., *Robust Speech Recognition via Large-Scale Weak Supervision*, OpenAI / ICML, 2023](https://cdn.openai.com/papers/whisper.pdf)

[2] [YouTube Help, *Fichiers de sous-titres compatibles*](https://support.google.com/youtube/answer/2734698?hl=fr)

[3] [YouTube Help, *Utiliser les sous-titres automatiques*](https://support.google.com/youtube/answer/6373554?hl=fr)

[4] [YouTube Help, *Modifier ou supprimer des sous-titres*](https://support.google.com/youtube/answer/2734705?hl=fr)

[5] [W3C WAI, *Transcripts — Making Audio and Video Media Accessible*, mise à jour 2024](https://www.w3.org/WAI/media/av/transcripts/)

[6] [W3C, *WebVTT: The Web Video Text Tracks Format*, Candidate Recommendation Draft, 2026](https://www.w3.org/TR/webvtt1/)

[7] [CNIL, *Travailler avec un sous-traitant*](https://www.cnil.fr/fr/sous-traitant)

[8] [Règlement (UE) 2016/679 — RGPD, EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj?locale=fr)
