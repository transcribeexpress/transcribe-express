/**
 * Legal.tsx — Mentions Légales
 *
 * Conformes à l'article 6-III de la Loi n° 2004-575 du 21 juin 2004
 * pour la confiance dans l'économie numérique (LCEN).
 */

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const LAST_UPDATE = "7 août 2026";
const VERSION = "1.0";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-10 scroll-mt-24">
      <h2 className="text-xl font-bold mb-4 text-foreground border-b border-border pb-2">{title}</h2>
      <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function LegalRef({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-mono bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded border border-border/50 ml-1">
      {children}
    </span>
  );
}

function InfoBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-muted/30 border border-border rounded-lg p-5 mt-3">
      <p className="font-semibold text-foreground mb-3">{title}</p>
      <div className="space-y-1.5 text-sm">{children}</div>
    </div>
  );
}

export default function Legal() {
  const { isSignedIn } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header harmonisé */}
      <header className="container py-4 sm:py-6">
        <nav className="flex items-center justify-between gap-2">
          <Link href="/">
            <div className="flex items-center gap-1.5 sm:gap-2 cursor-pointer flex-shrink-0">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310419663028820418/oRqyQWHwreNEuW2rCuPNoU/neon_symbol_transparent_9075d38e.png"
                alt="Transcribe Express Logo"
                className="w-7 h-7 sm:w-10 sm:h-10 object-contain flex-shrink-0"
                style={{ mixBlendMode: "screen" }}
              />
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310419663028820418/oRqyQWHwreNEuW2rCuPNoU/wordmark-transparent_d2755219.webp"
                alt="Transcribe Express"
                className="h-8 sm:h-12 md:h-14 w-auto max-w-[100px] sm:max-w-[180px] md:max-w-[220px] object-contain"
              />
            </div>
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            <Link href="/"><Button variant="ghost" size="sm" className="text-xs sm:text-sm px-2 sm:px-3">Accueil</Button></Link>
            <Link href="/pricing"><Button variant="ghost" size="sm" className="text-xs sm:text-sm px-2 sm:px-3">Tarifs</Button></Link>
            <Link href="/contact"><Button variant="ghost" size="sm" className="text-xs sm:text-sm px-2 sm:px-3">Contact</Button></Link>
            {isSignedIn ? (
              <Link href="/dashboard"><Button variant="outline" size="sm" className="text-xs sm:text-sm px-2 sm:px-3">Mon Transcribe</Button></Link>
            ) : (
              <Link href="/login"><Button variant="outline" size="sm" className="text-xs sm:text-sm px-2 sm:px-3">Se connecter</Button></Link>
            )}
          </div>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">

        {/* En-tête */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 text-xs font-medium bg-primary/10 text-primary rounded-full px-3 py-1 mb-4">
            Document juridique
          </div>
          <h1 className="text-3xl font-bold mb-3">Mentions Légales</h1>
          <p className="text-sm text-muted-foreground">
            Version {VERSION} — Dernière mise à jour : {LAST_UPDATE}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Conformément à l'article 6-III de la <strong className="text-foreground">Loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN)</strong>, les présentes mentions légales sont portées à la connaissance de tout utilisateur du service Transcribe Express, accessible à l'adresse <a href="https://transcribeexpress.manus.space" className="text-primary hover:underline">transcribeexpress.manus.space</a>.
          </p>
        </div>

        {/* ── 1. Éditeur du site ── */}
        <Section id="editeur" title="1. Éditeur du site">
          <p>
            Le service Transcribe Express est édité par :
            <LegalRef>Art. 6-III-1° LCEN</LegalRef>
          </p>
          <InfoBlock title="Z9E — Éditeur">
            <p><span className="font-medium text-foreground">Raison sociale :</span> Z9E</p>
            <p><span className="font-medium text-foreground">Forme juridique :</span> Entrepreneur individuel — Micro-entreprise</p>
            <p><span className="font-medium text-foreground">SIREN :</span> 451 824 197</p>
            <p><span className="font-medium text-foreground">SIRET (siège) :</span> 451 824 197 00029</p>
            <p><span className="font-medium text-foreground">N° TVA intracommunautaire :</span> FR35451824197</p>
            <p><span className="font-medium text-foreground">N° RCS :</span> 451 824 197 R.C.S. Paris (inscrit au greffe de Paris le 27/05/2026)</p>
            <p><span className="font-medium text-foreground">Inscription RNE :</span> Inscrit</p>
            <p><span className="font-medium text-foreground">Code APE / NAF :</span> 62.02A — Conseil en systèmes et logiciels informatiques</p>
            <p><span className="font-medium text-foreground">Adresse postale :</span> 47 rue Vivienne — 75002 Paris, France</p>
            <p><span className="font-medium text-foreground">Contact :</span> <Link href="/contact" className="text-primary hover:underline">Formulaire de contact</Link></p>
          </InfoBlock>
        </Section>

        {/* ── 2. Directeur de la publication ── */}
        <Section id="directeur" title="2. Directeur de la publication">
          <p>
            Conformément à l'article 6-III-1° de la LCEN, le directeur de la publication est le représentant légal de Z9E, entrepreneur individuel, dont le siège social est situé au 47 rue Vivienne, 75002 Paris.
            <LegalRef>Art. 6-III-1° LCEN</LegalRef>
          </p>
          <p>
            Pour toute communication relative au contenu éditorial du site, vous pouvez utiliser le <Link href="/contact" className="text-primary hover:underline">formulaire de contact</Link>.
          </p>
        </Section>

        {/* ── 3. Hébergement ── */}
        <Section id="hebergement" title="3. Hébergement du service">
          <p>
            Conformément à l'article 6-III-2° de la LCEN, les informations relatives à l'hébergeur du service sont les suivantes :
            <LegalRef>Art. 6-III-2° LCEN</LegalRef>
          </p>
          <InfoBlock title="Hébergeur principal — Manus (infrastructure applicative)">
            <p><span className="font-medium text-foreground">Société :</span> Manus (Meta Platforms, Inc.)</p>
            <p><span className="font-medium text-foreground">Service :</span> Manus Web Application Hosting (Autoscale)</p>
            <p><span className="font-medium text-foreground">Site :</span> <a href="https://manus.im" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">manus.im</a></p>
          </InfoBlock>
          <InfoBlock title="Stockage des fichiers — Amazon Web Services (AWS S3)">
            <p><span className="font-medium text-foreground">Société :</span> Amazon Web Services EMEA SARL</p>
            <p><span className="font-medium text-foreground">Adresse :</span> 38 avenue John F. Kennedy — L-1855 Luxembourg</p>
            <p><span className="font-medium text-foreground">Région de stockage :</span> Union européenne</p>
            <p><span className="font-medium text-foreground">Site :</span> <a href="https://aws.amazon.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">aws.amazon.com</a></p>
          </InfoBlock>
          <InfoBlock title="Base de données — TiDB Cloud (PingCAP)">
            <p><span className="font-medium text-foreground">Société :</span> PingCAP, Inc.</p>
            <p><span className="font-medium text-foreground">Région de stockage :</span> Union européenne</p>
            <p><span className="font-medium text-foreground">Site :</span> <a href="https://tidbcloud.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">tidbcloud.com</a></p>
          </InfoBlock>
          <InfoBlock title="Messagerie électronique — O2switch">
            <p><span className="font-medium text-foreground">Société :</span> O2switch SARL</p>
            <p><span className="font-medium text-foreground">Adresse :</span> 222-224 Boulevard Gustave Flaubert — 63000 Clermont-Ferrand, France</p>
            <p><span className="font-medium text-foreground">SIRET :</span> 510 909 807 00032</p>
            <p><span className="font-medium text-foreground">Site :</span> <a href="https://www.o2switch.fr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">o2switch.fr</a></p>
          </InfoBlock>
        </Section>

        {/* ── 4. Propriété intellectuelle ── */}
        <Section id="propriete" title="4. Propriété intellectuelle">
          <p>
            L'ensemble des éléments constituant le service Transcribe Express — notamment la marque, les logos, les textes, les graphismes, les interfaces, le code source, les algorithmes et l'architecture du service — sont la propriété exclusive de Z9E ou font l'objet d'une licence d'utilisation accordée à Z9E, et sont protégés par les dispositions du <strong className="text-foreground">Code de la propriété intellectuelle</strong>, notamment ses articles L111-1 et suivants relatifs au droit d'auteur, et L711-1 et suivants relatifs aux marques.
            <LegalRef>Art. L111-1 CPI — Art. L711-1 CPI</LegalRef>
          </p>
          <p>
            Toute reproduction, représentation, modification, publication, adaptation ou exploitation de tout ou partie des éléments du service, quel que soit le moyen ou le procédé utilisé, est interdite sans l'autorisation écrite préalable de Z9E, sauf disposition légale contraire. Toute exploitation non autorisée du service ou de l'un quelconque des éléments qu'il contient est constitutive d'une contrefaçon et est susceptible de donner lieu à des poursuites judiciaires.
          </p>
          <p>
            Les contenus produits par les utilisateurs dans le cadre de l'utilisation du service (fichiers audio, vidéo, textes transcrits) demeurent la propriété exclusive de leurs auteurs. Z9E ne revendique aucun droit de propriété intellectuelle sur ces contenus.
          </p>
        </Section>

        {/* ── 5. Responsabilité ── */}
        <Section id="responsabilite" title="5. Limitation de responsabilité">
          <p>
            Z9E s'efforce d'assurer l'exactitude et la mise à jour des informations diffusées sur le service. Toutefois, Z9E ne peut garantir l'exactitude, la précision ou l'exhaustivité des informations mises à disposition sur le service.
          </p>
          <p>
            Z9E ne saurait être tenu responsable des dommages directs ou indirects causés au matériel de l'utilisateur lors de l'accès au service, résultant soit de l'utilisation d'un matériel ne répondant pas aux spécifications techniques requises, soit de l'apparition d'un bug ou d'une incompatibilité.
          </p>
          <p>
            Z9E ne saurait être tenu responsable des dommages indirects consécutifs à l'utilisation du service, tels que la perte de données, la perte de chiffre d'affaires ou de bénéfices, la perte de clientèle ou toute autre perte économique, même si Z9E a été informé de la possibilité de tels dommages.
          </p>
          <p>
            La responsabilité de Z9E ne peut être engagée en cas de force majeure au sens de l'article 1218 du Code civil, ou en cas de fait imprévisible et insurmontable d'un tiers.
            <LegalRef>Art. 1218 Code civil</LegalRef>
          </p>
          <p>
            Z9E ne saurait être tenu responsable du contenu des fichiers audio et vidéo soumis par les utilisateurs à des fins de transcription. L'utilisateur est seul responsable du contenu qu'il soumet au traitement et garantit qu'il dispose de tous les droits nécessaires sur ces contenus.
          </p>
        </Section>

        {/* ── 6. Liens hypertextes ── */}
        <Section id="liens" title="6. Liens hypertextes">
          <p>
            Le service Transcribe Express peut contenir des liens hypertextes vers d'autres sites internet. Z9E n'exerce aucun contrôle sur ces sites et décline toute responsabilité quant à leur contenu, leur disponibilité ou leur politique de confidentialité.
          </p>
          <p>
            La création de liens hypertextes pointant vers le service Transcribe Express est autorisée sans autorisation préalable, sous réserve que ces liens ne portent pas atteinte à l'image de Z9E, ne soient pas utilisés à des fins commerciales non autorisées, et n'induisent pas en erreur l'utilisateur sur l'origine ou la nature du service.
          </p>
        </Section>

        {/* ── 7. Droit applicable ── */}
        <Section id="droit" title="7. Droit applicable et juridiction compétente">
          <p>
            Les présentes mentions légales sont régies par le droit français. En cas de litige relatif à l'interprétation ou à l'exécution des présentes mentions légales, et à défaut de résolution amiable, les tribunaux français seront seuls compétents.
          </p>
          <p>
            Conformément aux articles L611-1 et suivants du Code de la consommation, tout consommateur a le droit de recourir gratuitement à un médiateur de la consommation en vue de la résolution amiable du litige qui l'oppose à un professionnel.
            <LegalRef>Art. L611-1 C.conso.</LegalRef>
          </p>
          <p>
            La Commission européenne met à disposition une plateforme de règlement en ligne des litiges (RLL) accessible à l'adresse : <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ec.europa.eu/consumers/odr</a>.
          </p>
        </Section>

        {/* ── 8. Contact ── */}
        <Section id="contact" title="8. Contact">
          <p>
            Pour toute question relative aux présentes mentions légales ou à l'utilisation du service, vous pouvez contacter Z9E via le <Link href="/contact" className="text-primary hover:underline">formulaire de contact</Link> disponible sur le service.
          </p>
          <InfoBlock title="Z9E — Éditeur de Transcribe Express">
            <p><span className="font-medium text-foreground">Adresse :</span> 47 rue Vivienne — 75002 Paris, France</p>
            <p><span className="font-medium text-foreground">Contact :</span> <Link href="/contact" className="text-primary hover:underline">transcribeexpress.manus.space/contact</Link></p>
          </InfoBlock>
        </Section>

        {/* Pied de page du document */}
        <div className="border-t border-border pt-8 mt-8 text-xs text-muted-foreground space-y-2">
          <p>
            <strong className="text-foreground">Références légales :</strong> Loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN) — Code de la propriété intellectuelle (Art. L111-1, L711-1) — Code civil (Art. 1218) — Code de la consommation (Art. L611-1).
          </p>
          <p className="pt-2">© 2026 Z9E — Transcribe Express. Tous droits réservés. Version {VERSION} — {LAST_UPDATE}.</p>
        </div>
      </main>

      {/* Footer harmonisé */}
      <footer className="container py-8 border-t mt-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">© 2026 Transcribe Express. Tous droits réservés.</p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/legal" className="hover:text-foreground transition-colors text-primary">Mentions légales</Link>
            <Link href="/cgv" className="hover:text-foreground transition-colors">CGV</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Confidentialité</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
