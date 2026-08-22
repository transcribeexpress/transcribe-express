import { ArrowRight } from "lucide-react";
import { Link } from "wouter";

interface AnswerFirstSectionProps {
  id: string;
  question: string;
  answer: string;
  title: string;
  paragraphs: string[];
  link?: {
    href: string;
    label: string;
  };
}

/**
 * Bloc éditorial conçu pour être lisible par les visiteurs et extractible par
 * les moteurs de réponse : réponse courte, puis passage autonome contextualisé.
 */
export function AnswerFirstSection({
  id,
  question,
  answer,
  title,
  paragraphs,
  link,
}: AnswerFirstSectionProps) {
  return (
    <section className="container pb-16 md:pb-20" aria-labelledby={`${id}-question`}>
      <div className="max-w-6xl mx-auto overflow-hidden rounded-3xl border border-[#BE34D5]/20 bg-gradient-to-br from-[#BE34D5]/7 via-card/70 to-[#34D5BE]/7 shadow-[0_20px_60px_-40px_rgba(190,52,213,0.45)]">
        <div className="grid lg:grid-cols-[0.82fr_1.18fr]">
          <div className="p-6 sm:p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-border/60 bg-background/25">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#34D5BE] mb-4">
              Réponse directe
            </p>
            <h2 id={`${id}-question`} className="text-2xl md:text-3xl font-bold leading-tight mb-5">
              {question}
            </h2>
            <p data-aeo-answer="true" className="text-base md:text-lg text-foreground/85 leading-relaxed">
              {answer}
            </p>
          </div>

          <article className="p-6 sm:p-8 lg:p-10" aria-labelledby={`${id}-title`}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#BE34D5] mb-4">
              Explication autonome
            </p>
            <h3 id={`${id}-title`} className="text-xl md:text-2xl font-semibold mb-5">
              {title}
            </h3>
            <div data-aeo-passage="true" className="space-y-4 text-sm md:text-base text-muted-foreground leading-7">
              {paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            {link && (
              <Link
                href={link.href}
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#34D5BE] transition-colors hover:text-[#34D5BE]/80"
              >
                {link.label}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
          </article>
        </div>
      </div>
    </section>
  );
}
