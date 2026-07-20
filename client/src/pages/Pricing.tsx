import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Check,
  Zap,
  Crown,
  Building2,
  Clock,
  FileAudio,
  Download,
  PenLine,
  Headphones,
  Shield,
  ChevronDown,
  ChevronUp,
  Gift,
  Timer,
  Target,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useState, useEffect } from "react";

// ─── Données structurées JSON-LD pour AEO/SEO ─────────────────────────────────
// Schema.org Product + FAQPage pour les moteurs de réponse IA
const PRICING_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Product",
      name: "Transcribe Express",
      description:
        "Service de transcription audio et vidéo par intelligence artificielle pour les créateurs de contenu francophones. Convertissez vos fichiers en texte avec horodatage précis en quelques secondes.",
      brand: {
        "@type": "Brand",
        name: "Transcribe Express",
      },
      offers: [
        {
          "@type": "Offer",
          name: "Essai Gratuit",
          description:
            "30 minutes de transcription gratuite pendant 30 jours, sans carte bancaire requise. Accès à toutes les fonctionnalités : éditeur synchronisé, horodatage, export TXT/SRT/VTT.",
          price: "0",
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
        },
        {
          "@type": "Offer",
          name: "Starter — À la minute",
          description:
            "Transcription à la demande à 0,15€ par minute. Idéal pour les créateurs occasionnels. Prépaiement par recharge, crédits valables 12 mois.",
          price: "0.15",
          priceCurrency: "EUR",
          unitText: "par minute",
          availability: "https://schema.org/InStock",
        },
        {
          "@type": "Offer",
          name: "Créateur — Abonnement mensuel",
          description:
            "5 heures de transcription par mois pour 14,90€. Parfait pour les YouTubers et podcasters réguliers. Minutes supplémentaires à 0,12€/min. Roll-over 1 mois.",
          price: "14.90",
          priceCurrency: "EUR",
          billingIncrement: "P1M",
          availability: "https://schema.org/InStock",
        },
        {
          "@type": "Offer",
          name: "Agence — Volume professionnel",
          description:
            "25 heures de transcription par mois pour 49,90€. Conçu pour les agences de création de contenu gérant plusieurs clients. Minutes supplémentaires à 0,08€/min. Roll-over 2 mois.",
          price: "49.90",
          priceCurrency: "EUR",
          billingIncrement: "P1M",
          availability: "https://schema.org/InStock",
        },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Combien coûte la transcription audio par IA avec Transcribe Express ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Transcribe Express propose 3 formules : le plan Starter à 0,15€ par minute (paiement à la consommation), le plan Créateur à 14,90€/mois pour 5 heures incluses, et le plan Agence à 49,90€/mois pour 25 heures incluses. Un essai gratuit de 30 minutes sur 30 jours est offert sans carte bancaire.",
          },
        },
        {
          "@type": "Question",
          name: "L'essai gratuit de Transcribe Express nécessite-t-il une carte bancaire ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Non. L'essai gratuit de Transcribe Express offre 30 minutes de transcription pendant 30 jours sans aucune carte bancaire requise. Vous accédez à toutes les fonctionnalités : éditeur synchronisé avec horodatage, export en TXT, SRT et VTT, et remplacement de mots avec surbrillance visuelle.",
          },
        },
        {
          "@type": "Question",
          name: "Quelle est la différence entre les plans Starter, Créateur et Agence de Transcribe Express ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Le plan Starter (0,15€/min) est idéal pour les créateurs occasionnels qui transcrivent ponctuellement. Le plan Créateur (14,90€/mois, 5h incluses) convient aux YouTubers publiant plusieurs vidéos par semaine. Le plan Agence (49,90€/mois, 25h incluses) est conçu pour les agences gérant plusieurs clients avec un gros volume de transcription. Plus le plan est élevé, plus le coût par minute est réduit.",
          },
        },
        {
          "@type": "Question",
          name: "Les minutes non utilisées sont-elles perdues à la fin du mois ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Non. Le plan Créateur inclut un roll-over de 1 mois : vos minutes non utilisées sont reportées au mois suivant. Le plan Agence offre un roll-over de 2 mois. Pour le plan Starter, les crédits prépayés sont valables 12 mois.",
          },
        },
        {
          "@type": "Question",
          name: "Transcribe Express est-il sans engagement ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Oui. Tous les plans de Transcribe Express sont sans engagement. Vous pouvez résilier à tout moment, sans frais ni pénalité. Le plan Starter fonctionne par recharge prépayée (pas d'abonnement). Les plans Créateur et Agence sont mensuels et résiliables à tout moment.",
          },
        },
        {
          "@type": "Question",
          name: "Quel est le meilleur outil de transcription pour les YouTubers français ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Transcribe Express est spécialement conçu pour les créateurs de contenu francophones. Il offre une transcription IA rapide (moins de 2 minutes pour 1 heure d'audio), un éditeur synchronisé avec horodatage précis, l'export direct en SRT/VTT pour les sous-titres YouTube, et une interface 100% en français. Le plan Créateur à 14,90€/mois avec 5 heures incluses couvre les besoins de la plupart des YouTubers.",
          },
        },
      ],
    },
  ],
};

