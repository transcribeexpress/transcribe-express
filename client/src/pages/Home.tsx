import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "wouter";
import {
  Zap,
  Lock,
  Download,
  Clock,
  FileAudio,
  PenLine,
  Music2,
  MousePointerClick,
  Highlighter,
  AlertTriangle,
  Search,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

// ─── Données structurées JSON-LD (FAQPage) pour AEO/SEO ─────────────────────
// Injectées dynamiquement dans le <head> pour les moteurs de réponse IA
// (Google SGE, Perplexity, ChatGPT Search, Bing Copilot)
const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Combien de temps faut-il pour transcrire un fichier audio avec Transcribe Express ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Transcribe Express transcrit vos fichiers audio et vidéo en quelques secondes grâce à une technologie d'intelligence artificielle de pointe. Un enregistrement d'une heure est généralement traité en moins de 2 minutes, soit jusqu'à 30 fois plus vite qu'une transcription manuelle.",
      },
    },
    {
      "@type": "Question",
      name: "Qu'est-ce que l'éditeur synchronisé de Transcribe Express ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "L'éditeur synchronisé de Transcribe Express est un environnement d'édition professionnel intégré directement dans le navigateur. Il permet de lire l'audio en synchronisation avec le texte transcrit, de cliquer sur n'importe quelle phrase pour positionner la lecture au bon endroit (Click-to-Seek), de détecter automatiquement les passages à faible confiance et de corriger les erreurs en contexte sonore. C'est une fonctionnalité exclusive absente de la plupart des outils de transcription concurrents.",
      },
    },
    {
      "@type": "Question",
      name: "Mes fichiers audio sont-ils en sécurité avec Transcribe Express ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Oui. Transcribe Express applique un chiffrement de bout en bout pour tous vos fichiers et transcriptions. Chaque compte bénéficie d'un espace isolé : vos données ne sont jamais partagées, vendues ou utilisées pour entraîner des modèles tiers. Vous restez le seul propriétaire de vos contenus.",
      },
    },
    {
      "@type": "Question",
      name: "Quels formats d'export sont disponibles pour les transcriptions ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Transcribe Express propose l'export en TXT (texte brut), SRT (sous-titres pour YouTube, Premiere Pro, DaVinci Resolve) et VTT (sous-titres web standard HTML5). Chaque format inclut les horodatages précis générés par l'IA pour une intégration directe dans vos outils de montage ou de publication.",
      },
    },
    {
      "@type": "Question",
      name: "Qu'est-ce que l'horodatage de transcription et à quoi sert-il ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "L'horodatage de transcription associe chaque segment de texte à un timestamp précis (ex : 0:42 → 0:58). Cela permet de naviguer instantanément dans l'audio depuis l'éditeur, de générer des sous-titres synchronisés et de retrouver un passage spécifique sans réécouter l'intégralité de l'enregistrement.",
      },
    },
    {
      "@type": "Question",
      name: "Quels formats audio et vidéo sont acceptés par Transcribe Express ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Transcribe Express accepte les formats MP3, WAV, M4A, MOV, MP4 et WEBM. Ces formats couvrent l'ensemble des usages courants : enregistrements de podcasts, interviews, réunions Zoom, vidéos YouTube et exports de logiciels de montage.",
      },
    },
  ],
};

// ─── Contenu détaillé des 6 modals ───────────────────────────────────────────

interface ModalContent {
  id: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  accentColor: string;
  sections: {
    question: string;
    answer: string;
    highlight?: string;
  }[];
  cta?: string;
}

