export interface AnswerFirstContent {
  id: string;
  question: string;
  answer: string;
  title: string;
  paragraphs: string[];
}

export const HOME_ANSWER_FIRST: AnswerFirstContent = {
  id: "definition-transcribe-express",
  question: "Qu’est-ce que Transcribe Express ?",
  answer:
    "Transcribe Express est un SaaS français qui transforme les fichiers audio et vidéo en texte horodaté avec Whisper. L’utilisateur peut corriger le résultat dans un éditeur synchronisé, puis l’exporter en TXT, SRT ou VTT. Un essai gratuit de 30 minutes est disponible sans carte bancaire.",
  title: "Un parcours complet, de l’import au sous-titre",
  paragraphs: [
    "Le parcours commence par l’import d’un fichier audio ou vidéo. L’interface accepte les principaux formats utilisés par les créateurs, notamment MP3, WAV, M4A, OGG, FLAC, WEBM, MP4, MOV, AVI et MKV. La piste sonore est analysée avec Whisper, puis la transcription est organisée en segments horodatés. Le temps de traitement dépend de la durée, du format, de la qualité sonore et de la charge du service ; il ne constitue donc pas une promesse fixe.",
    "Une fois le texte généré, l’éditeur synchronisé permet d’écouter l’audio et de relire la transcription dans le même espace. L’utilisateur peut sélectionner un passage, corriger le texte en contexte et préparer un export adapté à son usage. TXT convient à la réutilisation éditoriale, tandis que SRT et VTT servent aux sous-titres vidéo et web. Le compte gratuit comprend 30 minutes pendant 30 jours, puis Starter fonctionne par recharges et les plans Créateur ou Agence ajoutent des volumes mensuels.",
  ],
};

export const PRICING_ANSWER_FIRST: AnswerFirstContent = {
  id: "choisir-offre-transcription",
  question: "Quel plan Transcribe Express choisir ?",
  answer:
    "Choisissez l’essai gratuit pour tester 30 minutes sans carte bancaire, Starter pour acheter des crédits ponctuels, Créateur pour disposer de 300 minutes par mois, ou Agence pour 1 500 minutes mensuelles. Les abonnés Créateur et Agence accèdent aussi à des recharges à tarif préférentiel.",
  title: "Des offres alignées sur la fréquence de transcription",
  paragraphs: [
    "L’essai gratuit permet de vérifier la transcription, l’éditeur synchronisé et les exports TXT, SRT et VTT avant tout paiement. Starter répond ensuite aux besoins irréguliers : l’utilisateur achète une recharge de 5 €, 10 €, 20 € ou 50 €, au tarif indicatif de 0,15 € par minute. Cette formule n’ajoute pas d’abonnement mensuel et convient aux projets ponctuels ou aux périodes de production variables.",
    "Créateur est proposé à 14,90 € par mois avec 300 minutes incluses, ainsi qu’en formule annuelle. Les abonnés peuvent acheter des minutes supplémentaires au tarif indicatif de 0,12 € par minute. Agence est proposé à 49,90 € par mois avec 1 500 minutes incluses et des recharges au tarif indicatif de 0,08 € par minute. Les achats et abonnements sont traités par Stripe ; les prix, volumes et conditions affichés dans le parcours de paiement au moment de la commande restent toujours la référence contractuelle.",
  ],
};

export const DEMO_ANSWER_FIRST: AnswerFirstContent = {
  id: "tester-transcription-ia",
  question: "Comment tester Transcribe Express sans inscription ?",
  answer:
    "La page Démo utilise un fichier audio français de 34 secondes fourni par Transcribe Express. Elle montre une transcription horodatée animée et permet de déclencher un appel réel au service Whisper. Aucun fichier personnel, compte utilisateur ou moyen de paiement n’est nécessaire pour ce test.",
  title: "Une preuve de fonctionnement avant la création du compte",
  paragraphs: [
    "Le premier module de la démo explique visuellement le résultat attendu : le visiteur lance la lecture d’un court extrait consacré à la création de contenu tech, puis voit les segments horodatés apparaître au rythme de l’audio. Cette séquence est déterministe afin que chacun puisse comprendre le lien entre le son, les repères temporels et le texte sans importer de donnée personnelle. Elle illustre aussi le type de navigation proposé ensuite dans l’éditeur synchronisé du compte utilisateur.",
    "Un second module envoie le même fichier public au service de transcription côté serveur et affiche le texte retourné par Whisper. Ce test réel reste isolé du parcours utilisateur : il ne crée pas de compte, ne consomme pas de crédit et n’enregistre pas une transcription personnelle dans le tableau de bord. La qualité obtenue dépend du signal audio et du vocabulaire. Après la démonstration, le visiteur peut ouvrir un compte gratuit pour essayer ses propres fichiers avec 30 minutes disponibles pendant 30 jours.",
  ],
};
