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
import { SeoHead } from "@/components/SeoHead";
import { DEMO_FAQ_ITEMS, DEMO_STRUCTURED_DATA } from "@/lib/seoSchemas";
import { AnswerFirstSection } from "@/components/AnswerFirstSection";
import { DEMO_ANSWER_FIRST } from "@/lib/aeoContent";

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead
        title="Démo de transcription IA en français | Transcribe Express"
        description="Testez une démo de transcription française sans inscription : audio fourni, texte horodaté, éditeur synchronisé et aperçu d’un appel réel à Whisper."
        path="/demo"
        structuredData={DEMO_STRUCTURED_DATA}
      />
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
            Transcription IA audio et vidéo{" "}
            <span className="bg-gradient-to-r from-[#BE34D5] to-[#34D5BE] bg-clip-text text-transparent">
              en français
            </span>
          </h1>
          {/* Paragraphe AEO "Answer-First" — extractible par les moteurs IA */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Testez sans inscription un extrait audio français, observez son texte horodaté,
            puis déclenchez un appel réel au service de transcription Whisper.
          </p>
        </motion.div>
      </section>

      <AnswerFirstSection {...DEMO_ANSWER_FIRST} />

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
                  <span className="text-xs text-muted-foreground">Whisper</span>
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
              Testez Whisper sur notre fichier de démonstration — traitement serveur réel
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
              Transcribe Express transforme un fichier audio ou vidéo en segments de texte horodatés,
              puis permet de relire et d’exporter le résultat.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                step: 1,
                icon: Upload,
                title: "Importez votre fichier",
                desc: "Sélectionnez un fichier audio ou vidéo accepté. Sur smartphone, la taille maximale est de 300 Mo.",
                color: "#BE34D5",
              },
              {
                step: 2,
                icon: Zap,
                title: "Whisper génère le texte",
                desc: "Le service analyse la piste audio et produit une transcription composée de segments horodatés.",
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
              Transcribe Express s’intègre au workflow de post-production des YouTubeurs,
              podcasteurs, formateurs et journalistes qui souhaitent réutiliser un contenu parlé à l’écrit.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: Youtube,
                title: "YouTubeurs",
                desc: "Préparez des sous-titres SRT ou VTT et réutilisez la transcription pour structurer une description ou un chapitrage.",
                highlight: true,
              },
              {
                icon: Podcast,
                title: "Podcasteurs",
                desc: "Relisez l’épisode à l’écrit et utilisez la transcription pour préparer des show notes, des citations ou une version accessible.",
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
                desc: "Transcrivez une interview et utilisez les segments horodatés pour retrouver plus facilement un passage ou une citation.",
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
            {DEMO_FAQ_ITEMS.map((item, i) => (
              <FAQItem key={i} question={item.question} answer={item.answer} />
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
              Aucune carte bancaire requise. Le temps de traitement varie selon le fichier.
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
