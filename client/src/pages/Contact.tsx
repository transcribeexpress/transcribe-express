/**
 * Contact.tsx — Page de contact avec formulaire à choix multiples
 *
 * Permet à l'utilisateur de contacter le support sans friction :
 * - Sélection du type de demande (bug, question, facturation, suggestion, autre)
 * - Formulaire pré-rempli avec l'email de l'utilisateur connecté
 * - Envoi via notifyOwner (notification interne)
 * - Confirmation visuelle après envoi
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Bug,
  HelpCircle,
  CreditCard,
  Lightbulb,
  MessageCircle,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  Send,
  ChevronRight,
} from "lucide-react";

// ─── Types de demande ─────────────────────────────────────────────────────────

const CONTACT_TYPES = [
  {
    id: "bug",
    icon: Bug,
    label: "Signaler un bug",
    description: "Un problème technique ou un comportement inattendu",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30 hover:border-red-500/60",
  },
  {
    id: "question",
    icon: HelpCircle,
    label: "Poser une question",
    description: "Comment utiliser une fonctionnalité ou comprendre un résultat",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30 hover:border-cyan-500/60",
  },
  {
    id: "billing",
    icon: CreditCard,
    label: "Facturation & abonnement",
    description: "Paiement, remboursement, changement de plan",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30 hover:border-amber-500/60",
  },
  {
    id: "suggestion",
    icon: Lightbulb,
    label: "Faire une suggestion",
    description: "Proposer une nouvelle fonctionnalité ou une amélioration",
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/30 hover:border-primary/60",
  },
  {
    id: "dpo",
    icon: ShieldCheck,
    label: "Données personnelles & RGPD",
    description: "Exercice de vos droits, conformité RGPD, utilisation des pixels et traceurs",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30 hover:border-emerald-500/60",
  },
  {
    id: "other",
    icon: MessageCircle,
    label: "Autre demande",
    description: "Tout autre sujet non listé ci-dessus",
    color: "text-muted-foreground",
    bg: "bg-muted/50",
    border: "border-border hover:border-muted-foreground/40",
  },
] as const;

type ContactTypeId = (typeof CONTACT_TYPES)[number]["id"];

// ─── Composant principal ──────────────────────────────────────────────────────

export default function Contact() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [step, setStep] = useState<"type" | "form" | "success">("type");
  const [selectedType, setSelectedType] = useState<ContactTypeId | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [isSending, setIsSending] = useState(false);

  const notifyOwner = trpc.system.notifyOwner.useMutation();
  const createTicket = trpc.support.create.useMutation();
  const [name, setName] = useState(user?.fullName ?? "");

  const selectedTypeData = CONTACT_TYPES.find((t) => t.id === selectedType);

  const handleSelectType = (typeId: ContactTypeId) => {
    setSelectedType(typeId);
    setStep("form");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim() || !message.trim() || !email.trim()) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    // Mapper le type de contact vers la catégorie support
    const categoryMap: Record<string, "technical" | "billing" | "account" | "feature" | "other"> = {
      bug: "technical",
      question: "other",
      billing: "billing",
      suggestion: "feature",
      dpo: "other",
      other: "other",
    };

    setIsSending(true);
    try {
      // 1. Persister le ticket en BDD
      await createTicket.mutateAsync({
        name: name || user?.fullName || "Anonyme",
        email,
        subject,
        category: categoryMap[selectedType ?? "other"] ?? "other",
        message,
      });

      // 2. Notifier l'owner en parallèle (non bloquant)
      notifyOwner.mutate({
        title: `[Contact] ${selectedTypeData?.label} — ${subject}`,
        content: `**Type :** ${selectedTypeData?.label}\n**De :** ${email || "Non connecté"}\n**Utilisateur :** ${name || (user?.fullName ?? "Anonyme")}\n\n**Sujet :** ${subject}\n\n**Message :**\n${message}`,
      });

      setStep("success");
    } catch {
      toast.error("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-4">
          <button
            onClick={() => (step === "form" ? setStep("type") : setLocation("/account"))}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {step === "form" ? "Changer de type" : "Retour au compte"}
          </button>
          <div className="h-4 w-px bg-border" />
          <span className="text-sm font-medium">Nous contacter</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">

        {/* ── Étape 1 : Choix du type ── */}
        {step === "type" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold mb-2">Comment pouvons-nous vous aider ?</h1>
              <p className="text-muted-foreground">
                Sélectionnez le type de votre demande pour nous aider à vous répondre rapidement.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {CONTACT_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <Card
                    key={type.id}
                    className={`cursor-pointer transition-all border ${type.border} group`}
                    onClick={() => handleSelectType(type.id)}
                  >
                    <CardContent className="pt-5 pb-5">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg ${type.bg} flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-5 h-5 ${type.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{type.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            {type.description}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Délai de réponse */}
            <p className="text-center text-xs text-muted-foreground mt-6">
              Délai de réponse habituel : moins de 24h en jours ouvrés
            </p>
          </motion.div>
        )}

        {/* ── Étape 2 : Formulaire ── */}
        {step === "form" && selectedTypeData && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-6">
              {/* Badge type sélectionné */}
              <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium mb-4 ${selectedTypeData.bg} ${selectedTypeData.color}`}>
                <selectedTypeData.icon className="w-3.5 h-3.5" />
                {selectedTypeData.label}
              </div>
              <h1 className="text-2xl font-bold mb-1">Décrivez votre demande</h1>
              <p className="text-muted-foreground text-sm">
                Plus votre message est précis, plus nous pourrons vous aider efficacement.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Votre message</CardTitle>
                <CardDescription>Tous les champs marqués * sont obligatoires</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      Adresse email *
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="votre@email.com"
                      required
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                    {user?.email && (
                      <p className="text-xs text-muted-foreground">
                        Pré-rempli avec votre email de compte
                      </p>
                    )}
                  </div>

                  {/* Sujet */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      Sujet *
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder={
                        selectedType === "bug" ? "Ex : L'export SRT ne fonctionne pas" :
                        selectedType === "question" ? "Ex : Comment changer la langue de transcription ?" :
                        selectedType === "billing" ? "Ex : Je souhaite obtenir un remboursement" :
                        selectedType === "suggestion" ? "Ex : Ajouter l'export DOCX" :
                        selectedType === "dpo" ? "Ex : Je souhaite exercer mon droit d'accès à mes données" :
                        "Décrivez brièvement votre demande"
                      }
                      required
                      maxLength={120}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Message */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      Message *
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={
                        selectedType === "bug"
                          ? "Décrivez le problème : que s'est-il passé ? Quelles étapes pour reproduire ? Quel navigateur utilisez-vous ?"
                          : selectedType === "dpo"
                          ? "Décrivez votre demande RGPD : droit d'accès, rectification, suppression, portabilité, opposition, question sur les pixels ou traceurs..."
                          : "Décrivez votre demande en détail..."
                      }
                      required
                      rows={6}
                      maxLength={2000}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {message.length}/2000 caractères
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-[#BE34D5] to-[#34D5BE] hover:opacity-90 text-white"
                    disabled={isSending}
                  >
                    {isSending ? (
                      <>Envoi en cours...</>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Envoyer ma demande
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── Étape 3 : Confirmation ── */}
        {step === "success" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Message envoyé !</h1>
            <p className="text-muted-foreground mb-2">
              Nous avons bien reçu votre demande et vous répondrons dans les plus brefs délais.
            </p>
            <p className="text-sm text-muted-foreground mb-8">
              Délai habituel : moins de 24h en jours ouvrés
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => { setStep("type"); setSubject(""); setMessage(""); setSelectedType(null); }}
              >
                Envoyer une autre demande
              </Button>
              <Button
                className="bg-gradient-to-r from-[#BE34D5] to-[#34D5BE] hover:opacity-90 text-white"
                onClick={() => setLocation("/account")}
              >
                Retour à mon compte
              </Button>
            </div>
          </motion.div>
        )}

      </main>
    </div>
  );
}