const FEATURE_MODALS: ModalContent[] = [
  {
    id: "transcription-rapide",
    icon: <Zap className="w-6 h-6 text-[#BE34D5]" />,
    iconBg: "bg-[#BE34D5]/10",
    title: "Transcription Rapide",
    subtitle: "De l'audio au texte en quelques secondes",
    accentColor: "text-[#BE34D5]",
    sections: [
      {
        question: "Combien de temps faut-il pour transcrire un fichier audio ?",
        answer:
          "Un enregistrement d'une heure est traité en moins de 2 minutes — soit jusqu'à 30 fois plus vite qu'une transcription manuelle. Notre infrastructure traite votre fichier dès l'upload, sans file d'attente.",
        highlight: "30× plus rapide qu'une transcription manuelle",
      },
      {
        question: "Quelle est la précision de la transcription automatique ?",
        answer:
          "Transcribe Express utilise un modèle de reconnaissance vocale de dernière génération, entraîné sur des centaines de milliers d'heures d'audio. Le taux de précision dépasse 95 % sur un audio de bonne qualité, et l'outil signale automatiquement les passages incertains pour que vous puissiez les vérifier en priorité.",
      },
      {
        question: "La vitesse de traitement varie-t-elle selon la durée du fichier ?",
        answer:
          "Le temps de traitement est proportionnel à la durée de l'enregistrement, mais reste toujours bien inférieur à la durée réelle de l'audio. Un podcast de 45 minutes est transcrit en moins d'une minute et demie.",
      },
    ],
  },
  {
    id: "editeur-intelligent",
    icon: <PenLine className="w-6 h-6 text-[#34D5BE]" />,
    iconBg: "bg-[#34D5BE]/10",
    title: "Éditeur Intelligent",
    subtitle: "Un studio d'édition, pas un simple fichier texte",
    accentColor: "text-[#34D5BE]",
    sections: [
      {
        question: "Qu'est-ce qui différencie l'éditeur de Transcribe Express ?",
        answer:
          "La plupart des outils de transcription vous livrent un fichier texte brut. Transcribe Express intègre un éditeur professionnel directement dans le navigateur : lecture audio synchronisée, click-to-seek, détection des passages incertains, recherche/remplacement global et sauvegarde automatique.",
        highlight: "Exclusif — absent de la concurrence",
      },
      {
        question: "Puis-je corriger ma transcription en écoutant l'audio en même temps ?",
        answer:
          "Oui. Le lecteur audio synchronisé met en surbrillance le segment en cours de lecture dans l'éditeur. Vous pouvez cliquer sur n'importe quelle phrase pour positionner instantanément la lecture au bon endroit — sans jamais perdre le contexte sonore.",
      },
      {
        question: "Est-il possible de restaurer le texte original après modification ?",
        answer:
          "Absolument. Toutes vos modifications sont sauvegardées automatiquement, et vous pouvez à tout moment restaurer le texte original généré par l'IA en un seul clic — sans risque de perdre votre travail.",
      },
    ],
    cta: "Découvrir toutes les fonctionnalités de l'éditeur",
  },
  {
    id: "securise",
    icon: <Lock className="w-6 h-6 text-[#BE34D5]" />,
    iconBg: "bg-[#BE34D5]/10",
    title: "Sécurisé",
    subtitle: "Vos données vous appartiennent, point final",
    accentColor: "text-[#BE34D5]",
    sections: [
      {
        question: "Comment mes fichiers sont-ils protégés ?",
        answer:
          "Chaque fichier uploadé est chiffré en transit et au repos. Votre espace de stockage est strictement isolé : aucun autre utilisateur, aucun tiers, aucun algorithme d'entraînement n'a accès à vos contenus.",
        highlight: "Chiffrement de bout en bout — accès strictement personnel",
      },
      {
        question: "Mes transcriptions sont-elles utilisées pour entraîner des modèles IA ?",
        answer:
          "Non. Vos transcriptions et vos fichiers audio ne sont jamais utilisés pour entraîner des modèles d'intelligence artificielle, ni partagés avec des partenaires tiers. Vous restez le seul propriétaire de vos contenus.",
      },
      {
        question: "Pendant combien de temps mes fichiers sont-ils conservés ?",
        answer:
          "Vos fichiers et transcriptions sont conservés tant que votre compte est actif. Vous pouvez supprimer un fichier à tout moment depuis votre tableau de bord, avec effet immédiat et définitif.",
      },
    ],
  },
  {
    id: "export-flexible",
    icon: <Download className="w-6 h-6 text-[#34D5BE]" />,
    iconBg: "bg-[#34D5BE]/10",
    title: "Export Flexible",
    subtitle: "Le bon format pour chaque usage",
    accentColor: "text-[#34D5BE]",
    sections: [
      {
        question: "Quels formats d'export sont disponibles ?",
        answer:
          "Transcribe Express propose trois formats : TXT (texte brut, idéal pour les articles et notes), SRT (sous-titres pour YouTube, Premiere Pro, DaVinci Resolve) et VTT (sous-titres web standard HTML5). Chaque export inclut les horodatages précis.",
        highlight: "TXT · SRT · VTT — avec horodatages inclus",
      },
      {
        question: "Le format SRT est-il compatible avec YouTube et les logiciels de montage ?",
        answer:
          "Oui. Le fichier SRT exporté par Transcribe Express est directement importable dans YouTube Studio, Adobe Premiere Pro, DaVinci Resolve, Final Cut Pro et la plupart des plateformes de diffusion vidéo. Les timecodes sont générés automatiquement par l'IA.",
      },
      {
        question: "Puis-je exporter une transcription modifiée ou seulement l'original ?",
        answer:
          "Vous pouvez exporter la version modifiée de votre transcription (après corrections dans l'éditeur) ou la version originale générée par l'IA. Le choix vous appartient à chaque export.",
      },
    ],
  },
  {
    id: "horodatage-precis",
    icon: <Clock className="w-6 h-6 text-[#BE34D5]" />,
    iconBg: "bg-[#BE34D5]/10",
    title: "Horodatage Précis",
    subtitle: "Naviguez dans l'audio à la seconde près",
    accentColor: "text-[#BE34D5]",
    sections: [
      {
        question: "Qu'est-ce que l'horodatage de transcription ?",
        answer:
          "Chaque segment de texte est associé à un timestamp précis (ex : 0:42 → 0:58). Cela vous permet de naviguer instantanément dans l'audio depuis l'éditeur, de générer des sous-titres synchronisés et de retrouver un passage spécifique sans réécouter l'intégralité de l'enregistrement.",
        highlight: "Précision à la seconde — navigation instantanée",
      },
      {
        question: "Les horodatages sont-ils conservés dans les exports ?",
        answer:
          "Oui. Les formats SRT et VTT intègrent nativement les horodatages dans leur structure. Le format TXT peut également inclure les timestamps en option pour faciliter la relecture et la révision.",
      },
      {
        question: "L'horodatage fonctionne-t-il même après modification du texte ?",
        answer:
          "Les timestamps sont attachés aux segments audio, pas au texte. Vous pouvez donc corriger librement le contenu textuel sans affecter la synchronisation temporelle — l'éditeur maintient la correspondance entre le texte et l'audio.",
      },
    ],
  },
  {
    id: "formats-multiples",
    icon: <FileAudio className="w-6 h-6 text-[#34D5BE]" />,
    iconBg: "bg-[#34D5BE]/10",
    title: "Formats Multiples",
    subtitle: "Votre fichier, tel quel — sans conversion préalable",
    accentColor: "text-[#34D5BE]",
    sections: [
      {
        question: "Quels formats audio et vidéo sont acceptés ?",
        answer:
          "Transcribe Express accepte MP3, WAV, M4A, MOV, MP4 et WEBM — les formats les plus courants pour les podcasts, interviews, réunions en ligne, vidéos YouTube et exports de logiciels de montage.",
        highlight: "MP3 · WAV · M4A · MOV · MP4 · WEBM",
      },
      {
        question: "Dois-je convertir mon fichier avant de l'uploader ?",
        answer:
          "Non. Transcribe Express accepte directement vos fichiers dans leur format natif. Aucune conversion préalable n'est nécessaire — uploadez votre fichier tel quel et la transcription démarre immédiatement.",
      },
      {
        question: "Y a-t-il une limite de taille pour les fichiers uploadés ?",
        answer:
          "La taille maximale par fichier est de 16 Mo, ce qui correspond à environ 1h30 d'audio en MP3 standard (128 kbps). Pour des enregistrements plus longs, nous recommandons de compresser le fichier ou de le découper en segments.",
      },
    ],
  },
];

