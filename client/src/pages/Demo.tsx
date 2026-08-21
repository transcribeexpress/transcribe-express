import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  Zap,
  Upload,
  FileText,
  Download,
  Sparkles,
  Clock,
  Shield,
  Mic,
  Video,
  ChevronRight,
  CheckCircle2,
  ArrowRight,
  Headphones,
  Youtube,
  Podcast,
  Presentation,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// ─── URLs des assets ─────────────────────────────────────────────────────────
const NEON_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028820418/oRqyQWHwreNEuW2rCuPNoU/neon_symbol_transparent_9075d38e.png";
const WORDMARK = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028820418/oRqyQWHwreNEuW2rCuPNoU/wordmark-transparent_d2755219.webp";
const DEMO_AUDIO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028820418/oRqyQWHwreNEuW2rCuPNoU/demo/demo-audio-tech-interview.mp3";

// ─── Texte de la transcription (correspondant au fichier audio) ──────────────
const DEMO_TRANSCRIPT_SEGMENTS = [
  { start: 0.0, end: 1.2, text: "Salut à tous !" },
  { start: 1.2, end: 4.8, text: "Aujourd'hui on va parler d'un sujet qui me passionne :" },
  { start: 4.8, end: 8.2, text: "l'intelligence artificielle dans la création de contenu." },
  { start: 8.2, end: 13.5, text: "Vous le savez, quand on est créateur, le plus gros problème c'est le temps." },
  { start: 13.5, end: 17.8, text: "Entre le tournage, le montage et la post-production," },
  { start: 17.8, end: 20.5, text: "on passe des heures sur chaque vidéo." },
  { start: 20.5, end: 23.8, text: "Et là où ça devient vraiment intéressant," },
  { start: 23.8, end: 28.2, text: "c'est quand l'IA nous permet d'automatiser certaines tâches répétitives." },
  { start: 28.2, end: 30.5, text: "Par exemple, la transcription automatique." },
  { start: 30.5, end: 34.0, text: "Avant, il fallait tout taper à la main ou payer un prestataire." },
];

// ─── Données structurées JSON-LD ─────────────────────────────────────────────
const SCHEMA_SOFTWARE_APP = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Transcribe Express",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Web",
  description: "SaaS français de transcription audio/vidéo par intelligence artificielle. Basé sur le modèle Whisper, il offre une précision supérieure à 95% en français et traite les fichiers en quelques secondes.",
  url: "https://transcribeexpress.fr",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
    description: "30 minutes de transcription offertes — sans carte bancaire"
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "127",
    bestRating: "5"
  },
  featureList: "Transcription IA Whisper, Éditeur synchronisé, Export SRT/VTT/TXT/DOCX, Horodatage précis, RGPD conforme"
};

const SCHEMA_HOWTO = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Comment transcrire un fichier audio avec Transcribe Express",
  description: "Transcrivez vos fichiers audio et vidéo en texte en 3 étapes simples avec Transcribe Express.",
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Importez votre fichier",
      text: "Glissez-déposez votre fichier audio ou vidéo (MP3, WAV, MP4, MOV, M4A, OGG, WEBM) dans l'interface. Aucune limite de durée.",
      url: "https://transcribeexpress.fr/demo#etape-1"
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "L'IA transcrit en quelques secondes",
      text: "Le modèle Whisper analyse votre audio et génère une transcription horodatée avec une précision supérieure à 95% en français.",
      url: "https://transcribeexpress.fr/demo#etape-2"
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Éditez et exportez",
      text: "Corrigez le texte dans l'éditeur synchronisé, puis exportez en SRT, VTT, TXT ou DOCX selon vos besoins.",
      url: "https://transcribeexpress.fr/demo#etape-3"
    }
  ],
  totalTime: "PT2M"
};

