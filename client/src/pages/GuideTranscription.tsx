import { useMemo } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  AudioLines,
  BookOpenCheck,
  Captions,
  CheckCircle2,
  ExternalLink,
  FileText,
  Gauge,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SeoHead } from "@/components/SeoHead";
import { useAuth } from "@/hooks/useAuth";
import {
  AEO_EDITORIAL_FAQS,
  EDITORIAL_GROUPS,
  EDITORIAL_SOURCES,
  getEditorialSource,
} from "@/lib/aeoEditorial";
import { GUIDE_STRUCTURED_DATA } from "@/lib/seoSchemas";

const NEON_LOGO =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663028820418/oRqyQWHwreNEuW2rCuPNoU/neon_symbol_transparent_9075d38e.png";
const WORDMARK =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663028820418/oRqyQWHwreNEuW2rCuPNoU/wordmark-transparent_d2755219.webp";

const groupIcons = {
  Comprendre: AudioLines,
  Qualité: Gauge,
  "YouTube & formats": Captions,
  Service: Sparkles,
  "Confidentialité & accessibilité": ShieldCheck,
} as const;

function SourceLinks({ sourceIds }: { sourceIds: string[] }) {
  const sources = sourceIds
    .map((id) => getEditorialSource(id))
    .filter((source): source is NonNullable<typeof source> => Boolean(source));

  return (
    <div className="mt-4 flex flex-wrap gap-2" aria-label="Sources de la réponse">
      {sources.map((source) => (
        <a
          key={source.id}
          href={source.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-[#34D5BE]/50 hover:text-foreground"
        >
          {source.publisher}
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}

export default function GuideTranscription() {
  const { isSignedIn } = useAuth();
  const groupedQuestions = useMemo(
    () =>
      EDITORIAL_GROUPS.map((group) => ({
        group,
        items: AEO_EDITORIAL_FAQS.filter((item) => item.group === group),
      })),
    []
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/80 text-foreground">
      <SeoHead
        title="Guide de la transcription audio et vidéo | Transcribe Express"
        description="20 réponses vérifiées sur la transcription audio, Whisper, la précision, les sous-titres YouTube, SRT, WebVTT, la confidentialité et l’accessibilité."
        path="/guide-transcription"
        type="article"
        structuredData={GUIDE_STRUCTURED_DATA}
      />

      <header className="container py-4 sm:py-6">
        <nav className="flex items-center justify-between gap-2" aria-label="Navigation principale">
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0" aria-label="Accueil Transcribe Express">
            <img
              src={NEON_LOGO}
              alt=""
              className="h-7 w-7 flex-shrink-0 object-contain sm:h-10 sm:w-10"
              style={{ mixBlendMode: "screen" }}
            />
            <img
              src={WORDMARK}
              alt="Transcribe Express"
              className="h-8 w-auto max-w-[100px] object-contain sm:h-12 sm:max-w-[180px] md:h-14 md:max-w-[220px]"
            />
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <Link href="/pricing"><Button variant="ghost" size="sm" className="px-2 text-xs sm:px-3 sm:text-sm">Tarifs</Button></Link>
            <Link href="/demo"><Button variant="ghost" size="sm" className="px-2 text-xs sm:px-3 sm:text-sm">Démo</Button></Link>
            <Link href="/contact"><Button variant="ghost" size="sm" className="hidden px-2 text-xs sm:inline-flex sm:px-3 sm:text-sm">Contact</Button></Link>
            {isSignedIn ? (
              <Link href="/dashboard"><Button variant="outline" size="sm" className="px-2 text-xs sm:px-3 sm:text-sm">Mon Transcribe</Button></Link>
            ) : (
              <Link href="/login"><Button variant="outline" size="sm" className="px-2 text-xs sm:px-3 sm:text-sm">Se connecter</Button></Link>
            )}
          </div>
        </nav>
      </header>

      <main>
        <section className="container pb-14 pt-14 md:pb-20 md:pt-24">
          <div className="mx-auto max-w-5xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#34D5BE]/25 bg-[#34D5BE]/8 px-4 py-2 text-sm font-medium text-[#34D5BE]">
              <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
              Guide vérifié · Mise à jour le 22 août 2026
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Comprendre la transcription audio,
              <span className="block bg-gradient-to-r from-[#BE34D5] to-[#34D5BE] bg-clip-text text-transparent">
                du fichier au sous-titre
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-muted-foreground md:text-xl">
              Ce guide répond aux questions les plus fréquentes sur la conversion audio-vers-texte,
              la qualité de reconnaissance, YouTube, les formats SRT et VTT, la confidentialité et l’accessibilité.
              Les affirmations techniques sont reliées à des sources primaires ou aux pages contractuelles du service.
            </p>
          </div>
        </section>

        <section className="container pb-16" aria-labelledby="repere-title">
          <div className="mx-auto max-w-6xl rounded-3xl border border-[#BE34D5]/20 bg-gradient-to-br from-[#BE34D5]/8 via-card/70 to-[#34D5BE]/8 p-6 shadow-[0_24px_70px_-48px_rgba(190,52,213,0.7)] md:p-10">
            <div className="max-w-3xl">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#34D5BE]">Réponse directe</p>
              <h2 id="repere-title" className="text-2xl font-bold md:text-3xl">Comment obtenir une transcription exploitable ?</h2>
              <p data-aeo-answer="true" className="mt-4 text-base leading-7 text-foreground/85 md:text-lg">
                Importez un enregistrement clair, générez le texte, puis relisez les passages sensibles avec l’audio.
                Utilisez TXT pour réemployer le contenu, SRT pour des sous-titres simples et WebVTT pour une piste textuelle web.
                Aucun outil automatique ne dispense de vérifier les noms propres, le vocabulaire spécialisé et les timecodes.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["680 000 h", "corpus d’entraînement décrit dans l’article Whisper", "OpenAI / ICML"],
                ["96 langues", "autres que l’anglais dans les données ASR publiées", "OpenAI / ICML"],
                ["3 exports", "TXT, SRT et VTT disponibles dans le service", "Transcribe Express"],
                ["30 minutes", "pour tester le compte gratuit pendant 30 jours", "Transcribe Express"],
              ].map(([value, label, source]) => (
                <article key={value} className="rounded-2xl border border-border/60 bg-background/50 p-5">
                  <p className="font-mono text-2xl font-bold text-[#34D5BE]">{value}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{label}</p>
                  <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#BE34D5]">{source}</p>
                </article>
              ))}
            </div>

            <p className="mt-6 text-xs leading-5 text-muted-foreground">
              Les données OpenAI décrivent le corpus et l’architecture de Whisper. Elles ne constituent pas une promesse de précision pour Transcribe Express ni pour un fichier individuel.
            </p>
          </div>
        </section>

        <section className="container pb-12" aria-label="Sommaire du guide">
          <div className="mx-auto max-w-6xl rounded-2xl border border-border/60 bg-card/40 p-5 md:p-7">
            <p className="mb-4 text-sm font-semibold text-foreground">Accéder directement à une catégorie</p>
            <div className="flex flex-wrap gap-2">
              {EDITORIAL_GROUPS.map((group) => (
                <a
                  key={group}
                  href={`#${group.toLowerCase().replaceAll(" ", "-").replaceAll("&", "et")}`}
                  className="rounded-full border border-border/70 px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-[#BE34D5]/50 hover:text-foreground"
                >
                  {group}
                </a>
              ))}
            </div>
          </div>
        </section>

        {groupedQuestions.map(({ group, items }, groupIndex) => {
          const Icon = groupIcons[group];
          const sectionId = group.toLowerCase().replaceAll(" ", "-").replaceAll("&", "et");
          const firstQuestionNumber = AEO_EDITORIAL_FAQS.findIndex((item) => item.id === items[0]?.id) + 1;
          const lastQuestionNumber = firstQuestionNumber + items.length - 1;
          return (
            <section key={group} id={sectionId} className="container scroll-mt-8 py-12" aria-labelledby={`${sectionId}-title`}>
              <div className="mx-auto max-w-6xl">
                <div className="mb-8 flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${groupIndex % 2 === 0 ? "border-[#BE34D5]/30 bg-[#BE34D5]/10 text-[#BE34D5]" : "border-[#34D5BE]/30 bg-[#34D5BE]/10 text-[#34D5BE]"}`}>
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Questions {firstQuestionNumber} à {lastQuestionNumber}</p>
                    <h2 id={`${sectionId}-title`} className="text-2xl font-bold md:text-3xl">{group}</h2>
                  </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  {items.map((item, itemIndex) => (
                    <article
                      key={item.id}
                      id={item.id}
                      data-aeo-passage="true"
                      className="scroll-mt-8 rounded-2xl border border-border/60 bg-card/55 p-6 transition-colors hover:border-[#34D5BE]/30"
                    >
                      <div className="flex gap-4">
                        <span className="font-mono text-xs font-semibold text-[#BE34D5]">{String(firstQuestionNumber + itemIndex).padStart(2, "0")}</span>
                        <div>
                          <h3 className="text-lg font-semibold leading-7">{item.question}</h3>
                          <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.answer}</p>
                          {item.relatedLink && (
                            <Link href={item.relatedLink.href} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#34D5BE] hover:text-[#34D5BE]/80">
                              {item.relatedLink.label}
                              <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </Link>
                          )}
                          <SourceLinks sourceIds={item.sourceIds} />
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          );
        })}

        <section className="container py-16" aria-labelledby="method-title">
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <article className="rounded-3xl border border-[#34D5BE]/20 bg-[#34D5BE]/6 p-7 md:p-9">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#34D5BE]/12 text-[#34D5BE]">
                <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2 id="method-title" className="text-2xl font-bold">Méthode éditoriale</h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Les chiffres externes sont publiés uniquement avec leur contexte et leur source. Les performances de recherche ne sont jamais transformées en garantie commerciale. Les informations propres au service renvoient vers les pages produit, Tarifs ou Confidentialité qui font référence.
              </p>
              <Link href="/contact" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#34D5BE] hover:text-[#34D5BE]/80">
                Signaler une information à actualiser
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </article>

            <article className="rounded-3xl border border-border/60 bg-card/50 p-7 md:p-9">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#BE34D5]/10 text-[#BE34D5]">
                <FileText className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2 className="text-2xl font-bold">Sources consultées</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {EDITORIAL_SOURCES.filter((source) => !source.id.startsWith("product-")).map((source) => (
                  <a
                    key={source.id}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-border/60 bg-background/40 p-4 transition-colors hover:border-[#BE34D5]/40"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#BE34D5]">{source.publisher}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{source.title}</p>
                  </a>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="container pb-20 pt-8">
          <div className="mx-auto max-w-4xl rounded-3xl border border-[#BE34D5]/25 bg-gradient-to-r from-[#BE34D5]/10 to-[#34D5BE]/10 p-8 text-center md:p-12">
            <h2 className="text-2xl font-bold md:text-4xl">Passez de la réponse à votre premier fichier</h2>
            <p className="mx-auto mt-4 max-w-2xl leading-7 text-muted-foreground">
              Testez la démo publique, puis utilisez les 30 minutes du compte gratuit pour évaluer la transcription sur vos propres contenus.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/demo"><Button size="lg" variant="outline">Voir la démo</Button></Link>
              <Link href="/login"><Button size="lg" className="bg-gradient-to-r from-[#BE34D5] to-[#34D5BE] text-white hover:opacity-90">Commencer gratuitement</Button></Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="container mt-8 border-t py-8">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-sm text-muted-foreground">© 2026 Transcribe Express. Tous droits réservés.</p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/guide-transcription" className="text-primary transition-colors hover:text-foreground">Guide transcription</Link>
            <Link href="/legal" className="transition-colors hover:text-foreground">Mentions légales</Link>
            <Link href="/cgv" className="transition-colors hover:text-foreground">CGV</Link>
            <Link href="/privacy" className="transition-colors hover:text-foreground">Confidentialité</Link>
            <Link href="/contact" className="transition-colors hover:text-foreground">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