export default function Home() {
  const [openModal, setOpenModal] = useState<string | null>(null);

  const activeModal = FEATURE_MODALS.find((m) => m.id === openModal) ?? null;

  return (
    <>
      {/* ── Données structurées JSON-LD pour AEO/SEO ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />

      <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
        {/* Header */}
        <header className="container py-6">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310419663028820418/oRqyQWHwreNEuW2rCuPNoU/neon_symbol_transparent_9075d38e.png"
                alt="Transcribe Express Logo"
                className="w-8 h-8 sm:w-10 sm:h-10 object-contain flex-shrink-0"
                style={{ mixBlendMode: "screen" }}
              />
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310419663028820418/oRqyQWHwreNEuW2rCuPNoU/wordmark-transparent_d2755219.webp"
                alt="Transcribe Express"
                className="h-10 sm:h-12 md:h-14 w-auto max-w-[140px] sm:max-w-[180px] md:max-w-[220px] object-contain"
              />
            </div>
            <Link href="/login">
              <Button variant="outline">Se connecter</Button>
            </Link>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="container py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              Transcription Audio/Vidéo{" "}
              <span className="bg-gradient-to-r from-[#BE34D5] to-[#34D5BE] bg-clip-text text-transparent">
                par IA
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Convertissez vos fichiers audio et vidéo en texte en quelques
              secondes avec une précision exceptionnelle grâce à l'intelligence
              artificielle.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/login">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-[#BE34D5] to-[#34D5BE] hover:opacity-90 text-white"
                >
                  Commencer gratuitement
                </Button>
              </Link>
              <div>
                <Button size="lg" variant="outline">
                  Voir la démo
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Pourquoi choisir Transcribe Express ?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Une solution complète pour tous vos besoins de transcription
            </p>
            <p className="text-sm text-muted-foreground/60 mt-3 flex items-center justify-center gap-1">
              <ChevronRight className="w-3.5 h-3.5" />
              Cliquez sur une carte pour en savoir plus
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURE_MODALS.map((feature) => (
              <button
                key={feature.id}
                onClick={() => setOpenModal(feature.id)}
                className="group relative p-6 rounded-2xl border bg-card hover:shadow-lg hover:border-[#34D5BE]/30 transition-all text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`En savoir plus sur ${feature.title}`}
              >
                {/* Badge Exclusif pour l'éditeur */}
                {feature.id === "editeur-intelligent" && (
                  <div className="absolute top-4 right-4 flex items-center gap-1 bg-gradient-to-r from-[#BE34D5]/15 to-[#34D5BE]/15 border border-[#34D5BE]/30 rounded-full px-2.5 py-0.5">
                    <span className="text-[10px] font-semibold text-[#34D5BE] uppercase tracking-wide">
                      Exclusif
                    </span>
                  </div>
                )}

                <div
                  className={`w-12 h-12 rounded-xl ${feature.iconBg} flex items-center justify-center mb-4`}
                >
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.id === "transcription-rapide" &&
                    "Obtenez vos transcriptions en quelques secondes grâce à notre technologie IA avancée."}
                  {feature.id === "editeur-intelligent" &&
                    "Corrigez, naviguez et écoutez en parfaite synchronisation — un éditeur conçu spécifiquement pour la transcription."}
                  {feature.id === "securise" &&
                    "Vos données, fichiers et transcriptions sont protégés de bout en bout : chiffrement, stockage sécurisé et accès strictement personnel à tous vos outils."}
                  {feature.id === "export-flexible" &&
                    "Exportez vos transcriptions en TXT, SRT ou VTT selon vos besoins."}
                  {feature.id === "horodatage-precis" &&
                    "Chaque segment de texte est horodaté avec précision pour faciliter la navigation."}
                  {feature.id === "formats-multiples" &&
                    "Support de MP3, WAV, M4A, MOV, MP4, WEBM et plus encore."}
                </p>

                {/* Signal d'interactivité */}
                <div className="absolute bottom-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className={`text-xs font-medium ${feature.accentColor}`}>
                    En savoir plus
                  </span>
                  <ChevronRight className={`w-3.5 h-3.5 ${feature.accentColor}`} />
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── Section Éditeur Différenciant ─────────────────────────────────── */}
        <section className="container py-24">
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#BE34D5]/10 to-[#34D5BE]/10 border border-[#34D5BE]/20 rounded-full px-4 py-1.5 mb-2">
              <PenLine className="w-3.5 h-3.5 text-[#34D5BE]" />
              <span className="text-sm font-medium text-[#34D5BE]">
                Ce que nos concurrents ne font pas
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold">
              Un éditeur pensé pour{" "}
              <span className="bg-gradient-to-r from-[#BE34D5] to-[#34D5BE] bg-clip-text text-transparent">
                la précision
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              La transcription brute n'est que le début. Transcribe Express vous
              offre un environnement d'édition professionnel pour corriger,
              naviguer et valider chaque mot — directement dans le navigateur.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-16">
            <div className="flex gap-4 p-6 rounded-2xl border bg-card/50 hover:bg-card hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Music2 className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Lecture audio synchronisée</h3>
                <p className="text-sm text-muted-foreground">
                  Le segment en cours de lecture est mis en surbrillance en temps
                  réel dans l'éditeur. Suivez le texte au fil de l'audio sans
                  perdre le fil.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-6 rounded-2xl border bg-card/50 hover:bg-card hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <MousePointerClick className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Click-to-Seek</h3>
                <p className="text-sm text-muted-foreground">
                  Cliquez sur n'importe quelle phrase dans l'éditeur pour
                  positionner instantanément la lecture audio au bon endroit.
                  Idéal pour corriger une erreur en contexte.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-6 rounded-2xl border bg-card/50 hover:bg-card hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Highlighter className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Surbrillance en temps réel</h3>
                <p className="text-sm text-muted-foreground">
                  Chaque paragraphe correspond à un segment horodaté.
                  L'éditeur défile automatiquement pour garder le segment actif
                  visible à l'écran.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-6 rounded-2xl border bg-card/50 hover:bg-card hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Détection des passages incertains</h3>
                <p className="text-sm text-muted-foreground">
                  L'IA signale automatiquement les segments à faible confiance.
                  Réécoutez-les en un clic pour valider ou corriger sans chercher
                  manuellement.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-6 rounded-2xl border bg-card/50 hover:bg-card hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Search className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Recherche & Remplacement</h3>
                <p className="text-sm text-muted-foreground">
                  Corrigez un terme répété dans tout le document en une seule
                  action. Parfait pour uniformiser les noms propres ou les termes
                  techniques mal reconnus.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-6 rounded-2xl border bg-card/50 hover:bg-card hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#BE34D5]/10 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5 text-[#BE34D5]" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Sauvegarde & Restauration</h3>
                <p className="text-sm text-muted-foreground">
                  Vos modifications sont sauvegardées automatiquement. Vous pouvez
                  à tout moment restaurer le texte original généré par l'IA en un
                  seul clic.
                </p>
              </div>
            </div>
          </div>

          <div className="max-w-3xl mx-auto rounded-2xl bg-gradient-to-r from-[#BE34D5]/8 to-[#34D5BE]/8 border border-[#34D5BE]/20 p-8 text-center space-y-4">
            <blockquote className="text-lg md:text-xl font-medium text-foreground/90 italic leading-relaxed">
              "La plupart des outils de transcription vous donnent un fichier
              texte brut. Transcribe Express vous donne un studio d'édition."
            </blockquote>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              {[
                "Lecture synchronisée",
                "Click-to-Seek",
                "Défilement auto",
                "Passages incertains",
                "Recherche/Remplacement",
                "Export multi-format",
              ].map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-medium px-3 py-1 rounded-full bg-background border border-border text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="pt-2">
              <Link href="/login">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-[#BE34D5] to-[#34D5BE] hover:opacity-90 text-white"
                >
                  Essayer l'éditeur gratuitement
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container py-20">
          <div className="max-w-4xl mx-auto text-center p-12 rounded-3xl bg-gradient-to-r from-[#BE34D5]/10 to-[#34D5BE]/10 border">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Prêt à commencer ?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Rejoignez des milliers d'utilisateurs qui font confiance à
              Transcribe Express pour leurs transcriptions.
            </p>
            <Link href="/login">
              <Button
                size="lg"
                className="bg-gradient-to-r from-[#BE34D5] to-[#34D5BE] hover:opacity-90 text-white"
              >
                Commencer maintenant
              </Button>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="container py-8 border-t mt-20">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2026 Transcribe Express. Tous droits réservés.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">
                Conditions
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Confidentialité
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Contact
              </a>
            </div>
          </div>
        </footer>
      </div>

      {/* ── Modal Dialog ────────────────────────────────────────────────────── */}
      <Dialog open={!!openModal} onOpenChange={(open) => !open && setOpenModal(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {activeModal && (
            <>
              <DialogHeader className="pb-2">
                <div className="flex items-center gap-3 mb-1">
                  <div
                    className={`w-10 h-10 rounded-xl ${activeModal.iconBg} flex items-center justify-center shrink-0`}
                  >
                    {activeModal.icon}
                  </div>
                  <div>
                    <DialogTitle className="text-xl leading-tight">
                      {activeModal.title}
                    </DialogTitle>
                    <p className={`text-sm font-medium ${activeModal.accentColor} mt-0.5`}>
                      {activeModal.subtitle}
                    </p>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-5 pt-2">
                {activeModal.sections.map((section, idx) => (
                  <div key={idx} className="space-y-2">
                    {/* Question — format AEO */}
                    <h4 className="text-sm font-semibold text-foreground leading-snug">
                      {section.question}
                    </h4>

                    {/* Highlight coloré */}
                    {section.highlight && (
                      <div
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${
                          activeModal.accentColor === "text-[#34D5BE]"
                            ? "bg-[#34D5BE]/10 border-[#34D5BE]/25 text-[#34D5BE]"
                            : "bg-[#BE34D5]/10 border-[#BE34D5]/25 text-[#BE34D5]"
                        }`}
                      >
                        {section.highlight}
                      </div>
                    )}

                    {/* Réponse */}
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {section.answer}
                    </p>

                    {/* Séparateur entre sections */}
                    {idx < activeModal.sections.length - 1 && (
                      <div className="border-b border-border/50 pt-1" />
                    )}
                  </div>
                ))}

                {/* CTA optionnel */}
                {activeModal.cta && (
                  <div className="pt-2">
                    <Link href="/login">
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-[#BE34D5] to-[#34D5BE] hover:opacity-90 text-white w-full"
                        onClick={() => setOpenModal(null)}
                      >
                        {activeModal.cta}
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