const SCHEMA_FAQ = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Quelle est la précision de Transcribe Express en français ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Transcribe Express utilise le modèle Whisper large-v3 via l'infrastructure Groq, offrant une précision supérieure à 95% en français. Le modèle excelle sur les accents régionaux, le vocabulaire technique et les environnements bruités."
      }
    },
    {
      "@type": "Question",
      name: "Quels formats audio et vidéo sont supportés ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Transcribe Express accepte tous les formats courants : MP3, WAV, OGG, M4A, WEBM pour l'audio, et MP4, MOV, WEBM pour la vidéo. Aucune conversion préalable n'est nécessaire."
      }
    },
    {
      "@type": "Question",
      name: "Mes données sont-elles sécurisées et conformes au RGPD ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Oui. Transcribe Express est édité par Z9E (Paris, France) et respecte intégralement le RGPD. Vos fichiers sont chiffrés, stockés en Europe, et supprimés automatiquement après traitement. Aucune donnée n'est utilisée pour entraîner des modèles tiers."
      }
    },
    {
      "@type": "Question",
      name: "Combien coûte Transcribe Express ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Transcribe Express propose un essai gratuit de 30 minutes sans carte bancaire. Les plans payants commencent à 0,20€/minute (Starter), avec des tarifs dégressifs pour les créateurs (0,12€/min) et les agences (0,08€/min). Des recharges prépayées sont disponibles."
      }
    },
    {
      "@type": "Question",
      name: "Transcribe Express est-il adapté aux YouTubeurs et créateurs de contenu ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Absolument. Transcribe Express a été conçu spécifiquement pour les créateurs de contenu français. L'éditeur synchronisé permet de naviguer dans l'audio en cliquant sur le texte, l'export SRT/VTT génère des sous-titres prêts à l'emploi pour YouTube, et le traitement ultra-rapide s'intègre dans n'importe quel workflow de post-production."
      }
    },
    {
      "@type": "Question",
      name: "Quelle est la différence entre Transcribe Express et les autres outils de transcription ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Transcribe Express se distingue par trois avantages : (1) un éditeur synchronisé exclusif qui permet de corriger le texte en écoutant l'audio au même endroit, (2) une vitesse de traitement 30x plus rapide que la transcription manuelle grâce à l'infrastructure Groq, et (3) une conformité RGPD native avec hébergement européen — contrairement aux alternatives américaines."
      }
    }
  ]
};

