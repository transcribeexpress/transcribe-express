/**
 * CGV.tsx — Conditions Générales de Vente
 *
 * Conformes aux articles L111-1, L221-1 et suivants du Code de la consommation,
 * à l'article L441-1 du Code de commerce, et au Règlement (UE) 2019/1150.
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

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <h3 className="text-base font-semibold text-foreground mb-2">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function LegalRef({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-mono bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded border border-border/50 ml-1">
      {children}
    </span>
  );
}

function TableOfContents() {
  const items = [
    { id: "objet", label: "1. Objet et champ d'application" },
    { id: "vendeur", label: "2. Identité du vendeur" },
    { id: "services", label: "3. Description des services" },
    { id: "tarifs", label: "4. Tarifs et modalités de paiement" },
    { id: "commande", label: "5. Processus de commande et formation du contrat" },
    { id: "retractation", label: "6. Droit de rétractation" },
    { id: "execution", label: "7. Exécution du service" },
    { id: "obligations", label: "8. Obligations de l'utilisateur" },
    { id: "responsabilite", label: "9. Responsabilité" },
    { id: "resiliation", label: "10. Résiliation et suspension" },
    { id: "propriete", label: "11. Propriété intellectuelle" },
    { id: "donnees", label: "12. Protection des données personnelles" },
    { id: "garanties", label: "13. Garanties légales" },
    { id: "mediation", label: "14. Médiation et règlement des litiges" },
    { id: "droit", label: "15. Droit applicable et juridiction" },
    { id: "contact", label: "16. Contact" },
  ];
  return (
    <nav className="bg-muted/30 border border-border rounded-lg p-5 mb-10">
      <p className="text-sm font-semibold text-foreground mb-3">Sommaire</p>
      <ol className="space-y-1.5 columns-2">
        {items.map((item) => (
          <li key={item.id}>
            <a href={`#${item.id}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default function CGV() {
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
          <h1 className="text-3xl font-bold mb-3">Conditions Générales de Vente</h1>
          <p className="text-sm text-muted-foreground">
            Version {VERSION} — Dernière mise à jour : {LAST_UPDATE}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Les présentes Conditions Générales de Vente (ci-après « CGV ») régissent les relations contractuelles entre <strong className="text-foreground">Z9E</strong> (ci-après « le Vendeur ») et tout utilisateur (ci-après « le Client ») souscrivant à un abonnement ou effectuant un achat sur le service <strong className="text-foreground">Transcribe Express</strong>, accessible à l'adresse <a href="https://transcribeexpress.fr" className="text-primary hover:underline">transcribeexpress.fr</a>.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Elles sont rédigées en conformité avec le <strong className="text-foreground">Code de la consommation</strong> (notamment les articles L111-1, L221-1 et suivants), le <strong className="text-foreground">Code de commerce</strong> (article L441-1), et le <strong className="text-foreground">Règlement (UE) 2019/1150</strong> relatif à la promotion de l'équité et de la transparence pour les entreprises utilisatrices de services d'intermédiation en ligne.
          </p>
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-lg p-4 mt-4 text-sm">
            <strong>Important :</strong> en créant un compte et en souscrivant à un abonnement ou en effectuant un achat sur Transcribe Express, le Client reconnaît avoir lu, compris et accepté sans réserve les présentes CGV. Cette acceptation est matérialisée par le clic sur le bouton de validation lors du processus de commande.
          </div>
        </div>

        <TableOfContents />

        {/* ── 1. Objet ── */}
        <Section id="objet" title="1. Objet et champ d'application">
          <p>
            Les présentes CGV ont pour objet de définir les droits et obligations des parties dans le cadre de la vente en ligne de services de transcription audio et vidéo par intelligence artificielle proposés par Z9E sous la marque Transcribe Express.
            <LegalRef>Art. L111-1 C.conso.</LegalRef>
          </p>
          <p>
            Elles s'appliquent à toute commande passée sur le service Transcribe Express, qu'il s'agisse de la souscription à un abonnement mensuel ou de l'achat de crédits de transcription prépayés. Elles s'appliquent tant aux consommateurs (personnes physiques agissant à titre non professionnel) qu'aux professionnels (personnes physiques ou morales agissant dans le cadre de leur activité commerciale, industrielle, artisanale, libérale ou agricole).
          </p>
          <p>
            Z9E se réserve le droit de modifier les présentes CGV à tout moment. Les CGV applicables sont celles en vigueur à la date de la commande. Toute modification substantielle sera notifiée aux Clients avec un préavis raisonnable.
          </p>
        </Section>

        {/* ── 2. Vendeur ── */}
        <Section id="vendeur" title="2. Identité du vendeur">
          <div className="bg-muted/30 border border-border rounded-lg p-5">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                <tr><td className="py-2 pr-4 font-medium text-foreground w-44">Raison sociale</td><td className="py-2 text-foreground">Z9E</td></tr>
                <tr><td className="py-2 pr-4 font-medium text-foreground">Forme juridique</td><td className="py-2">Entrepreneur individuel — Micro-entreprise</td></tr>
                <tr><td className="py-2 pr-4 font-medium text-foreground">SIREN</td><td className="py-2">451 824 197</td></tr>
                <tr><td className="py-2 pr-4 font-medium text-foreground">SIRET (siège)</td><td className="py-2">451 824 197 00029</td></tr>
                <tr><td className="py-2 pr-4 font-medium text-foreground">N° TVA</td><td className="py-2">FR35451824197</td></tr>
                <tr><td className="py-2 pr-4 font-medium text-foreground">N° RCS</td><td className="py-2">451 824 197 R.C.S. Paris</td></tr>
                <tr><td className="py-2 pr-4 font-medium text-foreground">Code APE</td><td className="py-2">62.02A — Conseil en systèmes et logiciels informatiques</td></tr>
                <tr><td className="py-2 pr-4 font-medium text-foreground">Adresse</td><td className="py-2">47 rue Vivienne — 75002 Paris, France</td></tr>
                <tr><td className="py-2 pr-4 font-medium text-foreground">Contact</td><td className="py-2"><Link href="/contact" className="text-primary hover:underline">Formulaire de contact</Link></td></tr>
              </tbody>
            </table>
          </div>
        </Section>

        {/* ── 3. Services ── */}
        <Section id="services" title="3. Description des services">
          <p>
            Transcribe Express est un service de transcription automatique de fichiers audio et vidéo par intelligence artificielle, accessible en ligne sous forme de logiciel en tant que service (SaaS — Software as a Service). Le service permet de convertir des fichiers audio et vidéo en texte avec horodatage, d'éditer les transcriptions obtenues, et d'exporter les résultats dans différents formats (TXT, SRT, VTT, etc.).
          </p>
          <SubSection title="3.1 Plans d'abonnement">
            <p>
              Z9E propose les plans d'abonnement suivants, dont les caractéristiques détaillées sont disponibles sur la <Link href="/pricing" className="text-primary hover:underline">page Tarifs</Link> :
            </p>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-semibold text-foreground">Plan</th>
                    <th className="text-left p-3 font-semibold text-foreground">Type</th>
                    <th className="text-left p-3 font-semibold text-foreground">Quota</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    ["Free (Essai gratuit)", "Gratuit — 30 jours", "30 minutes de transcription"],
                    ["Starter", "Recharges prépayées", "Crédits à la demande (5€, 10€, 20€, 50€)"],
                    ["Créateur", "Abonnement mensuel", "300 minutes/mois — tarif préférentiel 0,12€/min"],
                    ["Agence", "Abonnement mensuel", "1 500 minutes/mois — tarif préférentiel 0,08€/min"],
                  ].map(([plan, type, quota]) => (
                    <tr key={plan} className="hover:bg-muted/20">
                      <td className="p-3 font-medium text-foreground">{plan}</td>
                      <td className="p-3">{type}</td>
                      <td className="p-3">{quota}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SubSection>
          <SubSection title="3.2 Disponibilité du service">
            <p>
              Z9E s'efforce d'assurer la disponibilité du service 24h/24 et 7j/7. Toutefois, Z9E ne peut garantir une disponibilité sans interruption. Des interruptions de service peuvent survenir notamment pour des opérations de maintenance, des mises à jour, ou des événements de force majeure. Z9E s'engage à informer les Clients des interruptions planifiées avec un préavis raisonnable.
            </p>
          </SubSection>
        </Section>

        {/* ── 4. Tarifs ── */}
        <Section id="tarifs" title="4. Tarifs et modalités de paiement">
          <p>
            Les prix des services sont indiqués en euros (€) toutes taxes comprises (TTC). Z9E, en tant que micro-entreprise non assujettie à la TVA en vertu de l'article 293 B du Code général des impôts, applique la mention « TVA non applicable, article 293 B du CGI » sur ses factures.
            <LegalRef>Art. 293 B CGI</LegalRef>
          </p>
          <p>
            Z9E se réserve le droit de modifier ses tarifs à tout moment. Les tarifs applicables sont ceux en vigueur au moment de la validation de la commande. Toute modification tarifaire sera communiquée aux abonnés avec un préavis d'au moins 30 jours avant son entrée en vigueur.
          </p>
          <SubSection title="4.1 Paiement en ligne">
            <p>
              Le paiement s'effectue en ligne, au moment de la commande, par carte bancaire (Visa, Mastercard, American Express) ou par tout autre moyen de paiement proposé lors du processus de commande. Les transactions sont sécurisées et traitées par <strong className="text-foreground">Stripe, Inc.</strong>, prestataire de services de paiement certifié PCI-DSS niveau 1. Z9E ne conserve aucune donnée bancaire.
            </p>
          </SubSection>
          <SubSection title="4.2 Facturation">
            <p>
              Une facture est émise pour chaque transaction et accessible depuis l'espace personnel du Client. Pour les abonnements mensuels, la facturation est effectuée à chaque renouvellement mensuel. Les crédits prépayés sont facturés au moment de l'achat.
            </p>
          </SubSection>
          <SubSection title="4.3 Défaut de paiement">
            <p>
              En cas de défaut de paiement ou de rejet de la transaction bancaire, Z9E se réserve le droit de suspendre ou de résilier l'accès au service. Conformément à l'article L441-10 du Code de commerce, tout retard de paiement entre professionnels donne lieu de plein droit à l'application de pénalités de retard.
              <LegalRef>Art. L441-10 C.com.</LegalRef>
            </p>
          </SubSection>
        </Section>

        {/* ── 5. Commande ── */}
        <Section id="commande" title="5. Processus de commande et formation du contrat">
          <p>
            Conformément à l'article 1127-1 du Code civil, le processus de commande en ligne comprend les étapes suivantes :
            <LegalRef>Art. 1127-1 Code civil</LegalRef>
          </p>
          <div className="space-y-3 mt-2">
            {[
              ["Étape 1", "Création d'un compte utilisateur ou connexion à un compte existant"],
              ["Étape 2", "Sélection du plan ou des crédits souhaités sur la page Tarifs"],
              ["Étape 3", "Vérification du récapitulatif de commande (plan, prix, conditions)"],
              ["Étape 4", "Saisie des informations de paiement sur la page sécurisée Stripe"],
              ["Étape 5", "Validation de la commande par clic sur le bouton de confirmation"],
              ["Étape 6", "Confirmation de commande par email et activation immédiate du service"],
            ].map(([etape, desc]) => (
              <div key={etape} className="flex gap-3 items-start">
                <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-1 rounded flex-shrink-0 mt-0.5">{etape}</span>
                <p>{desc}</p>
              </div>
            ))}
          </div>
          <p className="mt-4">
            Le contrat est formé lors de la validation de la commande par le Client (double-clic conformément à l'article 1127-2 du Code civil). Z9E adresse au Client un email de confirmation récapitulant les éléments essentiels de la commande dans les meilleurs délais suivant la validation.
            <LegalRef>Art. 1127-2 Code civil</LegalRef>
          </p>
        </Section>

        {/* ── 6. Rétractation ── */}
        <Section id="retractation" title="6. Droit de rétractation">
          <p>
            Conformément aux articles L221-18 et suivants du Code de la consommation, le Client consommateur dispose d'un délai de <strong className="text-foreground">14 jours calendaires</strong> à compter de la conclusion du contrat pour exercer son droit de rétractation, sans avoir à justifier de motifs ni à payer de pénalités.
            <LegalRef>Art. L221-18 C.conso.</LegalRef>
          </p>
          <SubSection title="6.1 Exception au droit de rétractation — fourniture de contenu numérique">
            <p>
              Conformément à l'article L221-28, 13° du Code de la consommation, le droit de rétractation <strong className="text-foreground">ne peut pas être exercé</strong> pour les contrats de fourniture de contenu numérique non fourni sur un support matériel dont l'exécution a commencé après accord préalable exprès du consommateur et renoncement exprès à son droit de rétractation.
              <LegalRef>Art. L221-28 13° C.conso.</LegalRef>
            </p>
            <p>
              En conséquence, dès lors que le Client a commencé à utiliser le service de transcription (soumission d'un premier fichier à la transcription), il reconnaît expressément avoir renoncé à son droit de rétractation pour les crédits consommés. Cette renonciation est matérialisée lors du processus de commande.
            </p>
          </SubSection>
          <SubSection title="6.2 Exercice du droit de rétractation">
            <p>
              Pour exercer le droit de rétractation avant toute utilisation du service, le Client doit notifier Z9E de sa décision de rétractation au moyen du <Link href="/contact" className="text-primary hover:underline">formulaire de contact</Link> (thème « Facturation & abonnement »), en indiquant clairement sa demande de rétractation et les références de sa commande.
            </p>
            <p>
              En cas de rétractation valide, Z9E procède au remboursement de la totalité des sommes versées, déduction faite des crédits déjà consommés, dans un délai de 14 jours à compter de la réception de la notification de rétractation, par le même moyen de paiement que celui utilisé lors de la transaction initiale.
              <LegalRef>Art. L221-24 C.conso.</LegalRef>
            </p>
          </SubSection>
        </Section>

        {/* ── 7. Exécution ── */}
        <Section id="execution" title="7. Exécution du service">
          <p>
            Conformément à l'article L216-1 du Code de la consommation, Z9E s'engage à fournir le service immédiatement après la validation et la confirmation du paiement.
            <LegalRef>Art. L216-1 C.conso.</LegalRef>
          </p>
          <SubSection title="7.1 Crédits prépayés">
            <p>
              Les crédits de transcription prépayés sont crédités sur le compte du Client immédiatement après confirmation du paiement. Ils sont valables sans limitation de durée pour les plans Créateur et Agence (crédits de recharge). Pour le plan Starter, les crédits achetés sont valables sans limitation de durée.
            </p>
          </SubSection>
          <SubSection title="7.2 Abonnements mensuels">
            <p>
              Les abonnements mensuels (plans Créateur et Agence) sont souscrits pour une durée d'un mois renouvelable par tacite reconduction. Le renouvellement est automatique à la date anniversaire de la souscription. Le Client peut résilier son abonnement à tout moment depuis son espace personnel, avec effet à la fin de la période d'abonnement en cours.
            </p>
          </SubSection>
          <SubSection title="7.3 Quota de minutes et expiration">
            <p>
              Les minutes de transcription allouées dans le cadre d'un abonnement mensuel expirent à la fin de chaque période mensuelle et ne sont pas reportables sur la période suivante. Les crédits prépayés (recharges) n'expirent pas et sont reportés de mois en mois jusqu'à leur épuisement.
            </p>
          </SubSection>
        </Section>

        {/* ── 8. Obligations utilisateur ── */}
        <Section id="obligations" title="8. Obligations de l'utilisateur">
          <p>
            Le Client s'engage à utiliser le service Transcribe Express dans le respect des lois et règlements en vigueur, des droits des tiers et des présentes CGV. À ce titre, le Client s'engage notamment à :
          </p>
          <div className="space-y-2 mt-3 pl-4 border-l-2 border-primary/30">
            <p>Ne soumettre à la transcription que des fichiers dont il est l'auteur ou pour lesquels il dispose des droits nécessaires, notamment au regard du droit d'auteur (articles L111-1 et suivants du Code de la propriété intellectuelle) et du droit à l'image.</p>
            <p>Ne pas soumettre de fichiers contenant des données à caractère personnel de tiers sans leur consentement préalable, conformément au RGPD.</p>
            <p>Ne pas utiliser le service à des fins illicites, frauduleuses ou contraires à l'ordre public et aux bonnes mœurs.</p>
            <p>Ne pas tenter de contourner les mesures de sécurité du service ou d'accéder de manière non autorisée aux systèmes informatiques de Z9E.</p>
            <p>Ne pas utiliser le service pour générer, diffuser ou stocker des contenus illicites, notamment des contenus à caractère terroriste, pédopornographique, diffamatoire ou incitant à la haine.</p>
            <p>Maintenir la confidentialité de ses identifiants de connexion et notifier immédiatement Z9E de toute utilisation non autorisée de son compte.</p>
          </div>
          <p className="mt-4">
            En cas de manquement à ces obligations, Z9E se réserve le droit de suspendre ou de résilier l'accès au service sans préavis ni remboursement, et d'engager toute action judiciaire appropriée.
          </p>
        </Section>

        {/* ── 9. Responsabilité ── */}
        <Section id="responsabilite" title="9. Responsabilité">
          <SubSection title="9.1 Responsabilité de Z9E">
            <p>
              Z9E est tenu à une obligation de moyens dans la fourniture du service. La responsabilité de Z9E ne peut être engagée qu'en cas de faute prouvée. Z9E ne saurait être tenu responsable des dommages indirects, notamment la perte de données, la perte de chiffre d'affaires, ou tout préjudice commercial résultant de l'utilisation ou de l'impossibilité d'utiliser le service.
            </p>
            <p>
              La responsabilité totale de Z9E, toutes causes confondues, est limitée au montant des sommes effectivement versées par le Client au cours des 12 mois précédant le fait générateur du dommage.
            </p>
          </SubSection>
          <SubSection title="9.2 Précision de la transcription">
            <p>
              Z9E utilise des technologies d'intelligence artificielle pour la transcription. La précision des transcriptions peut varier en fonction de la qualité audio du fichier source, de la langue, des accents, du bruit de fond et d'autres facteurs techniques. Z9E ne garantit pas une précision de transcription de 100 % et ne saurait être tenu responsable des erreurs de transcription résultant de ces facteurs.
            </p>
          </SubSection>
          <SubSection title="9.3 Responsabilité du Client">
            <p>
              Le Client est seul responsable du contenu des fichiers qu'il soumet à la transcription, de l'utilisation qu'il fait des transcriptions obtenues, et du respect des droits des tiers. Le Client garantit Z9E contre tout recours, réclamation ou condamnation qui pourrait résulter du contenu des fichiers soumis ou de l'utilisation des transcriptions.
            </p>
          </SubSection>
        </Section>

        {/* ── 10. Résiliation ── */}
        <Section id="resiliation" title="10. Résiliation et suspension">
          <SubSection title="10.1 Résiliation à l'initiative du Client">
            <p>
              Le Client peut résilier son abonnement à tout moment depuis son espace personnel (section « Mon Compte » → « Mon Plan »). La résiliation prend effet à la fin de la période d'abonnement en cours. Les crédits prépayés non consommés ne sont pas remboursés en cas de résiliation volontaire, sauf exercice du droit de rétractation dans les conditions prévues à l'article 6 des présentes CGV.
            </p>
          </SubSection>
          <SubSection title="10.2 Résiliation à l'initiative de Z9E">
            <p>
              Z9E se réserve le droit de résilier l'accès au service avec un préavis de 30 jours en cas de cessation d'activité ou de modification substantielle du service. En cas de manquement grave du Client à ses obligations contractuelles, Z9E peut résilier l'accès au service sans préavis ni remboursement.
            </p>
          </SubSection>
          <SubSection title="10.3 Suppression du compte">
            <p>
              Le Client peut demander la suppression de son compte et de l'ensemble de ses données depuis son espace personnel (section « Mon Compte » → « Données » → « Zone de danger »). La suppression du compte entraîne la résiliation immédiate de tout abonnement actif et la suppression irréversible de toutes les données associées au compte, conformément à la politique de confidentialité.
            </p>
          </SubSection>
        </Section>

        {/* ── 11. Propriété intellectuelle ── */}
        <Section id="propriete" title="11. Propriété intellectuelle">
          <p>
            Le service Transcribe Express, son code source, ses interfaces, ses algorithmes et sa marque sont la propriété exclusive de Z9E et sont protégés par le Code de la propriété intellectuelle.
            <LegalRef>Art. L111-1 CPI</LegalRef>
          </p>
          <p>
            Les contenus produits par le Client dans le cadre de l'utilisation du service (fichiers audio, vidéo, textes transcrits, textes édités) demeurent la propriété exclusive du Client. Z9E ne revendique aucun droit de propriété intellectuelle sur ces contenus et s'engage à ne pas les utiliser à d'autres fins que la fourniture du service.
          </p>
          <p>
            Z9E concède au Client une licence d'utilisation non exclusive, non transférable et révocable du service, pour la durée de l'abonnement et dans les limites définies par les présentes CGV.
          </p>
        </Section>

        {/* ── 12. Données personnelles ── */}
        <Section id="donnees" title="12. Protection des données personnelles">
          <p>
            Le traitement des données à caractère personnel du Client est régi par la <Link href="/privacy" className="text-primary hover:underline">Politique de Confidentialité</Link> de Transcribe Express, qui constitue un document contractuel annexe aux présentes CGV et en fait partie intégrante.
          </p>
          <p>
            Conformément au Règlement (UE) 2016/679 (RGPD) et à la Loi n° 78-17 du 6 janvier 1978, le Client dispose de droits d'accès, de rectification, d'effacement, de portabilité et d'opposition sur ses données personnelles, exercés selon les modalités décrites dans la Politique de Confidentialité.
            <LegalRef>Art. 15-22 RGPD</LegalRef>
          </p>
        </Section>

        {/* ── 13. Garanties légales ── */}
        <Section id="garanties" title="13. Garanties légales">
          <p>
            Conformément aux articles L224-25-12 et suivants du Code de la consommation (issus de la transposition de la Directive (UE) 2019/770 relative aux contrats de fourniture de contenus numériques et de services numériques), le Client consommateur bénéficie des garanties légales suivantes :
            <LegalRef>Art. L224-25-12 C.conso. — Dir. 2019/770</LegalRef>
          </p>
          <div className="space-y-3 mt-3">
            <div className="border border-border rounded-lg p-4">
              <p className="font-semibold text-foreground text-sm mb-1">Garantie légale de conformité</p>
              <p className="text-sm">
                Z9E est tenu de fournir un service conforme au contrat et répond des défauts de conformité existant lors de la fourniture du service. En cas de défaut de conformité, le Client peut exiger la mise en conformité du service, ou, si celle-ci est impossible, une réduction du prix ou la résolution du contrat.
                <LegalRef>Art. L224-25-12 à L224-25-26 C.conso.</LegalRef>
              </p>
            </div>
            <div className="border border-border rounded-lg p-4">
              <p className="font-semibold text-foreground text-sm mb-1">Garantie contre les vices cachés</p>
              <p className="text-sm">
                Z9E est tenu de la garantie à raison des défauts cachés du service qui le rendent impropre à l'usage auquel on le destine, ou qui diminuent tellement cet usage que le Client ne l'aurait pas acquis, ou n'en aurait donné qu'un moindre prix, s'il les avait connus.
                <LegalRef>Art. 1641 Code civil</LegalRef>
              </p>
            </div>
          </div>
        </Section>

        {/* ── 14. Médiation ── */}
        <Section id="mediation" title="14. Médiation et règlement des litiges">
          <p>
            Conformément aux articles L611-1 et suivants du Code de la consommation, tout Client consommateur a le droit de recourir gratuitement à un médiateur de la consommation en vue de la résolution amiable du litige qui l'oppose à Z9E.
            <LegalRef>Art. L611-1 C.conso.</LegalRef>
          </p>
          <p>
            Avant de saisir un médiateur, le Client doit avoir préalablement tenté de résoudre le litige directement avec Z9E via le <Link href="/contact" className="text-primary hover:underline">formulaire de contact</Link>. En l'absence de réponse satisfaisante dans un délai de 2 mois, le Client peut saisir le médiateur compétent.
          </p>
          <p>
            La Commission européenne met à disposition une plateforme de règlement en ligne des litiges (RLL) accessible à l'adresse : <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ec.europa.eu/consumers/odr</a>.
          </p>
          <p>
            Pour les litiges entre professionnels, les parties s'engagent à rechercher une solution amiable avant tout recours judiciaire.
          </p>
        </Section>

        {/* ── 15. Droit applicable ── */}
        <Section id="droit" title="15. Droit applicable et juridiction compétente">
          <p>
            Les présentes CGV sont régies par le droit français. En cas de litige relatif à leur interprétation ou à leur exécution, et à défaut de résolution amiable ou par voie de médiation, les tribunaux français seront seuls compétents.
          </p>
          <p>
            Pour les litiges avec des consommateurs, la juridiction compétente est celle du domicile du consommateur ou du lieu d'exécution du service, conformément à l'article R631-3 du Code de la consommation.
            <LegalRef>Art. R631-3 C.conso.</LegalRef>
          </p>
          <p>
            Pour les litiges entre professionnels, la juridiction compétente est le Tribunal de Commerce de Paris.
          </p>
        </Section>

        {/* ── 16. Contact ── */}
        <Section id="contact" title="16. Contact">
          <p>
            Pour toute question relative aux présentes CGV, à une commande ou à l'utilisation du service, vous pouvez contacter Z9E via le <Link href="/contact" className="text-primary hover:underline">formulaire de contact</Link> disponible sur le service (thème « Facturation & abonnement » pour les questions commerciales).
          </p>
          <div className="bg-muted/30 border border-border rounded-lg p-5 mt-3">
            <p className="font-semibold text-foreground mb-2">Z9E — Transcribe Express</p>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium text-foreground">Adresse :</span> 47 rue Vivienne — 75002 Paris, France</p>
              <p><span className="font-medium text-foreground">Contact :</span> <Link href="/contact" className="text-primary hover:underline">transcribeexpress.fr/contact</Link></p>
            </div>
          </div>
        </Section>

        {/* Pied de page du document */}
        <div className="border-t border-border pt-8 mt-8 text-xs text-muted-foreground space-y-2">
          <p>
            <strong className="text-foreground">Références légales :</strong> Code de la consommation (Art. L111-1, L216-1, L221-18, L221-24, L221-28, L224-25-12, L441-10, L611-1, R631-3) — Code civil (Art. 1127-1, 1127-2, 1218, 1641) — Code de commerce (Art. L441-1, L441-10) — Code de la propriété intellectuelle (Art. L111-1, L711-1) — Règlement (UE) 2016/679 (RGPD) — Directive (UE) 2019/770 — Règlement (UE) 2019/1150 — Code général des impôts (Art. 293 B).
          </p>
          <p className="pt-2">© 2026 Z9E — Transcribe Express. Tous droits réservés. Version {VERSION} — {LAST_UPDATE}.</p>
        </div>
      </main>

      {/* Footer harmonisé */}
      <footer className="container py-8 border-t mt-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">© 2026 Transcribe Express. Tous droits réservés.</p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/guide-transcription" className="hover:text-foreground transition-colors">Guide transcription</Link>
            <Link href="/legal" className="hover:text-foreground transition-colors">Mentions légales</Link>
            <Link href="/cgv" className="hover:text-foreground transition-colors text-primary">CGV</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Confidentialité</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
