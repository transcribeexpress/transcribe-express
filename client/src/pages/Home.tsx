import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Mic, Zap, Globe, Lock, Download, Clock } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      {/* Header */}
      <header className="container py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#BE34D5] to-[#34D5BE] flex items-center justify-center">
              <Mic className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold">Transcribe Express</span>
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
            Convertissez vos fichiers audio et vidéo en texte en quelques secondes avec une précision exceptionnelle grâce à l'intelligence artificielle.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="bg-gradient-to-r from-[#BE34D5] to-[#34D5BE] hover:opacity-90 text-white">
                Commencer gratuitement
              </Button>
            </Link>
            <Button size="lg" variant="outline">
              Voir la démo
            </Button>
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
          {/* Feature 1 */}
          <div className="p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-[#BE34D5]/10 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-[#BE34D5]" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Transcription Rapide</h3>
            <p className="text-muted-foreground">
              Obtenez vos transcriptions en quelques secondes grâce à notre technologie IA avancée.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-[#34D5BE]/10 flex items-center justify-center mb-4">
              <Globe className="w-6 h-6 text-[#34D5BE]" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Multi-langues</h3>
            <p className="text-muted-foreground">
              Support de plus de 50 langues pour vos transcriptions internationales.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-[#BE34D5]/10 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-[#BE34D5]" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Sécurisé</h3>
            <p className="text-muted-foreground">
              Vos fichiers sont chiffrés et stockés en toute sécurité sur AWS S3.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-[#34D5BE]/10 flex items-center justify-center mb-4">
              <Download className="w-6 h-6 text-[#34D5BE]" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Export Flexible</h3>
            <p className="text-muted-foreground">
              Exportez vos transcriptions en TXT, SRT ou JSON selon vos besoins.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-[#BE34D5]/10 flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-[#BE34D5]" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Horodatage Précis</h3>
            <p className="text-muted-foreground">
              Chaque segment de texte est horodaté avec précision pour faciliter la navigation.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-[#34D5BE]/10 flex items-center justify-center mb-4">
              <Mic className="w-6 h-6 text-[#34D5BE]" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Formats Multiples</h3>
            <p className="text-muted-foreground">
              Support de MP3, WAV, M4A, OGG, MP4, WEBM et plus encore.
            </p>
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
            Rejoignez des milliers d'utilisateurs qui font confiance à Transcribe Express pour leurs transcriptions.
          </p>
          <Link href="/login">
            <Button size="lg" className="bg-gradient-to-r from-[#BE34D5] to-[#34D5BE] hover:opacity-90 text-white">
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
            <a href="#" className="hover:text-foreground transition-colors">Conditions</a>
            <a href="#" className="hover:text-foreground transition-colors">Confidentialité</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