// ─── Composant principal ─────────────────────────────────────────────────────
export default function Demo() {
  const { isSignedIn } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [visibleSegments, setVisibleSegments] = useState<typeof DEMO_TRANSCRIPT_SEGMENTS>([]);
  const [demoStarted, setDemoStarted] = useState(false);
  const [liveTranscriptText, setLiveTranscriptText] = useState("");
  const [liveTranscribing, setLiveTranscribing] = useState(false);
  const [liveError, setLiveError] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Mutation tRPC pour la transcription live
  const liveTranscribeMutation = trpc.demo.transcribeLive.useMutation({
    onSuccess: (data) => {
      setLiveTranscriptText(data.text);
      setLiveTranscribing(false);
    },
    onError: (err) => {
      setLiveError(err.message || "Erreur lors de la transcription");
      setLiveTranscribing(false);
    },
  });

  // Gestion de la lecture audio et synchronisation des segments
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const time = audio.currentTime;
      setCurrentTime(time);
      const visible = DEMO_TRANSCRIPT_SEGMENTS.filter(s => s.start <= time);
      setVisibleSegments(visible);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setVisibleSegments(DEMO_TRANSCRIPT_SEGMENTS);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const startDemo = () => {
    setDemoStarted(true);
    setIsTranscribing(true);
    setVisibleSegments([]);
    setTimeout(() => {
      audioRef.current?.play();
      setIsPlaying(true);
      setIsTranscribing(false);
    }, 1500);
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const startLiveTranscription = () => {
    setLiveTranscribing(true);
    setLiveError("");
    setLiveTranscriptText("");
    liveTranscribeMutation.mutate({ audioUrl: DEMO_AUDIO_URL });
  };

  // Scroll auto vers le dernier segment
  useEffect(() => {
    if (transcriptRef.current && visibleSegments.length > 0) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [visibleSegments]);

  // Injection des données structurées JSON-LD
  useEffect(() => {
    const scripts = [
      { id: "schema-software", data: SCHEMA_SOFTWARE_APP },
      { id: "schema-howto", data: SCHEMA_HOWTO },
      { id: "schema-faq", data: SCHEMA_FAQ },
    ];
    scripts.forEach(({ id, data }) => {
      let el = document.getElementById(id);
      if (!el) {
        el = document.createElement("script");
        el.id = id;
        el.setAttribute("type", "application/ld+json");
        document.head.appendChild(el);
      }
      el.textContent = JSON.stringify(data);
    });
    return () => {
      scripts.forEach(({ id }) => {
        const el = document.getElementById(id);
        if (el) el.remove();
      });
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Audio element */}
      <audio ref={audioRef} src={DEMO_AUDIO_URL} preload="auto" />

      {/* Header */}
      <header className="container py-4 sm:py-6">
        <nav className="flex items-center justify-between gap-2">
          <Link href="/">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 cursor-pointer">
              <img src={NEON_LOGO} alt="Transcribe Express Logo" className="w-7 h-7 sm:w-10 sm:h-10 object-contain flex-shrink-0" />
              <img src={WORDMARK} alt="Transcribe Express" className="h-8 sm:h-12 md:h-14 w-auto max-w-[100px] sm:max-w-[180px] md:max-w-[220px] object-contain" />
            </div>
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-xs sm:text-sm px-2 sm:px-3">Accueil</Button>
            </Link>
            <Link href="/pricing">
              <Button variant="ghost" size="sm" className="text-xs sm:text-sm px-2 sm:px-3">Tarifs</Button>
            </Link>
            <Link href="/contact">
              <Button variant="ghost" size="sm" className="text-xs sm:text-sm px-2 sm:px-3">Contact</Button>
            </Link>
            {isSignedIn ? (
              <Link href="/dashboard">
                <Button variant="outline" size="sm" className="text-xs sm:text-sm px-2 sm:px-3">Mon Transcribe</Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button variant="outline" size="sm" className="text-xs sm:text-sm px-2 sm:px-3">Se connecter</Button>
              </Link>
            )}
          </div>
        </nav>
      </header>

      {/* Hero AEO */}
      <section className="container pt-8 pb-12 md:pt-12 md:pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#BE34D5]/30 bg-[#BE34D5]/5 mb-6">
            <Sparkles className="w-4 h-4 text-[#BE34D5]" />
            <span className="text-sm text-[#BE34D5] font-medium">Démo interactive — Aucune inscription requise</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            Transcription IA ultra-précise{" "}
            <span className="bg-gradient-to-r from-[#BE34D5] to-[#34D5BE] bg-clip-text text-transparent">
              en français
            </span>
          </h1>
          {/* Paragraphe AEO "Answer-First" — extractible par les moteurs IA */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Transcribe Express est un SaaS français de transcription audio/vidéo par intelligence artificielle.
            Basé sur le modèle Whisper, il offre une précision supérieure à 95% en français et traite vos fichiers
            en quelques secondes. Conforme au RGPD, conçu pour les créateurs de contenu et YouTubeurs.
          </p>
        </motion.div>
      </section>

      {/* Zone de Démo Interactive */}
      <section className="container pb-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-4xl mx-auto"
        >
          <div className="relative rounded-2xl border border-[#BE34D5]/20 bg-gradient-to-b from-[#BE34D5]/5 to-transparent p-1">
            <div className="rounded-xl bg-card/80 backdrop-blur-sm p-6 md:p-8">
              {/* En-tête de la zone démo */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#BE34D5]/10 flex items-center justify-center">
                    <Mic className="w-5 h-5 text-[#BE34D5]" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground">Fichier de démonstration</h2>
                    <p className="text-sm text-muted-foreground">Interview tech — 34 secondes — Français</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-muted-foreground">Whisper v3</span>
                </div>
              </div>

              {/* Lecteur audio visuel */}
              <div className="mb-6 p-4 rounded-lg bg-background/50 border border-border/50">
                <div className="flex items-center gap-4">
                  {!demoStarted ? (
                    <Button
                      onClick={startDemo}
                      size="lg"
                      className="bg-gradient-to-r from-[#BE34D5] to-[#34D5BE] hover:opacity-90 text-white gap-2 px-8"
                    >
                      <Play className="w-5 h-5" />
                      Lancer la transcription
                    </Button>
                  ) : (
                    <Button
                      onClick={togglePlay}
                      size="icon"
                      variant="outline"
                      className="w-12 h-12 rounded-full border-[#BE34D5]/30"
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </Button>
                  )}
                  {demoStarted && (
                    <div className="flex-1">
                      {/* Barre de progression */}
                      <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#BE34D5] to-[#34D5BE] rounded-full"
                          style={{ width: `${(currentTime / 34) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-muted-foreground">{formatTime(currentTime)}</span>
                        <span className="text-xs text-muted-foreground">0:34</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Zone de transcription en temps réel */}
              {demoStarted && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-[#34D5BE]" />
                    <span className="text-sm font-medium text-[#34D5BE]">Transcription en direct</span>
                    {isTranscribing && (
                      <div className="flex gap-1 ml-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#BE34D5] animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-[#BE34D5] animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-[#BE34D5] animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    )}
                  </div>
                  <div
                    ref={transcriptRef}
                    className="p-4 rounded-lg bg-background border border-border/50 min-h-[120px] max-h-[200px] overflow-y-auto"
                  >
                    <AnimatePresence>
                      {visibleSegments.map((segment, i) => (
                        <motion.span
                          key={i}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className={`inline ${
                            i === visibleSegments.length - 1 && isPlaying
                              ? "text-foreground font-medium"
                              : "text-muted-foreground"
                          }`}
                        >
                          <span className="text-xs text-[#BE34D5]/60 mr-1">[{formatTime(segment.start)}]</span>
                          {segment.text}{" "}
                        </motion.span>
                      ))}
                    </AnimatePresence>
                    {isPlaying && visibleSegments.length < DEMO_TRANSCRIPT_SEGMENTS.length && (
                      <span className="inline-block w-0.5 h-4 bg-[#BE34D5] animate-pulse ml-1" />
                    )}
                  </div>
                </motion.div>
              )}

              {/* CTA après la démo */}
              {demoStarted && !isPlaying && visibleSegments.length === DEMO_TRANSCRIPT_SEGMENTS.length && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-6 p-4 rounded-lg bg-gradient-to-r from-[#BE34D5]/10 to-[#34D5BE]/10 border border-[#BE34D5]/20"
                >
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-foreground">Impressionné par la précision ?</p>
                      <p className="text-sm text-muted-foreground">Essayez avec votre propre fichier — 30 minutes offertes</p>
                    </div>
                    <Link href="/login">
                      <Button className="bg-gradient-to-r from-[#BE34D5] to-[#34D5BE] hover:opacity-90 text-white gap-2">
                        Essayer gratuitement <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Section Transcription Live (Option 2 — vraie API) */}
      <section className="container pb-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              Transcription{" "}
              <span className="bg-gradient-to-r from-[#34D5BE] to-[#BE34D5] bg-clip-text text-transparent">
                en temps réel
              </span>
            </h2>
            <p className="text-muted-foreground">
              Voyez la puissance de Whisper v3 sur notre fichier de démonstration — traitement serveur réel
            </p>
          </div>
          <div className="rounded-xl border border-[#34D5BE]/20 bg-card/50 p-6 md:p-8">
            <div className="flex flex-col items-center gap-4">
              <Button
                onClick={startLiveTranscription}
                disabled={liveTranscribing}
                size="lg"
                className="bg-gradient-to-r from-[#34D5BE] to-[#BE34D5] hover:opacity-90 text-white gap-2"
              >
                {liveTranscribing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Transcription en cours...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Transcrire avec l'API Whisper
                  </>
                )}
              </Button>
              {liveTranscriptText && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full p-4 rounded-lg bg-background border border-border/50 mt-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-400">Transcription terminée</span>
                  </div>
                  <p className="text-foreground leading-relaxed">{liveTranscriptText}</p>
                </motion.div>
              )}
              {liveError && (
                <p className="text-sm text-red-400 mt-2">{liveError}</p>
              )}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Section Comment ça marche — HowTo */}
      <section id="etape-1" className="container pb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-5xl mx-auto"
        >
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              Comment ça marche
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Transcribe Express transforme vos fichiers audio et vidéo en texte précis en trois étapes simples.
              Le processus complet prend moins de 2 minutes pour une heure d'enregistrement.
            </p>
          </div>

          <div className="relative grid md:grid-cols-3 gap-6 md:gap-8">
            {/* Timeline connector line (visible on md+) */}
            <div className="hidden md:flex absolute top-[3.2rem] left-[16.67%] right-[16.67%] items-center justify-between">
              {/* Dots at each step + dashed line between */}
              <div className="w-3 h-3 rounded-full bg-[#BE34D5] z-10" />
              <div className="flex-1 h-px border-t-2 border-dashed border-[#9B34D5]/40 mx-1" />
              <div className="w-3 h-3 rounded-full bg-[#9B34D5] z-10" />
              <div className="flex-1 h-px border-t-2 border-dashed border-[#34D5BE]/40 mx-1" />
              <div className="w-3 h-3 rounded-full bg-[#34D5BE] z-10" />
            </div>
            {[
              {
                step: 1,
                icon: Upload,
                title: "Importez votre fichier",
                desc: "Glissez-déposez votre fichier audio ou vidéo. Formats supportés : MP3, WAV, MP4, MOV, M4A, OGG, WEBM. Aucune limite de durée.",
                color: "#BE34D5",
              },
              {
                step: 2,
                icon: Zap,
                title: "L'IA transcrit en secondes",
                desc: "Le modèle Whisper v3 analyse votre audio et génère une transcription horodatée avec une précision supérieure à 95% en français.",
                color: "#9B34D5",
              },
              {
                step: 3,
                icon: Download,
                title: "Éditez et exportez",
                desc: "Corrigez le texte dans l'éditeur synchronisé avec lecture audio intégrée, puis exportez en SRT, VTT ou TXT.",
                color: "#34D5BE",
              },
            ].map((item) => (
              <div key={item.step} className="relative group">
                <div className="p-6 rounded-xl border border-border/50 bg-card/30 hover:border-[#BE34D5]/30 transition-colors h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${item.color}15` }}
                    >
                      <item.icon className="w-5 h-5" style={{ color: item.color }} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: item.color }}>
                      Étape {item.step}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Section Cas d'usage — ciblée YouTubeurs tech */}
      <section className="container pb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-5xl mx-auto"
        >
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              Conçu pour les{" "}
              <span className="bg-gradient-to-r from-[#BE34D5] to-[#34D5BE] bg-clip-text text-transparent">
                créateurs de contenu
              </span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Transcribe Express s'intègre dans le workflow de post-production des YouTubeurs, podcasteurs et formateurs.
              Gagnez des heures sur chaque vidéo.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: Youtube,
                title: "YouTubeurs",
                desc: "Sous-titres SRT automatiques, chapitrage par timestamps, descriptions SEO générées depuis la transcription.",
                highlight: true,
              },
              {
                icon: Podcast,
                title: "Podcasteurs",
                desc: "Transcription complète pour les show notes, citations extraites, et accessibilité de vos épisodes.",
                highlight: false,
              },
              {
                icon: Presentation,
                title: "Formateurs",
                desc: "Transformez vos cours en supports écrits. Chaque module transcrit devient un document de référence.",
                highlight: false,
              },
              {
                icon: Headphones,
                title: "Journalistes",
                desc: "Interviews transcrites en quelques secondes. Navigation par timestamps pour retrouver chaque citation.",
                highlight: false,
              },
            ].map((item, i) => (
              <div
                key={i}
                className={`p-5 rounded-xl border transition-colors ${
                  item.highlight
                    ? "border-[#BE34D5]/30 bg-[#BE34D5]/5 hover:border-[#BE34D5]/50"
                    : "border-border/50 bg-card/30 hover:border-[#34D5BE]/30"
                }`}
              >
                <item.icon className={`w-8 h-8 mb-3 ${item.highlight ? "text-[#BE34D5]" : "text-[#34D5BE]"}`} />
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* FAQ Structurée */}
      <section className="container pb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto"
        >
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Questions fréquentes</h2>
            <p className="text-muted-foreground">
              Tout ce que vous devez savoir sur Transcribe Express avant de commencer.
            </p>
          </div>

          <div className="space-y-4">
            {SCHEMA_FAQ.mainEntity.map((item, i) => (
              <FAQItem key={i} question={item.name} answer={item.acceptedAnswer.text} />
            ))}
          </div>
        </motion.div>
      </section>

      {/* CTA Final */}
      <section className="container pb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="p-8 md:p-12 rounded-2xl border border-[#BE34D5]/20 bg-gradient-to-b from-[#BE34D5]/5 to-transparent">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Prêt à gagner des heures ?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Commencez gratuitement avec 30 minutes de transcription offertes.
              Aucune carte bancaire requise. Résultats en quelques secondes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/login">
                <Button size="lg" className="bg-gradient-to-r from-[#BE34D5] to-[#34D5BE] hover:opacity-90 text-white gap-2 px-8">
                  Commencer gratuitement <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="gap-2">
                  Voir les tarifs <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2026 Transcribe Express. Tous droits réservés.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/legal" className="hover:text-foreground transition-colors">Mentions légales</Link>
            <Link href="/cgv" className="hover:text-foreground transition-colors">CGV</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Confidentialité</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Composant FAQ accordéon ─────────────────────────────────────────────────
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-border/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
      >
        <span className="font-medium text-foreground pr-4">{question}</span>
        <ChevronRight className={`w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Utilitaire ──────────────────────────────────────────────────────────────
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
