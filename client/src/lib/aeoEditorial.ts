export interface EditorialSource {
  id: string;
  publisher: string;
  title: string;
  url: string;
}

export interface EditorialFaqItem {
  id: string;
  group: "Comprendre" | "Qualité" | "YouTube & formats" | "Service" | "Confidentialité & accessibilité";
  question: string;
  answer: string;
  sourceIds: string[];
  relatedLink?: {
    href: string;
    label: string;
  };
}

export const EDITORIAL_SOURCES: EditorialSource[] = [
  {
    id: "openai-whisper",
    publisher: "OpenAI / ICML",
    title: "Robust Speech Recognition via Large-Scale Weak Supervision",
    url: "https://cdn.openai.com/papers/whisper.pdf",
  },
  {
    id: "youtube-formats",
    publisher: "YouTube Help",
    title: "Fichiers de sous-titres compatibles",
    url: "https://support.google.com/youtube/answer/2734698?hl=fr",
  },
  {
    id: "youtube-auto",
    publisher: "YouTube Help",
    title: "Utiliser les sous-titres automatiques",
    url: "https://support.google.com/youtube/answer/6373554?hl=fr",
  },
  {
    id: "youtube-edit",
    publisher: "YouTube Help",
    title: "Modifier ou supprimer des sous-titres",
    url: "https://support.google.com/youtube/answer/2734705?hl=fr",
  },
  {
    id: "w3c-transcripts",
    publisher: "W3C Web Accessibility Initiative",
    title: "Transcripts — Making Audio and Video Media Accessible",
    url: "https://www.w3.org/WAI/media/av/transcripts/",
  },
  {
    id: "w3c-webvtt",
    publisher: "W3C",
    title: "WebVTT: The Web Video Text Tracks Format",
    url: "https://www.w3.org/TR/webvtt1/",
  },
  {
    id: "cnil-processor",
    publisher: "CNIL",
    title: "Travailler avec un sous-traitant",
    url: "https://www.cnil.fr/fr/sous-traitant",
  },
  {
    id: "rgpd",
    publisher: "EUR-Lex",
    title: "Règlement (UE) 2016/679 — RGPD",
    url: "https://eur-lex.europa.eu/eli/reg/2016/679/oj?locale=fr",
  },
  {
    id: "product-home",
    publisher: "Transcribe Express",
    title: "Fonctionnement et formats pris en charge",
    url: "https://transcribeexpress.fr/",
  },
  {
    id: "product-pricing",
    publisher: "Transcribe Express",
    title: "Tarifs et crédits de transcription",
    url: "https://transcribeexpress.fr/pricing",
  },
  {
    id: "product-privacy",
    publisher: "Transcribe Express",
    title: "Politique de confidentialité",
    url: "https://transcribeexpress.fr/privacy",
  },
];

