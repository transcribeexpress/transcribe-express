/**
 * Privacy.tsx — Politique de Confidentialité et Protection des Données Personnelles
 *
 * Conforme au Règlement (UE) 2016/679 (RGPD) et à la Loi n° 78-17 du 6 janvier 1978
 * relative à l'informatique, aux fichiers et aux libertés (Loi Informatique et Libertés),
 * modifiée par la Loi n° 2018-493 du 20 juin 2018.
 */

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

// ─── Données de la dernière mise à jour ──────────────────────────────────────
const LAST_UPDATE = "7 août 2026";
const VERSION = "1.0";

// ─── Composants de mise en page ───────────────────────────────────────────────

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
    { id: "responsable", label: "1. Identité du responsable de traitement" },
    { id: "definitions", label: "2. Définitions" },
    { id: "donnees", label: "3. Données collectées et finalités" },
    { id: "bases", label: "4. Bases légales des traitements" },
    { id: "sous-traitants", label: "5. Sous-traitants et destinataires" },
    { id: "transferts", label: "6. Transferts hors Union européenne" },
    { id: "duree", label: "7. Durées de conservation" },
    { id: "droits", label: "8. Droits des personnes concernées" },
    { id: "cookies", label: "9. Cookies et traceurs" },
    { id: "securite", label: "10. Sécurité des données" },
    { id: "mineurs", label: "11. Protection des mineurs" },
    { id: "modifications", label: "12. Modifications de la présente politique" },
    { id: "contact", label: "13. Contact et réclamations" },
  ];
  return (
    <nav className="bg-muted/30 border border-border rounded-lg p-5 mb-10">
      <p className="text-sm font-semibold text-foreground mb-3">Sommaire</p>
      <ol className="space-y-1.5">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function Privacy() {
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

      {/* Contenu principal */}
      <main className="max-w-3xl mx-auto px-4 py-10">

        {/* En-tête du document */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 text-xs font-medium bg-primary/10 text-primary rounded-full px-3 py-1 mb-4">
            Document juridique
          </div>
          <h1 className="text-3xl font-bold mb-3">Politique de Confidentialité</h1>
          <p className="text-sm text-muted-foreground">
            Version {VERSION} — Dernière mise à jour : {LAST_UPDATE}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            La présente politique de confidentialité décrit la manière dont <strong className="text-foreground">Z9E</strong>, en sa qualité de responsable de traitement, collecte, utilise, conserve et protège les données à caractère personnel des utilisateurs du service <strong className="text-foreground">Transcribe Express</strong>, accessible à l'adresse <a href="https://transcribeexpress.fr" className="text-primary hover:underline">transcribeexpress.fr</a>.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Elle est rédigée en conformité avec le <strong className="text-foreground">Règlement (UE) 2016/679 du Parlement européen et du Conseil du 27 avril 2016</strong> relatif à la protection des personnes physiques à l'égard du traitement des données à caractère personnel (ci-après « RGPD »), ainsi qu'avec la <strong className="text-foreground">Loi n° 78-17 du 6 janvier 1978</strong> relative à l'informatique, aux fichiers et aux libertés, dans sa version modifiée.
          </p>
        </div>

        <TableOfContents />

        {/* ── 1. Responsable de traitement ── */}
        <Section id="responsable" title="1. Identité du responsable de traitement">
          <p>
            Conformément à l'article 4, paragraphe 7 du RGPD, le responsable de traitement est la personne physique ou morale qui détermine les finalités et les moyens du traitement des données à caractère personnel.
            <LegalRef>Art. 4 §7 RGPD</LegalRef>
          </p>
          <div className="bg-muted/30 border border-border rounded-lg p-5 mt-4">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                <tr className="py-2"><td className="py-2 pr-4 font-medium text-foreground w-40">Raison sociale</td><td className="py-2 text-foreground">Z9E</td></tr>
                <tr><td className="py-2 pr-4 font-medium text-foreground">Forme juridique</td><td className="py-2">Entrepreneur individuel — Micro-entreprise</td></tr>
                <tr><td className="py-2 pr-4 font-medium text-foreground">SIREN</td><td className="py-2">451 824 197</td></tr>
                <tr><td className="py-2 pr-4 font-medium text-foreground">SIRET (siège)</td><td className="py-2">451 824 197 00029</td></tr>
                <tr><td className="py-2 pr-4 font-medium text-foreground">N° TVA intracommunautaire</td><td className="py-2">FR35451824197</td></tr>
               <tr><td className="py-2 pr-4 font-medium text-foreground">N° RCS</td><td className="py-2">451 824 197 R.C.S. Paris (inscrit au greffe de Paris le 27/05/2026)</td></tr>
               <tr><td className="py-2 pr-4 font-medium text-foreground">Inscription RNE</td><td className="py-2">Inscrit</td></tr>
               <tr><td className="py-2 pr-4 font-medium text-foreground">Code APE / NAF</td><td className="py-2">62.02A — Conseil en systèmes et logiciels informatiques</td></tr>
                <tr><td className="py-2 pr-4 font-medium text-foreground">Adresse postale</td><td className="py-2">47 rue Vivienne — 75002 Paris, France</td></tr>
               <tr><td className="py-2 pr-4 font-medium text-foreground">Service</td><td className="py-2">Transcribe Express — Transcription Audio/Vidéo par IA</td></tr>
                <tr><td className="py-2 pr-4 font-medium text-foreground">Contact DPO</td><td className="py-2"><a href="mailto:dpo@transcribeexpress.fr" className="text-primary hover:underline">dpo@transcribeexpress.fr</a></td></tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4">
            En tant qu'entrepreneur individuel, le responsable de traitement est également le délégué à la protection des données (DPO) de fait. Toute demande relative à la protection des données personnelles doit être adressée à l'adresse électronique indiquée ci-dessus.
          </p>
        </Section>

        {/* ── 2. Définitions ── */}
        <Section id="definitions" title="2. Définitions">
          <p>
            Les termes employés dans la présente politique s'entendent au sens de l'article 4 du RGPD. Les définitions suivantes sont applicables :
            <LegalRef>Art. 4 RGPD</LegalRef>
          </p>
          <div className="space-y-3 mt-2">
            {[
              ["Données à caractère personnel", "Toute information se rapportant à une personne physique identifiée ou identifiable, directement ou indirectement, notamment par référence à un identifiant tel qu'un nom, un numéro d'identification, des données de localisation, un identifiant en ligne, ou à un ou plusieurs éléments spécifiques propres à son identité physique, physiologique, génétique, psychique, économique, culturelle ou sociale."],
              ["Traitement", "Toute opération ou tout ensemble d'opérations effectuées ou non à l'aide de procédés automatisés et appliquées à des données ou des ensembles de données à caractère personnel, telles que la collecte, l'enregistrement, l'organisation, la structuration, la conservation, l'adaptation ou la modification, l'extraction, la consultation, l'utilisation, la communication par transmission, la diffusion ou toute autre forme de mise à disposition, le rapprochement ou l'interconnexion, la limitation, l'effacement ou la destruction."],
              ["Responsable de traitement", "La personne physique ou morale, l'autorité publique, le service ou un autre organisme qui, seul ou conjointement avec d'autres, détermine les finalités et les moyens du traitement."],
              ["Sous-traitant", "La personne physique ou morale, l'autorité publique, le service ou un autre organisme qui traite des données à caractère personnel pour le compte du responsable du traitement."],
              ["Personne concernée", "Toute personne physique dont les données à caractère personnel font l'objet d'un traitement."],
              ["Consentement", "Toute manifestation de volonté, libre, spécifique, éclairée et univoque par laquelle la personne concernée accepte, par une déclaration ou par un acte positif clair, que des données à caractère personnel la concernant fassent l'objet d'un traitement."],
            ].map(([term, def]) => (
              <div key={term} className="pl-4 border-l-2 border-primary/30">
                <span className="font-semibold text-foreground">{term} : </span>{def}
              </div>
            ))}
          </div>
        </Section>

        {/* ── 3. Données collectées ── */}
        <Section id="donnees" title="3. Données collectées et finalités de traitement">
          <p>
            Conformément au principe de minimisation des données posé à l'article 5, paragraphe 1, point c) du RGPD, seules les données strictement nécessaires à l'accomplissement des finalités déterminées sont collectées.
            <LegalRef>Art. 5 §1 c) RGPD</LegalRef>
          </p>

          <SubSection title="3.1 Données d'identification et de compte">
            <p>
              Lors de la création d'un compte et de l'utilisation du service, les données suivantes sont collectées : nom et prénom, adresse électronique, identifiant unique de connexion (fourni par le prestataire d'authentification Clerk), méthode de connexion (OAuth), date et heure de la dernière connexion, rôle au sein du service (utilisateur ou administrateur).
            </p>
            <p>
              <strong className="text-foreground">Finalité :</strong> gestion du compte utilisateur, authentification, sécurisation de l'accès au service, prévention de la fraude.
            </p>
          </SubSection>

          <SubSection title="3.2 Données de transcription (contenu audio et vidéo)">
            <p>
              Dans le cadre de la fourniture du service principal, les fichiers audio et vidéo soumis par l'utilisateur sont temporairement traités. Les données suivantes sont conservées : nom du fichier, URL de stockage (référence Amazon S3), durée du fichier en secondes, texte transcrit, texte édité par l'utilisateur, données de segmentation horodatée (segments Whisper), statut et progression du traitement.
            </p>
            <p>
              <strong className="text-foreground">Finalité :</strong> exécution du contrat de service — fourniture de la transcription automatique, permettre à l'utilisateur d'accéder à ses résultats, d'éditer et d'exporter ses transcriptions.
            </p>
            <p className="text-xs bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 rounded p-3 mt-2">
              <strong>Attention :</strong> les fichiers audio et vidéo peuvent contenir des données sensibles (voix, conversations privées, données médicales, etc.). L'utilisateur est seul responsable du contenu qu'il soumet au traitement. Z9E ne procède à aucune analyse du contenu à des fins autres que la transcription.
            </p>
          </SubSection>

          <SubSection title="3.3 Données de facturation et d'abonnement">
            <p>
              Dans le cadre de la gestion des abonnements et des paiements, les données suivantes sont conservées : identifiant client Stripe, identifiant d'abonnement Stripe, plan souscrit, crédits de transcription disponibles, date d'expiration de l'essai gratuit, historique des recharges de crédits. Les données bancaires (numéro de carte, CVV, date d'expiration) ne sont jamais collectées ni stockées par Z9E ; elles sont traitées exclusivement par Stripe, Inc., conformément aux normes PCI-DSS.
            </p>
            <p>
              <strong className="text-foreground">Finalité :</strong> exécution du contrat, gestion de la facturation, prévention de la fraude, obligations comptables et fiscales.
            </p>
          </SubSection>

          <SubSection title="3.4 Données de support et de contact">
            <p>
              Lors de l'utilisation du formulaire de contact, les données suivantes sont collectées : nom, adresse électronique, sujet, catégorie de la demande, contenu du message, date et heure de la soumission. Ces données sont enregistrées dans la base de données du service (table supportTickets).
            </p>
            <p>
              Les demandes relatives à l'exercice des droits RGPD (type DPO) font l'objet d'un enregistrement distinct dans une table dédiée (gdprRequests) afin de garantir la traçabilité légale et le respect du délai de réponse d'un mois imposé par l'article 12, paragraphe 3 du RGPD.
              <LegalRef>Art. 12 §3 RGPD</LegalRef>
            </p>
            <p>
              <strong className="text-foreground">Finalité :</strong> traitement des demandes de support, exercice des droits des personnes concernées, amélioration du service.
            </p>
          </SubSection>

          <SubSection title="3.5 Données de navigation et d'analyse d'audience">
            <p>
              Le service utilise un outil d'analyse d'audience (Umami Analytics) qui collecte des données de navigation anonymisées : pages visitées, durée de session, type d'appareil, pays d'origine (sans géolocalisation précise). Umami est configuré sans cookies de traçage et ne collecte pas d'adresse IP complète. Ces données sont agrégées et ne permettent pas d'identifier individuellement les utilisateurs.
            </p>
            <p>
              <strong className="text-foreground">Finalité :</strong> mesure d'audience, amélioration de l'expérience utilisateur, analyse des performances du service. Base légale : intérêt légitime du responsable de traitement.
              <LegalRef>Art. 6 §1 f) RGPD</LegalRef>
            </p>
          </SubSection>

          <SubSection title="3.6 Données de préférences utilisateur">
            <p>
              Les préférences d'utilisation du service sont conservées : langue de transcription préférée, format d'export par défaut, paramètres d'interface. Ces données sont liées au compte utilisateur et ne sont pas partagées avec des tiers.
            </p>
          </SubSection>
        </Section>

        {/* ── 4. Bases légales ── */}
        <Section id="bases" title="4. Bases légales des traitements">
          <p>
            Conformément à l'article 6 du RGPD, tout traitement de données à caractère personnel doit reposer sur une base légale. Les bases légales applicables aux traitements opérés par Z9E sont les suivantes :
            <LegalRef>Art. 6 RGPD</LegalRef>
          </p>
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-semibold text-foreground">Traitement</th>
                  <th className="text-left p-3 font-semibold text-foreground">Base légale</th>
                  <th className="text-left p-3 font-semibold text-foreground">Référence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ["Création et gestion du compte", "Exécution du contrat", "Art. 6 §1 b) RGPD"],
                  ["Fourniture du service de transcription", "Exécution du contrat", "Art. 6 §1 b) RGPD"],
                  ["Gestion des paiements et abonnements", "Exécution du contrat + Obligation légale", "Art. 6 §1 b) et c) RGPD"],
                  ["Conservation des factures", "Obligation légale (Code de commerce)", "Art. 6 §1 c) RGPD — Art. L123-22 C.com."],
                  ["Traitement des demandes de support", "Intérêt légitime", "Art. 6 §1 f) RGPD"],
                  ["Traitement des demandes RGPD (DPO)", "Obligation légale", "Art. 6 §1 c) RGPD — Art. 12 à 22 RGPD"],
                  ["Analyse d'audience anonymisée", "Intérêt légitime", "Art. 6 §1 f) RGPD"],
                  ["Sécurité et prévention de la fraude", "Intérêt légitime", "Art. 6 §1 f) RGPD"],
                  ["Envoi d'emails transactionnels", "Exécution du contrat", "Art. 6 §1 b) RGPD"],
                ].map(([traitement, base, ref]) => (
                  <tr key={traitement} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3">{traitement}</td>
                    <td className="p-3">{base}</td>
                    <td className="p-3 font-mono text-xs text-primary">{ref}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ── 5. Sous-traitants ── */}
        <Section id="sous-traitants" title="5. Sous-traitants et destinataires des données">
          <p>
            Conformément à l'article 28 du RGPD, Z9E fait appel à des sous-traitants pour la fourniture du service. Chaque sous-traitant est lié par un contrat garantissant un niveau de protection équivalent à celui imposé par le RGPD.
            <LegalRef>Art. 28 RGPD</LegalRef>
          </p>
          <p>
            Les données à caractère personnel ne sont jamais vendues, louées ou cédées à des tiers à des fins commerciales ou publicitaires.
          </p>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-semibold text-foreground">Prestataire</th>
                  <th className="text-left p-3 font-semibold text-foreground">Rôle</th>
                  <th className="text-left p-3 font-semibold text-foreground">Données traitées</th>
                  <th className="text-left p-3 font-semibold text-foreground">Localisation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ["Clerk, Inc.", "Authentification et gestion des identités", "Identifiant, email, méthode de connexion", "États-Unis (DPF certifié)"],
                  ["Amazon Web Services (AWS S3)", "Stockage des fichiers audio/vidéo et des transcriptions", "Fichiers audio/vidéo, textes transcrits", "Union européenne (région eu-west)"],
                  ["Manus (Forge API)", "Moteur de transcription IA (Whisper)", "Fichiers audio/vidéo soumis à transcription", "Infrastructure Manus"],
                  ["Stripe, Inc.", "Traitement des paiements et gestion des abonnements", "Identifiant client, données de paiement (PCI-DSS)", "États-Unis (DPF certifié)"],
                  ["Brevo SAS (anciennement Sendinblue)", "Envoi d'emails transactionnels", "Adresse email, nom, contenu du message", "France / Union européenne"],
                  ["TiDB Cloud (PingCAP)", "Base de données relationnelle", "Ensemble des données structurées", "Union européenne"],
                  ["Umami Analytics", "Analyse d'audience anonymisée", "Données de navigation anonymisées (sans IP)", "Hébergé par Manus"],
                  ["O2switch", "Hébergement des boîtes email @transcribeexpress.fr", "Emails reçus sur les adresses de contact", "France"],
                ].map(([prestataire, role, donnees, localisation]) => (
                  <tr key={prestataire} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3 font-medium text-foreground">{prestataire}</td>
                    <td className="p-3">{role}</td>
                    <td className="p-3">{donnees}</td>
                    <td className="p-3">{localisation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ── 6. Transferts hors UE ── */}
        <Section id="transferts" title="6. Transferts de données hors de l'Union européenne">
          <p>
            Certains sous-traitants (Clerk, Inc. et Stripe, Inc.) sont établis aux États-Unis. Ces transferts sont encadrés conformément au chapitre V du RGPD.
            <LegalRef>Chap. V RGPD — Art. 44 à 49</LegalRef>
          </p>
          <p>
            Depuis le 10 juillet 2023, la Commission européenne a adopté une décision d'adéquation reconnaissant que les États-Unis assurent un niveau de protection adéquat pour les données personnelles transférées dans le cadre du <strong className="text-foreground">Cadre de Protection des Données UE-États-Unis (Data Privacy Framework, DPF)</strong>, conformément à l'article 45 du RGPD.
            <LegalRef>Décision d'adéquation 2023/1795 — Art. 45 RGPD</LegalRef>
          </p>
          <p>
            Clerk, Inc. et Stripe, Inc. sont certifiés au titre du DPF. En cas d'invalidation de ce mécanisme, Z9E s'engage à mettre en œuvre des clauses contractuelles types adoptées par la Commission européenne conformément à l'article 46, paragraphe 2, point c) du RGPD.
            <LegalRef>Art. 46 §2 c) RGPD</LegalRef>
          </p>
          <p>
            Les données stockées sur Amazon Web Services sont hébergées dans des régions situées au sein de l'Union européenne et ne font pas l'objet d'un transfert hors UE.
          </p>
        </Section>

        {/* ── 7. Durées de conservation ── */}
        <Section id="duree" title="7. Durées de conservation des données">
          <p>
            Conformément au principe de limitation de la conservation posé à l'article 5, paragraphe 1, point e) du RGPD, les données à caractère personnel ne sont conservées que pour la durée nécessaire aux finalités pour lesquelles elles ont été collectées.
            <LegalRef>Art. 5 §1 e) RGPD</LegalRef>
          </p>
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-semibold text-foreground">Catégorie de données</th>
                  <th className="text-left p-3 font-semibold text-foreground">Durée de conservation</th>
                  <th className="text-left p-3 font-semibold text-foreground">Fondement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ["Données de compte utilisateur", "Durée de la relation contractuelle + 3 ans après la dernière connexion", "Art. 5 §1 e) RGPD"],
                  ["Fichiers audio/vidéo soumis", "Durée du traitement + suppression après export ou demande de l'utilisateur", "Principe de minimisation"],
                  ["Transcriptions et résultats", "Durée de la relation contractuelle ou jusqu'à suppression par l'utilisateur", "Exécution du contrat"],
                  ["Données de facturation et factures", "10 ans à compter de la clôture de l'exercice comptable", "Art. L123-22 Code de commerce"],
                  ["Données de paiement Stripe", "Durée de l'abonnement + 13 mois (délai de rétrofacturation)", "Normes PCI-DSS"],
                  ["Tickets de support", "3 ans à compter de la clôture du ticket", "Prescription de droit commun — Art. 2224 Code civil"],
                  ["Demandes RGPD (gdprRequests)", "5 ans à compter de la réponse apportée", "Recommandation CNIL — Art. 12 §3 RGPD"],
                  ["Données de navigation anonymisées", "13 mois glissants", "Recommandation CNIL (délibération 2020-091)"],
                  ["Logs de sécurité", "12 mois", "Recommandation CNIL"],
                ].map(([cat, duree, fondement]) => (
                  <tr key={cat} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3">{cat}</td>
                    <td className="p-3">{duree}</td>
                    <td className="p-3 font-mono text-xs text-primary">{fondement}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4">
            À l'expiration des délais de conservation, les données sont soit supprimées de manière sécurisée, soit anonymisées de façon irréversible conformément aux lignes directrices du Groupe de travail Article 29 (WP29) sur les techniques d'anonymisation.
          </p>
        </Section>

        {/* ── 8. Droits des personnes ── */}
        <Section id="droits" title="8. Droits des personnes concernées">
          <p>
            Conformément aux articles 15 à 22 du RGPD et aux articles 49 à 53 de la Loi Informatique et Libertés, toute personne concernée dispose des droits suivants à l'égard de ses données à caractère personnel :
            <LegalRef>Art. 15-22 RGPD — Art. 49-53 LIL</LegalRef>
          </p>

          <div className="space-y-4 mt-3">
            {[
              {
                droit: "Droit d'accès",
                ref: "Art. 15 RGPD",
                desc: "Obtenir la confirmation que des données vous concernant sont traitées, ainsi qu'une copie de ces données et des informations relatives au traitement (finalités, catégories, destinataires, durée de conservation, droits disponibles).",
              },
              {
                droit: "Droit de rectification",
                ref: "Art. 16 RGPD",
                desc: "Obtenir la rectification des données inexactes vous concernant et le complètement des données incomplètes.",
              },
              {
                droit: "Droit à l'effacement (« droit à l'oubli »)",
                ref: "Art. 17 RGPD",
                desc: "Obtenir l'effacement de vos données dans les cas prévus par le RGPD, notamment lorsque les données ne sont plus nécessaires au regard des finalités pour lesquelles elles ont été collectées, ou lorsque vous retirez votre consentement.",
              },
              {
                droit: "Droit à la limitation du traitement",
                ref: "Art. 18 RGPD",
                desc: "Obtenir la limitation du traitement de vos données dans certains cas, notamment lorsque vous contestez l'exactitude des données ou vous opposez au traitement.",
              },
              {
                droit: "Droit à la portabilité",
                ref: "Art. 20 RGPD",
                desc: "Recevoir vos données dans un format structuré, couramment utilisé et lisible par machine, et les transmettre à un autre responsable de traitement, lorsque le traitement est fondé sur le consentement ou sur un contrat et est effectué par des procédés automatisés.",
              },
              {
                droit: "Droit d'opposition",
                ref: "Art. 21 RGPD",
                desc: "Vous opposer à tout moment, pour des raisons tenant à votre situation particulière, au traitement de vos données fondé sur l'intérêt légitime du responsable de traitement. En cas d'opposition, le responsable de traitement doit démontrer qu'il existe des motifs légitimes et impérieux pour poursuivre le traitement.",
              },
              {
                droit: "Droit de ne pas faire l'objet d'une décision automatisée",
                ref: "Art. 22 RGPD",
                desc: "Ne pas faire l'objet d'une décision fondée exclusivement sur un traitement automatisé, y compris le profilage, produisant des effets juridiques vous concernant ou vous affectant de manière significative. Transcribe Express ne procède à aucun profilage automatisé à des fins de décision individuelle.",
              },
              {
                droit: "Droit de définir des directives post-mortem",
                ref: "Art. 40-1 LIL",
                desc: "Définir des directives relatives à la conservation, à l'effacement et à la communication de vos données à caractère personnel après votre décès, conformément à l'article 40-1 de la Loi Informatique et Libertés.",
              },
            ].map(({ droit, ref, desc }) => (
              <div key={droit} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-foreground text-sm">{droit}</span>
                  <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">{ref}</span>
                </div>
                <p className="text-sm">{desc}</p>
              </div>
            ))}
          </div>

          <SubSection title="8.1 Modalités d'exercice des droits">
            <p>
              Pour exercer l'un de ces droits, vous pouvez adresser votre demande par voie électronique à l'adresse <a href="mailto:dpo@transcribeexpress.fr" className="text-primary hover:underline">dpo@transcribeexpress.fr</a>, ou directement depuis votre espace personnel (section « Compte » → « Données personnelles »).
            </p>
            <p>
              Conformément à l'article 12, paragraphe 3 du RGPD, Z9E s'engage à répondre à toute demande dans un délai d'un mois à compter de la réception de la demande. Ce délai peut être prolongé de deux mois supplémentaires en cas de demande complexe ou nombreuse, sous réserve d'en informer la personne concernée dans le délai d'un mois.
              <LegalRef>Art. 12 §3 RGPD</LegalRef>
            </p>
            <p>
              Lorsque des doutes raisonnables subsistent quant à l'identité du demandeur, Z9E peut demander la fourniture d'informations supplémentaires nécessaires pour confirmer l'identité de la personne concernée, conformément à l'article 12, paragraphe 6 du RGPD.
              <LegalRef>Art. 12 §6 RGPD</LegalRef>
            </p>
          </SubSection>

          <SubSection title="8.2 Droit d'introduire une réclamation auprès de la CNIL">
            <p>
              Conformément à l'article 77 du RGPD et à l'article 49 de la Loi Informatique et Libertés, toute personne concernée a le droit d'introduire une réclamation auprès de l'autorité de contrôle compétente, en France la <strong className="text-foreground">Commission Nationale de l'Informatique et des Libertés (CNIL)</strong>, si elle estime que le traitement de ses données à caractère personnel constitue une violation du RGPD.
              <LegalRef>Art. 77 RGPD — Art. 49 LIL</LegalRef>
            </p>
            <div className="bg-muted/30 border border-border rounded p-3 text-sm mt-2">
              <p className="font-medium text-foreground">CNIL — Commission Nationale de l'Informatique et des Libertés</p>
              <p>3 Place de Fontenoy — TSA 80715 — 75334 Paris Cedex 07</p>
              <p>Téléphone : +33 (0)1 53 73 22 22</p>
              <p>Site : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.cnil.fr</a></p>
            </div>
          </SubSection>
        </Section>

        {/* ── 9. Cookies ── */}
        <Section id="cookies" title="9. Cookies et traceurs">
          <p>
            Conformément à l'article 82 de la Loi Informatique et Libertés et aux lignes directrices de la CNIL relatives aux cookies et autres traceurs (délibération n° 2020-091 du 17 septembre 2020), la présente section informe les utilisateurs de l'utilisation des cookies et traceurs sur le service Transcribe Express.
            <LegalRef>Art. 82 LIL — Délibération CNIL 2020-091</LegalRef>
          </p>

          <SubSection title="9.1 Cookies strictement nécessaires (exemptés de consentement)">
            <p>
              Les cookies suivants sont strictement nécessaires au fonctionnement du service et sont exemptés de consentement préalable conformément à l'article 82 de la Loi Informatique et Libertés :
            </p>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-semibold text-foreground">Cookie</th>
                    <th className="text-left p-3 font-semibold text-foreground">Finalité</th>
                    <th className="text-left p-3 font-semibold text-foreground">Durée</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    ["session_token", "Maintien de la session authentifiée (JWT signé)", "Session (fermeture du navigateur)"],
                    ["__clerk_*", "Gestion de l'authentification Clerk (OAuth)", "Session / 30 jours"],
                    ["__stripe_*", "Prévention de la fraude lors du paiement (Stripe)", "Session"],
                  ].map(([nom, finalite, duree]) => (
                    <tr key={nom} className="hover:bg-muted/20">
                      <td className="p-3 font-mono text-xs">{nom}</td>
                      <td className="p-3">{finalite}</td>
                      <td className="p-3">{duree}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SubSection>

          <SubSection title="9.2 Traceurs d'analyse (sans cookies)">
            <p>
              Le service utilise Umami Analytics, un outil d'analyse d'audience qui ne dépose pas de cookies et ne collecte pas d'adresse IP complète. Les données collectées sont anonymisées et ne permettent pas d'identifier individuellement les utilisateurs. Ce traceur est exempt de consentement préalable conformément aux lignes directrices de la CNIL sur les cookies (délibération n° 2020-091).
              <LegalRef>Délibération CNIL 2020-091 — §3.3</LegalRef>
            </p>
          </SubSection>

          <SubSection title="9.3 Gestion des cookies">
            <p>
              Vous pouvez à tout moment configurer votre navigateur pour refuser les cookies ou être alerté lorsqu'un cookie est déposé. La désactivation des cookies strictement nécessaires peut altérer le fonctionnement du service. Les paramètres de gestion des cookies varient selon les navigateurs ; vous pouvez consulter les instructions de votre navigateur pour les modifier.
            </p>
          </SubSection>
        </Section>

        {/* ── 10. Sécurité ── */}
        <Section id="securite" title="10. Sécurité des données">
          <p>
            Conformément à l'article 32 du RGPD, Z9E met en œuvre les mesures techniques et organisationnelles appropriées pour garantir un niveau de sécurité adapté au risque présenté par les traitements.
            <LegalRef>Art. 32 RGPD</LegalRef>
          </p>
          <p>
            Les mesures de sécurité mises en œuvre comprennent notamment : le chiffrement des données en transit (protocole TLS/HTTPS), le chiffrement des données au repos (AWS S3 SSE), l'authentification forte des utilisateurs (OAuth 2.0 via Clerk), la gestion des accès par rôles (RBAC), la signature cryptographique des cookies de session (JWT), la validation des webhooks Stripe par signature HMAC, et la journalisation des accès et des événements de sécurité.
          </p>
          <p>
            En cas de violation de données à caractère personnel susceptible d'engendrer un risque pour les droits et libertés des personnes physiques, Z9E s'engage à notifier la CNIL dans les 72 heures suivant la prise de connaissance de la violation, conformément à l'article 33 du RGPD. Si la violation est susceptible d'engendrer un risque élevé, les personnes concernées seront informées dans les meilleurs délais, conformément à l'article 34 du RGPD.
            <LegalRef>Art. 33-34 RGPD</LegalRef>
          </p>
        </Section>

        {/* ── 11. Mineurs ── */}
        <Section id="mineurs" title="11. Protection des mineurs">
          <p>
            Le service Transcribe Express est destiné à des personnes physiques majeures (âgées d'au moins 18 ans) ou à des personnes morales. Conformément à l'article 8 du RGPD et à l'article 45 de la Loi Informatique et Libertés, le traitement des données à caractère personnel d'un mineur de moins de 15 ans est subordonné au consentement conjoint du mineur et du titulaire de l'autorité parentale.
            <LegalRef>Art. 8 RGPD — Art. 45 LIL</LegalRef>
          </p>
          <p>
            Z9E ne collecte pas sciemment de données personnelles de mineurs de moins de 15 ans. Si Z9E venait à prendre connaissance qu'un mineur de moins de 15 ans a fourni des données personnelles sans le consentement parental requis, ces données seront supprimées dans les meilleurs délais. Toute signalement peut être adressé à <a href="mailto:dpo@transcribeexpress.fr" className="text-primary hover:underline">dpo@transcribeexpress.fr</a>.
          </p>
        </Section>

        {/* ── 12. Modifications ── */}
        <Section id="modifications" title="12. Modifications de la présente politique">
          <p>
            Z9E se réserve le droit de modifier la présente politique de confidentialité à tout moment, notamment pour se conformer à toute évolution législative, réglementaire, jurisprudentielle ou technique. La version en vigueur est celle accessible en permanence à l'adresse <a href="/privacy" className="text-primary hover:underline">transcribeexpress.fr/privacy</a>.
          </p>
          <p>
            En cas de modification substantielle affectant les droits des personnes concernées, Z9E s'engage à en informer les utilisateurs par voie électronique (email) ou par une notification visible lors de la connexion au service, avec un préavis raisonnable avant l'entrée en vigueur des modifications.
          </p>
          <p>
            La poursuite de l'utilisation du service après notification des modifications vaut acceptation de la politique de confidentialité mise à jour. Si vous n'acceptez pas les modifications, vous pouvez exercer votre droit à l'effacement conformément à l'article 17 du RGPD.
            <LegalRef>Art. 17 RGPD</LegalRef>
          </p>
        </Section>

        {/* ── 13. Contact ── */}
        <Section id="contact" title="13. Contact et réclamations">
          <p>
            Pour toute question relative à la présente politique de confidentialité ou à l'exercice de vos droits, vous pouvez contacter le responsable de traitement :
          </p>
          <div className="bg-muted/30 border border-border rounded-lg p-5 mt-3">
            <p className="font-semibold text-foreground mb-3">Z9E — Responsable de traitement / DPO</p>
           <div className="space-y-2 text-sm">
             <p><span className="font-medium text-foreground">Email :</span> <a href="mailto:dpo@transcribeexpress.fr" className="text-primary hover:underline">dpo@transcribeexpress.fr</a></p>
              <p><span className="font-medium text-foreground">Formulaire en ligne :</span> <Link href="/contact" className="text-primary hover:underline">transcribeexpress.fr/contact</Link> (thème « Données personnelles & RGPD »)</p>
           </div>
         </div>
          <div className="bg-muted/30 border border-border rounded-lg p-5 mt-3">
            <p className="font-semibold text-foreground mb-3">Adresse postale</p>
            <div className="space-y-1 text-sm">
              <p>Z9E</p>
              <p>47 rue Vivienne</p>
              <p>75002 Paris, France</p>
            </div>
          </div>
         <p className="mt-4">
            Si vous estimez, après avoir contacté Z9E, que vos droits ne sont pas respectés, vous avez le droit d'introduire une réclamation auprès de la <strong className="text-foreground">CNIL</strong> (Commission Nationale de l'Informatique et des Libertés) conformément à l'article 77 du RGPD.
            <LegalRef>Art. 77 RGPD</LegalRef>
          </p>
        </Section>

        {/* Pied de page du document */}
        <div className="border-t border-border pt-8 mt-8 text-xs text-muted-foreground space-y-2">
          <p>
            <strong className="text-foreground">Références légales :</strong> Règlement (UE) 2016/679 du Parlement européen et du Conseil du 27 avril 2016 (RGPD) — Loi n° 78-17 du 6 janvier 1978 relative à l'informatique, aux fichiers et aux libertés (LIL), modifiée par la Loi n° 2018-493 du 20 juin 2018 — Décision d'adéquation UE-États-Unis 2023/1795 du 10 juillet 2023 — Délibération CNIL n° 2020-091 du 17 septembre 2020 — Code de commerce (Art. L123-22) — Code civil (Art. 2224).
          </p>
          <p>
            Document rédigé conformément aux exigences de l'article 13 du RGPD (information lors de la collecte des données) et de l'article 14 du RGPD (information lorsque les données ne sont pas collectées directement auprès de la personne concernée).
            <LegalRef>Art. 13-14 RGPD</LegalRef>
          </p>
          <p className="pt-2">© 2026 Z9E — Transcribe Express. Tous droits réservés. Version {VERSION} — {LAST_UPDATE}.</p>
        </div>
      </main>

      {/* Footer harmonisé */}
      <footer className="container py-8 border-t mt-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">© 2026 Transcribe Express. Tous droits réservés.</p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Conditions</a>
            <Link href="/privacy" className="hover:text-foreground transition-colors text-primary">Confidentialité</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