// ─── Composant FAQ Accordion ────────────────────────────────────────────────────

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}

function FAQItem({ question, answer, isOpen, onToggle }: FAQItemProps) {
  return (
    <div className="border-b border-border/50 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-5 px-1 text-left hover:text-primary transition-colors"
        aria-expanded={isOpen}
      >
        <span className="text-base md:text-lg font-medium pr-4">
          {question}
        </span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 flex-shrink-0 text-primary" />
        ) : (
          <ChevronDown className="w-5 h-5 flex-shrink-0 text-muted-foreground" />
        )}
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? "max-h-96 pb-5" : "max-h-0"
        }`}
      >
        <p className="text-muted-foreground leading-relaxed px-1">{answer}</p>
      </div>
    </div>
  );
}

// ─── Page Pricing ───────────────────────────────────────────────────────────────

export default function Pricing() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(0);
  const [isAnnual, setIsAnnual] = useState(false);

  // Inject JSON-LD on mount
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(PRICING_JSON_LD);
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // Update document title for SEO
  useEffect(() => {
    document.title =
      "Tarifs Transcribe Express — Transcription IA à partir de 0,15€/min | Essai Gratuit 30 min";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Découvrez les tarifs de Transcribe Express : essai gratuit 30 min sans CB, plan Starter à 0,15€/min, Créateur à 14,90€/mois (5h), Agence à 49,90€/mois (25h). Sans engagement."
      );
    }
  }, []);

  const faqItems = [
    {
      question:
        "Combien coûte la transcription audio par IA avec Transcribe Express ?",
      answer:
        "Transcribe Express propose 3 formules adaptées à chaque besoin : le plan Starter à 0,15€ par minute (paiement à la consommation sans abonnement), le plan Créateur à 14,90€/mois pour 5 heures incluses, et le plan Agence à 49,90€/mois pour 25 heures incluses. Un essai gratuit de 30 minutes sur 30 jours est offert sans carte bancaire.",
    },
    {
      question:
        "L'essai gratuit nécessite-t-il une carte bancaire ?",
      answer:
        "Non, aucune carte bancaire n'est requise. L'essai gratuit vous offre 30 minutes de transcription pendant 30 jours avec accès à toutes les fonctionnalités : éditeur synchronisé avec horodatage, export en TXT, SRT et VTT, et remplacement de mots avec surbrillance visuelle. Vous décidez ensuite librement de passer à un plan payant.",
    },
    {
      question:
        "Quelle est la différence entre les plans Starter, Créateur et Agence ?",
      answer:
        "Le plan Starter (0,15€/min) est idéal pour les créateurs occasionnels qui transcrivent ponctuellement — pas d'abonnement, vous payez uniquement ce que vous consommez. Le plan Créateur (14,90€/mois, 5h incluses) convient aux YouTubers publiant régulièrement. Le plan Agence (49,90€/mois, 25h incluses) est conçu pour les professionnels gérant un gros volume. Plus le plan est élevé, plus le coût par minute diminue.",
    },
    {
      question: "Les minutes non utilisées sont-elles perdues ?",
      answer:
        "Non. Le plan Créateur inclut un roll-over de 1 mois : vos minutes non utilisées sont automatiquement reportées au mois suivant. Le plan Agence offre un roll-over de 2 mois. Pour le plan Starter, les crédits prépayés restent valables 12 mois — aucune pression temporelle.",
    },
    {
      question: "Puis-je résilier à tout moment ?",
      answer:
        "Oui, tous les plans sont sans engagement. Le plan Starter fonctionne par recharge prépayée (pas d'abonnement du tout). Les plans Créateur et Agence sont mensuels et résiliables instantanément depuis votre espace, sans frais ni pénalité. Vos transcriptions restent accessibles après résiliation.",
    },
    {
      question:
        "Quel plan choisir pour un YouTuber qui publie 2-3 vidéos par semaine ?",
      answer:
        "Le plan Créateur à 14,90€/mois est idéal. Avec 5 heures (300 minutes) incluses, il couvre largement 2-3 vidéos de 15-20 minutes par semaine. Le coût effectif revient à seulement 0,05€/min — soit 67% moins cher que le plan Starter. Et grâce au roll-over, les minutes non utilisées ne sont jamais perdues.",
    },
  ];

  const creatorMonthly = 14.9;
  const creatorAnnual = 9.9;
  const agencyMonthly = 49.9;
  const agencyAnnual = 39.9;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      {/* Header */}
      <header className="container py-6">
        <nav className="flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
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
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
                Accueil
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                Se connecter
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* ── Hero Section — Réponse directe AEO ── */}
      <section className="container py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          {/* Badge essai gratuit */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
            <Gift className="w-4 h-4" />
            <span>30 minutes gratuites — Sans carte bancaire</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Des tarifs{" "}
            <span className="bg-gradient-to-r from-[#BE34D5] to-[#34D5BE] bg-clip-text text-transparent">
              simples et transparents
            </span>
          </h1>

          {/* Réponse directe AEO — proposition de valeur forte */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Horodatage au mot près. Précision &gt;95%. Éditeur synchronisé exclusif.
            Transcribe Express transforme vos fichiers audio en texte exploitable
            en <strong className="text-foreground">moins de 2 minutes</strong> — là où
            une transcription manuelle prend des heures.
          </p>

        </div>
      </section>

      {/* ── Section Avantage Concurrentiel — Pourquoi c'est différent ── */}
      <section className="container pb-16">
        <div className="max-w-5xl mx-auto">
          {/* Badge rupture */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#BE34D5]/10 to-[#34D5BE]/10 border border-[#34D5BE]/20 rounded-full px-4 py-1.5 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-[#34D5BE]" />
              <span className="text-sm font-medium text-[#34D5BE]">
                Ce que les autres outils ne font pas
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              Pas juste une transcription.
              <span className="bg-gradient-to-r from-[#BE34D5] to-[#34D5BE] bg-clip-text text-transparent"> Un studio d'édition.</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              La plupart des outils vous livrent un fichier texte brut. Transcribe Express vous donne un environnement professionnel pour corriger, naviguer et valider chaque mot en contexte sonore.
            </p>
          </div>

          {/* 3 colonnes : Besoin urgent / Rupture / Plus-value */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Besoin urgent */}
            <div className="rounded-2xl border bg-card/50 p-6 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <Timer className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="font-semibold text-lg">Votre temps est précieux</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Vous passez <strong className="text-foreground">3 à 5 heures</strong> à transcrire manuellement une vidéo d'une heure. Avec Transcribe Express, c'est fait en <strong className="text-foreground">moins de 2 minutes</strong>. Chaque semaine, vous récupérez des heures pour créer du contenu au lieu de le retranscrire.
              </p>
            </div>

            {/* Rupture concurrentielle */}
            <div className="rounded-2xl border-2 border-primary/30 bg-card/50 p-6 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Précision + Contrôle</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Horodatage au mot près, éditeur synchronisé avec Click-to-Seek, détection des passages incertains, remplacement global avec surbrillance. <strong className="text-foreground">Aucun concurrent</strong> ne propose ce niveau de contrôle sur votre transcription.
              </p>
            </div>

            {/* Plus-value haute */}
            <div className="rounded-2xl border bg-card/50 p-6 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <ArrowRight className="w-5 h-5 text-accent" />
              </div>
              <h3 className="font-semibold text-lg">Sous-titres en 1 clic</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Export direct en <strong className="text-foreground">SRT et VTT</strong> avec horodatage précis. Importez dans YouTube, Premiere Pro ou DaVinci Resolve sans retouche. Vos vidéos sont accessibles et référencées immédiatement.
              </p>
            </div>
          </div>

          {/* Citation de rupture */}
          <div className="mt-10 text-center">
            <blockquote className="text-base md:text-lg font-medium text-foreground/80 italic max-w-2xl mx-auto">
              « Un YouTuber qui publie 3 vidéos par semaine économise plus de 12 heures par mois avec Transcribe Express — soit l'équivalent d'une journée et demie de travail. »
            </blockquote>
          </div>
        </div>
      </section>

      {/* ── Pricing Cards ── */}
      <section className="container pb-20">
        {/* Toggle mensuel / annuel — au-dessus des cartes */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <span
            className={`text-sm font-medium transition-colors ${!isAnnual ? "text-foreground" : "text-muted-foreground"}`}
          >
            Mensuel
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className={`relative w-14 h-7 rounded-full transition-colors duration-300 flex-shrink-0 ${
              isAnnual
                ? "bg-gradient-to-r from-[#BE34D5] to-[#34D5BE]"
                : "bg-muted"
            }`}
            aria-label="Basculer entre tarif mensuel et annuel"
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 ${
                isAnnual ? "translate-x-7" : "translate-x-0"
              }`}
            />
          </button>
          <span
            className={`text-sm font-medium transition-colors ${isAnnual ? "text-foreground" : "text-muted-foreground"}`}
          >
            Annuel
          </span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-opacity duration-300 ${isAnnual ? "opacity-100 text-primary bg-primary/10" : "opacity-0"}`}>
            -33%
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Card 1 — Starter */}
          <div className="relative rounded-2xl border bg-card p-8 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <Zap className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Starter</h3>
                <p className="text-xs text-muted-foreground">À la minute</p>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">0,15€</span>
                <span className="text-muted-foreground">/min</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Prépaiement par recharge
              </p>
            </div>

            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Pour les créateurs occasionnels qui transcrivent ponctuellement et
              veulent payer uniquement ce qu'ils consomment.
            </p>

            <Link href="/login" className="mt-auto">
              <Button variant="outline" className="w-full" size="lg">
                Commencer gratuitement
              </Button>
            </Link>

            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Recharges : 5€, 10€, 20€ ou 50€</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Crédits valables 12 mois</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Fichiers jusqu'à 60 min</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Éditeur synchronisé + horodatage</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Export TXT, SRT, VTT</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Stockage 30 jours</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Support email (48h)</span>
              </li>
            </ul>
          </div>

          {/* Card 2 — Créateur (Recommandé) */}
          <div className="relative rounded-2xl border-2 border-primary bg-card p-8 flex flex-col shadow-lg shadow-primary/5">
            {/* Badge populaire */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="bg-gradient-to-r from-[#BE34D5] to-[#34D5BE] text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-md">
                Le plus populaire
              </span>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Créateur</h3>
                <p className="text-xs text-muted-foreground">
                  Abonnement mensuel
                </p>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">
                  {isAnnual
                    ? creatorAnnual.toFixed(2).replace(".", ",")
                    : creatorMonthly.toFixed(2).replace(".", ",")}
                  €
                </span>
                <span className="text-muted-foreground">/mois</span>
              </div>
              {isAnnual && (
                <p className="text-sm text-primary mt-1 font-medium">
                  Économisez 60€/an (facturé 118,80€/an)
                </p>
              )}
              {!isAnnual && (
                <p className="text-sm text-muted-foreground mt-1">
                  5 heures incluses / mois
                </p>
              )}
            </div>

            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Pour les YouTubers et podcasters réguliers qui publient plusieurs
              vidéos par semaine ou une vidéo longue hebdomadaire.
            </p>

            <Link href="/login" className="mt-auto">
              <Button
                className="w-full bg-gradient-to-r from-[#BE34D5] to-[#34D5BE] hover:opacity-90 text-white"
                size="lg"
              >
                Commencer gratuitement
              </Button>
            </Link>

            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>
                  <strong>5 heures</strong> (300 min) incluses/mois
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>
                  Minutes supp. à <strong>0,12€/min</strong> (-20%)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Fichiers jusqu'à 2h (120 min)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Roll-over 1 mois</strong> (minutes reportées)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Transcription prioritaire</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Historique illimité</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Stockage 90 jours</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Support email prioritaire (24h)</span>
              </li>
            </ul>
          </div>

          {/* Card 3 — Agence */}
          <div className="relative rounded-2xl border bg-card p-8 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Agence</h3>
                <p className="text-xs text-muted-foreground">
                  Volume professionnel
                </p>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">
                  {isAnnual
                    ? agencyAnnual.toFixed(2).replace(".", ",")
                    : agencyMonthly.toFixed(2).replace(".", ",")}
                  €
                </span>
                <span className="text-muted-foreground">/mois</span>
              </div>
              {isAnnual && (
                <p className="text-sm text-accent mt-1 font-medium">
                  Économisez 120€/an (facturé 478,80€/an)
                </p>
              )}
              {!isAnnual && (
                <p className="text-sm text-muted-foreground mt-1">
                  25 heures incluses / mois
                </p>
              )}
            </div>

            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Pour les agences de création de contenu qui gèrent plusieurs
              clients et ont besoin d'un très gros volume de transcription.
            </p>

            <Link href="/login" className="mt-auto">
              <Button variant="outline" className="w-full" size="lg">
                Commencer gratuitement
              </Button>
            </Link>

            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                <span>
                  <strong>25 heures</strong> (1 500 min) incluses/mois
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                <span>
                  Minutes supp. à <strong>0,08€/min</strong> (-47%)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                <span>Fichiers jusqu'à 4h (240 min)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Roll-over 2 mois</strong> (minutes reportées)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                <span>Transcription prioritaire</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                <span>Stockage illimité</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                <span>Export en lot (batch)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                <span>Support email prioritaire (12h)</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Mention sans engagement */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          Tous les plans sont <strong>sans engagement</strong>. Résiliez à tout
          moment, sans frais.
        </p>
      </section>

      {/* ── Tableau comparatif ── */}
      <section className="container pb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
            Comparez les fonctionnalités
          </h2>

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-4 font-medium">Fonctionnalité</th>
                  <th className="text-center p-4 font-medium">Starter</th>
                  <th className="text-center p-4 font-medium text-primary">
                    Créateur
                  </th>
                  <th className="text-center p-4 font-medium">Agence</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    Volume inclus
                  </td>
                  <td className="text-center p-4">À la demande</td>
                  <td className="text-center p-4 font-medium">5h / mois</td>
                  <td className="text-center p-4 font-medium">25h / mois</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-muted-foreground" />
                    Coût effectif / min
                  </td>
                  <td className="text-center p-4">0,15€</td>
                  <td className="text-center p-4 font-medium text-primary">
                    0,05€
                  </td>
                  <td className="text-center p-4 font-medium">0,03€</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 flex items-center gap-2">
                    <FileAudio className="w-4 h-4 text-muted-foreground" />
                    Limite par fichier
                  </td>
                  <td className="text-center p-4">60 min</td>
                  <td className="text-center p-4">120 min (2h)</td>
                  <td className="text-center p-4">240 min (4h)</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 flex items-center gap-2">
                    <PenLine className="w-4 h-4 text-muted-foreground" />
                    Éditeur synchronisé
                  </td>
                  <td className="text-center p-4">
                    <Check className="w-4 h-4 text-primary mx-auto" />
                  </td>
                  <td className="text-center p-4">
                    <Check className="w-4 h-4 text-primary mx-auto" />
                  </td>
                  <td className="text-center p-4">
                    <Check className="w-4 h-4 text-primary mx-auto" />
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 flex items-center gap-2">
                    <Headphones className="w-4 h-4 text-muted-foreground" />
                    Horodatage précis
                  </td>
                  <td className="text-center p-4">
                    <Check className="w-4 h-4 text-primary mx-auto" />
                  </td>
                  <td className="text-center p-4">
                    <Check className="w-4 h-4 text-primary mx-auto" />
                  </td>
                  <td className="text-center p-4">
                    <Check className="w-4 h-4 text-primary mx-auto" />
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 flex items-center gap-2">
                    <Download className="w-4 h-4 text-muted-foreground" />
                    Export TXT / SRT / VTT
                  </td>
                  <td className="text-center p-4">
                    <Check className="w-4 h-4 text-primary mx-auto" />
                  </td>
                  <td className="text-center p-4">
                    <Check className="w-4 h-4 text-primary mx-auto" />
                  </td>
                  <td className="text-center p-4">
                    <Check className="w-4 h-4 text-primary mx-auto" />
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    Roll-over minutes
                  </td>
                  <td className="text-center p-4 text-muted-foreground">
                    12 mois validité
                  </td>
                  <td className="text-center p-4 font-medium">1 mois</td>
                  <td className="text-center p-4 font-medium">2 mois</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4">Transcription prioritaire</td>
                  <td className="text-center p-4 text-muted-foreground">—</td>
                  <td className="text-center p-4">
                    <Check className="w-4 h-4 text-primary mx-auto" />
                  </td>
                  <td className="text-center p-4">
                    <Check className="w-4 h-4 text-primary mx-auto" />
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-4">Export en lot (batch)</td>
                  <td className="text-center p-4 text-muted-foreground">—</td>
                  <td className="text-center p-4 text-muted-foreground">—</td>
                  <td className="text-center p-4">
                    <Check className="w-4 h-4 text-accent mx-auto" />
                  </td>
                </tr>
                <tr>
                  <td className="p-4">Support</td>
                  <td className="text-center p-4">Email (48h)</td>
                  <td className="text-center p-4">Email prioritaire (24h)</td>
                  <td className="text-center p-4">Email prioritaire (12h)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Section Essai Gratuit (Social Proof + Urgence douce) ── */}
      <section className="container pb-20">
        <div className="max-w-4xl mx-auto text-center p-10 md:p-14 rounded-3xl bg-gradient-to-r from-[#BE34D5]/10 to-[#34D5BE]/10 border">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Gift className="w-4 h-4" />
            Essai gratuit
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Testez la qualité avant de vous engager
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            30 minutes de transcription offertes pendant 30 jours. Aucune carte
            bancaire requise. Accédez à toutes les fonctionnalités et constatez
            la précision de notre IA.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/login">
              <Button
                size="lg"
                className="bg-gradient-to-r from-[#BE34D5] to-[#34D5BE] hover:opacity-90 text-white px-8"
              >
                Commencer mon essai gratuit
              </Button>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Inscription en 30 secondes. Sans carte bancaire. Sans engagement.
          </p>
        </div>
      </section>

      {/* ── FAQ Section (AEO-optimized) ── */}
      <section className="container pb-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">
            Questions fréquentes sur nos tarifs
          </h2>
          <p className="text-center text-muted-foreground mb-10">
            Tout ce que vous devez savoir avant de choisir votre plan
          </p>

          <div className="rounded-xl border bg-card/50 p-6 md:p-8">
            {faqItems.map((item, index) => (
              <FAQItem
                key={index}
                question={item.question}
                answer={item.answer}
                isOpen={openFAQ === index}
                onToggle={() =>
                  setOpenFAQ(openFAQ === index ? null : index)
                }
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="container py-8 border-t mt-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2026 Transcribe Express. Tous droits réservés.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link
              href="/"
              className="hover:text-foreground transition-colors"
            >
              Accueil
            </Link>
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