export const AEO_EDITORIAL_FAQS: EditorialFaqItem[] = [
  {
    id: "definition-transcription-automatique",
    group: "Comprendre",
    question: "Qu’est-ce que la transcription audio automatique ?",
    answer:
      "La transcription audio automatique transforme la parole enregistrée en texte à l’aide d’un système de reconnaissance vocale. Le résultat peut inclure des segments horodatés qui relient chaque passage au moment correspondant dans l’audio. Comme tout système automatique, il doit être relu lorsque l’exactitude éditoriale ou juridique est importante.",
    sourceIds: ["openai-whisper"],
  },
  {
    id: "audio-vers-texte",
    group: "Comprendre",
    question: "Comment transformer un fichier audio en texte ?",
    answer:
      "Importez un fichier compatible, choisissez la langue si nécessaire, puis lancez la transcription. Transcribe Express analyse la piste sonore avec Whisper, produit un texte segmenté et ouvre le résultat dans un éditeur synchronisé. Vous pouvez ensuite corriger le contenu et l’exporter en TXT, SRT ou VTT.",
    sourceIds: ["product-home"],
    relatedLink: { href: "/demo", label: "Voir le parcours dans la démo" },
  },
  {
    id: "transcrire-video",
    group: "Comprendre",
    question: "Peut-on transcrire une vidéo comme un fichier audio ?",
    answer:
      "Oui. Transcribe Express accepte des formats vidéo courants et traite leur piste sonore pour produire la transcription. L’image n’est pas décrite automatiquement : pour une transcription descriptive accessible, il faut ajouter séparément les informations visuelles importantes.",
    sourceIds: ["product-home", "w3c-transcripts"],
  },
  {
    id: "whisper-fonctionnement",
    group: "Comprendre",
    question: "Comment fonctionne Whisper pour la transcription ?",
    answer:
      "Whisper est un modèle Transformer encodeur-décodeur entraîné sur 680 000 heures d’audio multilingue et multitâche selon son article fondateur. L’audio y est traité par segments et le modèle prédit le texte, la langue et, selon la tâche, des repères temporels. Ce chiffre décrit son corpus d’entraînement, pas une précision garantie pour chaque fichier.",
    sourceIds: ["openai-whisper"],
  },
  {
    id: "langues-whisper",
    group: "Comprendre",
    question: "Whisper est-il un modèle multilingue ?",
    answer:
      "Oui. L’article de Whisper indique que 117 000 heures de son corpus couvrent 96 langues autres que l’anglais, auxquelles s’ajoutent des données de traduction vers l’anglais. Les performances ne sont toutefois pas uniformes : elles varient selon la langue, le corpus et la qualité de l’enregistrement.",
    sourceIds: ["openai-whisper"],
  },
  {
    id: "precision-transcription",
    group: "Qualité",
    question: "La transcription automatique est-elle toujours exacte ?",
    answer:
      "Non. La qualité dépend notamment de la netteté du signal, des accents, du débit, des bruits de fond, des chevauchements de voix et du vocabulaire spécialisé. YouTube formule la même réserve pour ses propres sous-titres automatiques et recommande une vérification humaine avant publication.",
    sourceIds: ["youtube-auto", "openai-whisper"],
  },
  {
    id: "wer-definition",
    group: "Qualité",
    question: "Qu’est-ce que le Word Error Rate ou WER ?",
    answer:
      "Le Word Error Rate mesure les substitutions, suppressions et insertions entre une transcription produite et un texte de référence. Il sert à comparer des systèmes sur un protocole défini, mais il pénalise aussi certaines différences de forme sans incidence sur le sens. Il ne doit donc pas être confondu avec une promesse de précision individuelle.",
    sourceIds: ["openai-whisper"],
  },
  {
    id: "ameliorer-qualite-audio",
    group: "Qualité",
    question: "Comment améliorer la qualité d’une transcription ?",
    answer:
      "Utilisez un micro proche de la voix, limitez l’écho et les bruits constants, évitez que plusieurs personnes parlent simultanément et fournissez un fichier non dégradé. Pour les noms propres, acronymes et termes techniques, prévoyez une relecture ciblée dans l’éditeur synchronisé.",
    sourceIds: ["youtube-auto"],
  },
  {
    id: "relecture-humaine",
    group: "Qualité",
    question: "Pourquoi relire une transcription générée par IA ?",
    answer:
      "La relecture permet de corriger les noms propres, les termes rares, la ponctuation et les passages couverts par du bruit ou des voix simultanées. Elle est particulièrement importante avant la publication de sous-titres, la diffusion d’une citation ou l’utilisation du texte dans un contexte professionnel.",
    sourceIds: ["youtube-auto", "youtube-edit"],
  },
  {
    id: "horodatage",
    group: "Qualité",
    question: "À quoi servent les segments horodatés ?",
    answer:
      "Les segments horodatés associent une portion de texte à une plage temporelle de l’audio ou de la vidéo. Ils facilitent la navigation pendant la correction et constituent la base des fichiers de sous-titres comme SRT et WebVTT. Le minutage doit être vérifié avant publication.",
    sourceIds: ["youtube-formats", "w3c-webvtt"],
  },
  {
    id: "sous-titres-youtube",
    group: "YouTube & formats",
    question: "Comment créer des sous-titres pour une vidéo YouTube ?",
    answer:
      "Transcrivez la piste sonore, relisez le texte avec l’audio, puis exportez un fichier SRT ou VTT. YouTube accepte plusieurs formats de sous-titres et permet ensuite de modifier le texte et les codes temporels dans YouTube Studio. Vérifiez toujours le résultat avant publication.",
    sourceIds: ["youtube-formats", "youtube-edit"],
    relatedLink: { href: "/demo", label: "Tester le fonctionnement sans inscription" },
  },
  {
    id: "srt-ou-vtt",
    group: "YouTube & formats",
    question: "Quelle est la différence entre SRT et WebVTT ?",
    answer:
      "SRT est un format texte simple et très répandu pour les sous-titres. WebVTT est une spécification du W3C conçue pour les pistes textuelles du web ; elle peut aussi porter des chapitres, des métadonnées synchronisées et des indications de positionnement. Le choix dépend du lecteur ou de la plateforme cible.",
    sourceIds: ["youtube-formats", "w3c-webvtt"],
  },
  {
    id: "modifier-sous-titres-youtube",
    group: "YouTube & formats",
    question: "Peut-on corriger un fichier de sous-titres dans YouTube Studio ?",
    answer:
      "Oui. La documentation YouTube indique que le texte et les codes temporels peuvent être modifiés dans YouTube Studio. Il reste préférable de corriger d’abord la transcription dans un éditeur synchronisé afin de comparer chaque phrase avec l’audio source.",
    sourceIds: ["youtube-edit"],
  },
  {
    id: "formats-entree-sortie",
    group: "YouTube & formats",
    question: "Quels formats Transcribe Express accepte-t-il et exporte-t-il ?",
    answer:
      "Le service accepte notamment MP3, WAV, M4A, OGG, FLAC, WEBM, MP4, MOV, AVI et MKV. Les exports disponibles sont TXT, SRT et VTT. Le format DOCX n’est pas proposé. La compatibilité du fichier exporté doit être vérifiée avec l’outil de publication cible.",
    sourceIds: ["product-home"],
  },
  {
    id: "transcription-ou-sous-titres",
    group: "YouTube & formats",
    question: "Quelle différence entre une transcription et des sous-titres ?",
    answer:
      "Une transcription restitue le contenu audio sous forme de texte continu ou structuré. Des sous-titres ajoutent des découpages et des repères temporels adaptés à l’affichage pendant la vidéo. Une transcription peut servir de base aux sous-titres, mais le découpage et le minutage doivent être contrôlés.",
    sourceIds: ["w3c-transcripts", "youtube-formats"],
  },
  {
    id: "essai-gratuit",
    group: "Service",
    question: "Peut-on tester la transcription gratuitement ?",
    answer:
      "Oui. Transcribe Express propose 30 minutes de transcription utilisables pendant 30 jours, sans carte bancaire. La démo publique permet aussi d’observer le fonctionnement sur un fichier fourni par le service sans créer de compte.",
    sourceIds: ["product-pricing"],
    relatedLink: { href: "/pricing", label: "Comparer les offres" },
  },
  {
    id: "tarif-transcription",
    group: "Service",
    question: "Combien coûte la transcription avec Transcribe Express ?",
    answer:
      "Starter fonctionne par recharges au tarif indicatif de 0,15 € par minute. Créateur inclut 300 minutes par mois et Agence 1 500 minutes par mois, avec des tarifs préférentiels pour les recharges. Les prix et conditions affichés sur la page Tarifs et dans Stripe au moment de la commande font référence.",
    sourceIds: ["product-pricing"],
    relatedLink: { href: "/pricing", label: "Voir les tarifs à jour" },
  },
  {
    id: "confidentialite-fichiers",
    group: "Confidentialité & accessibilité",
    question: "Comment les fichiers et transcriptions sont-ils traités ?",
    answer:
      "Les fichiers sont traités pour fournir la transcription et les résultats restent liés au compte selon les durées précisées dans la politique de confidentialité. Le RGPD impose notamment la minimisation, la limitation de conservation et des mesures de sécurité adaptées. Les durées applicables au service sont décrites sur la page Confidentialité.",
    sourceIds: ["rgpd", "product-privacy"],
    relatedLink: { href: "/privacy", label: "Consulter la politique de confidentialité" },
  },
  {
    id: "suppression-donnees",
    group: "Confidentialité & accessibilité",
    question: "Peut-on supprimer ses données et son compte ?",
    answer:
      "Oui. L’espace client permet de supprimer un compte selon une procédure de confirmation renforcée. La politique de confidentialité décrit également les droits d’accès, de rectification, d’effacement, de limitation et de portabilité ainsi que le canal de contact dédié aux demandes RGPD.",
    sourceIds: ["rgpd", "product-privacy"],
    relatedLink: { href: "/privacy", label: "Lire les droits et durées applicables" },
  },
  {
    id: "accessibilite-transcription",
    group: "Confidentialité & accessibilité",
    question: "Une transcription rend-elle automatiquement une vidéo accessible ?",
    answer:
      "Non. Le W3C distingue la transcription, les sous-titres synchronisés, l’audiodescription et la transcription descriptive. Pour une vidéo, une transcription simple peut être utile mais ne remplace pas nécessairement les sous-titres ni la description des informations visuelles importantes. La conformité dépend du contenu et de son intégration.",
    sourceIds: ["w3c-transcripts"],
  },
];

export const EDITORIAL_GROUPS = [
  "Comprendre",
  "Qualité",
  "YouTube & formats",
  "Service",
  "Confidentialité & accessibilité",
] as const;

export function getEditorialSource(id: string) {
  return EDITORIAL_SOURCES.find((source) => source.id === id);
}
