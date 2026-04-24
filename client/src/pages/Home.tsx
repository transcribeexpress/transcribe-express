import { Button } from "@/components/ui/button";
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
} from "lucide-react";

export default function Home() {
  return (
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
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1 — Transcription Rapide */}
          <div className="p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-[#BE34D5]/10 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-[#BE34D5]" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Transcription Rapide</h3>
            <p className="text-muted-foreground">
              Obtenez vos transcriptions en quelques secondes grâce à notre
              technologie IA avancée.
            </p>
          </div>

          {/* Feature 2 — Éditeur Intelligent (remplace Multi-langues) */}
          <div className="relative p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow overflow-hidden group">
            {/* Badge différenciant */}
            <div className="absolute top-4 right-4 flex items-center gap-1 bg-gradient-to-r from-[#BE34D5]/15 to-[#34D5BE]/15 border border-[#34D5BE]/30 rounded-full px-2.5 py-0.5">
              <span className="text-[10px] font-semibold text-[#34D5BE] uppercase tracking-wide">
                Exclusif
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#34D5BE]/10 flex items-center justify-center mb-4">
              <PenLine className="w-6 h-6 text-[#34D5BE]" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Éditeur Intelligent</h3>
            <p className="text-muted-foreground">
              Corrigez, naviguez et écoutez en parfaite synchronisation — un
              éditeur conçu spécifiquement pour la transcription.
            </p>
          </div>

          {/* Feature 3 — Sécurisé */}
          <div className="p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-[#BE34D5]/10 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-[#BE34D5]" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Sécurisé</h3>
            <p className="text-muted-foreground">
              Vos données, fichiers et transcriptions sont protégés de bout en
              bout : chiffrement, stockage sécurisé et accès strictement
              personnel à tous vos outils.
            </p>
          </div>

          {/* Feature 4 — Export Flexible */}
          <div className="p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-[#34D5BE]/10 flex items-center justify-center mb-4">
              <Download className="w-6 h-6 text-[#34D5BE]" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Export Flexible</h3>
            <p className="text-muted-foreground">
              Exportez vos transcriptions en TXT, SRT ou VTT selon vos besoins.
            </p>
          </div>

          {/* Feature 5 — Horodatage Précis */}
          <div className="p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-[#BE34D5]/10 flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-[#BE34D5]" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Horodatage Précis</h3>
            <p className="text-muted-foreground">
              Chaque segment de texte est horodaté avec précision pour faciliter
              la navigation.
            </p>
          </div>

          {/* Feature 6 — Formats Multiples */}
          <div className="p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-[#34D5BE]/10 flex items-center justify-center mb-4">
              <FileAudio className="w-6 h-6 text-[#34D5BE]" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Formats Multiples</h3>
            <p className="text-muted-foreground">
              Support de MP3, WAV, M4A, MOV, MP4, WEBM et plus encore.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section Éditeur Différenciant ─────────────────────────────────────── */}
      <section className="container py-24">
        {/* En-tête de section */}
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

        {/* Grille des fonctionnalités éditeur */}
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-16">
          {/* Lecture synchronisée */}
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

          {/* Click-to-Seek */}
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

          {/* Surbrillance en temps réel */}
          <div className="flex gap-4 p-6 rounded-2xl border bg-card/50 hover:bg-card hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <Highlighter className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Surbrillance en temps réel</h3>
              <p className="text-sm text-muted-foreground">
                Chaque paragraphe correspond à un segment Whisper horodaté.
                L'éditeur défile automatiquement pour garder le segment actif
                visible à l'écran.
              </p>
            </div>
          </div>

          {/* Détection des passages incertains */}
          <div className="flex gap-4 p-6 rounded-2xl border bg-card/50 hover:bg-card hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">
                Détection des passages incertains
              </h3>
              <p className="text-sm text-muted-foreground">
                L'IA signale automatiquement les segments à faible confiance.
                Réécoutez-les en un clic pour valider ou corriger sans chercher
                manuellement.
              </p>
            </div>
          </div>

          {/* Recherche & Remplacement */}
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

          {/* Sauvegarde & Restauration */}
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

        {/* Bandeau de preuve sociale / différenciation */}
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
            Rejoignez des milliers d'utilisateurs qui font confiance à Transcribe
            Express pour leurs transcriptions.
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
  );
}
