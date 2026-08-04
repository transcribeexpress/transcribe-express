/**
 * Page Account — Gestion de compte unifiée
 * 
 * Architecture par onglets :
 * - Mon Plan (Thème 1 + 2 + 3) : Vue synthétique, abonnement, crédits
 * - Facturation (Thème 4) : Portail Stripe
 * - Profil (Thème 5) : Identité
 * - Sécurité (Thème 6) : Sessions, 2FA
 * - Préférences (Thème 7) : Langue, format, notifications
 * - Données (Thème 8) : RGPD, export, suppression
 */

import { useState, useMemo, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useClerkSync } from "@/hooks/useClerkSync";
import { UserMenu } from "@/components/UserMenu";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { toast } from "sonner";
import {
  ArrowLeft,
  CreditCard,
  Crown,
  Zap,
  Clock,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  User,
  Shield,
  Settings,
  Database,
  Receipt,
  ExternalLink,
  LogOut,
  MessageCircle,
} from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028820418/oRqyQWHwreNEuW2rCuPNoU/neon_symbol_transparent_9075d38e.png";
const WORDMARK_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028820418/oRqyQWHwreNEuW2rCuPNoU/wordmark-transparent_d2755219.webp";

/** Mapping des plans vers leurs labels et couleurs */
const PLAN_CONFIG = {
  free: { label: "Gratuit", icon: Sparkles, color: "bg-muted text-muted-foreground", maxMinutes: 30 },
  starter: { label: "Starter", icon: Zap, color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30", maxMinutes: 333 },
  creator: { label: "Créateur", icon: Crown, color: "bg-primary/10 text-primary border-primary/30", maxMinutes: 300 },
  agency: { label: "Agence", icon: TrendingUp, color: "bg-amber-500/10 text-amber-400 border-amber-500/30", maxMinutes: 1500 },
} as const;

/** Grilles de recharge par plan (importé depuis products.ts côté client) */
const RECHARGE_GRIDS = {
  free: [
    { priceId: "price_1TwxK69hT559d2yxU5n0lW76", price: "5€", minutes: 33 },
    { priceId: "price_1TwxNS9hT559d2yxuigu3kT9", price: "10€", minutes: 66 },
    { priceId: "price_1TwxOI9hT559d2yxu7FzUjXg", price: "20€", minutes: 133 },
    { priceId: "price_1TwxPX9hT559d2yxIU58yFrN", price: "50€", minutes: 333 },
  ],
  starter: [
    { priceId: "price_1TwxK69hT559d2yxU5n0lW76", price: "5€", minutes: 33 },
    { priceId: "price_1TwxNS9hT559d2yxuigu3kT9", price: "10€", minutes: 66 },
    { priceId: "price_1TwxOI9hT559d2yxu7FzUjXg", price: "20€", minutes: 133 },
    { priceId: "price_1TwxPX9hT559d2yxIU58yFrN", price: "50€", minutes: 333 },
  ],
  creator: [
    { priceId: "price_1U0Do1KGW1kSnF8G6eJmeOYY", price: "5€", minutes: 42 },
    { priceId: "price_1U0Do2KGW1kSnF8GTXImvQ1h", price: "10€", minutes: 83 },
    { priceId: "price_1U0Do2KGW1kSnF8GiyDDjFlO", price: "20€", minutes: 167 },
    { priceId: "price_1U0Do2KGW1kSnF8Gmn5OjD95", price: "50€", minutes: 417 },
  ],
  agency: [
    { priceId: "price_1U0Do3KGW1kSnF8GW7cLPN2Q", price: "5€", minutes: 63 },
    { priceId: "price_1U0Do3KGW1kSnF8GXd3g6W17", price: "10€", minutes: 125 },
    { priceId: "price_1U0Do3KGW1kSnF8GkOhwTeRm", price: "20€", minutes: 250 },
    { priceId: "price_1U0Do4KGW1kSnF8GIoNp28Ve", price: "50€", minutes: 625 },
  ],
} as const;

export default function Account() {
  const { user, isSignedIn, isLoading } = useAuth();
  const { isSessionReady, isSyncing, error: syncError } = useClerkSync();
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const urlTab = new URLSearchParams(searchParams).get("tab");
  const [activeTab, setActiveTab] = useState(urlTab || "plan");

  // Synchroniser l'onglet actif avec le paramètre URL
  useEffect(() => {
    if (urlTab && ["plan", "billing", "profile", "security", "preferences", "data"].includes(urlTab)) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  // Données du plan et de l'abonnement
  const { data: planData, isLoading: planLoading } = trpc.stripe.getUserPlan.useQuery(
    undefined,
    { enabled: isSessionReady }
  );
  const { data: subscription, isLoading: subLoading } = trpc.stripe.getSubscription.useQuery(
    undefined,
    { enabled: isSessionReady }
  );

  // Mutations
  const createPortalSession = trpc.stripe.createPortalSession.useMutation({
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (error) => {
      toast.error(error.message || "Impossible d'ouvrir le portail de facturation");
    },
  });

  const createCheckoutSession = trpc.stripe.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (error) => {
      toast.error(error.message || "Impossible de créer la session de paiement");
    },
  });

  // Calculs dérivés
  const plan = planData?.plan || "free";
  const creditsMinutes = planData?.creditsMinutes || 0;
  const isTrialActive = planData?.isTrialActive || false;
  const hasStripeAccount = planData?.hasStripeAccount || false;
  const planConfig = PLAN_CONFIG[plan as keyof typeof PLAN_CONFIG] || PLAN_CONFIG.free;

  // Pourcentage de crédits restants
  const creditsPercentage = useMemo(() => {
    const max = planConfig.maxMinutes as number;
    if (max <= 0) return 0;
    return Math.min(100, Math.round((creditsMinutes / max) * 100));
  }, [creditsMinutes, planConfig.maxMinutes]);

  // Alerte crédits faibles (< 20%)
  const isLowCredits = creditsPercentage < 20 && creditsMinutes > 0;
  const isNoCredits = creditsMinutes === 0;

  // Formatage des minutes en heures:minutes
  const formatMinutes = (mins: number) => {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    if (hours === 0) return `${minutes} min`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}min`;
  };

  // Date de renouvellement formatée
  const renewalDate = useMemo(() => {
    if (!subscription?.currentPeriodEnd) return null;
    return new Date(subscription.currentPeriodEnd).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [subscription?.currentPeriodEnd]);

  // --- États de chargement et d'erreur ---
  if (isLoading || isSyncing) {
    return <DashboardSkeleton />;
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <img src={LOGO_URL} alt="Transcribe Express" className="w-12 h-12 mx-auto" />
          <h2 className="text-xl font-semibold">Connexion requise</h2>
          <p className="text-muted-foreground">Veuillez vous connecter pour accéder à votre compte.</p>
          <Button onClick={() => setLocation("/login")}>Se connecter</Button>
        </div>
      </div>
    );
  }

  if (syncError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <img src={LOGO_URL} alt="Transcribe Express" className="w-12 h-12 mx-auto" />
          <h2 className="text-xl font-semibold">Erreur de connexion</h2>
          <p className="text-muted-foreground">Impossible de synchroniser votre session. Veuillez réessayer.</p>
          <Button onClick={() => window.location.reload()}>Réessayer</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="Transcribe Express Logo" className="w-8 h-8 sm:w-10 sm:h-10 object-contain flex-shrink-0" style={{ mixBlendMode: 'screen' }} />
            <img src={WORDMARK_URL} alt="Transcribe Express" className="h-8 sm:h-10 md:h-12 w-auto max-w-[120px] sm:max-w-[160px] md:max-w-[200px] object-contain" />
          </div>
          <UserMenu />
        </div>
      </header>

      {/* Main Content */}
      <motion.main
        className="container py-8 max-w-5xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          className="mb-6 gap-2"
          onClick={() => setLocation("/dashboard")}
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au dashboard
        </Button>

        {/* Page Title */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h1 className="text-3xl font-bold tracking-tight">Mon Compte</h1>
          <p className="text-muted-foreground mt-1">
            Gérez votre abonnement, vos crédits et vos préférences
          </p>
        </motion.div>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto gap-1 p-1 mb-8">
            <TabsTrigger value="plan" className="gap-1.5">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Mon Plan</span>
              <span className="sm:hidden">Plan</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-1.5">
              <Receipt className="w-4 h-4" />
              <span className="hidden sm:inline">Facturation</span>
              <span className="sm:hidden">Factures</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-1.5">
              <User className="w-4 h-4" />
              Profil
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5">
              <Shield className="w-4 h-4" />
              Sécurité
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-1.5">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Paramètres</span>
              <span className="sm:hidden">Params</span>
            </TabsTrigger>
            <TabsTrigger value="data" className="gap-1.5">
              <Database className="w-4 h-4" />
              Données
            </TabsTrigger>
          </TabsList>

          {/* ===== ONGLET MON PLAN (Thème 1 + 2 + 3) ===== */}
          <TabsContent value="plan">
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Card Plan Actif */}
              <Card className="border-primary/20">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <planConfig.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">Mon Plan</CardTitle>
                        <CardDescription>
                          {plan === "free" && isTrialActive && "Essai gratuit actif"}
                          {plan === "free" && !isTrialActive && "Essai gratuit expiré"}
                          {plan === "starter" && "Recharges à la demande"}
                          {plan === "creator" && "Abonnement mensuel"}
                          {plan === "agency" && "Abonnement professionnel"}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-sm px-3 py-1 ${planConfig.color}`}>
                      {planConfig.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Crédits restants */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Crédits restants</span>
                      <span className="text-sm font-semibold">
                        {formatMinutes(creditsMinutes)} / {formatMinutes(planConfig.maxMinutes)}
                      </span>
                    </div>
                    <Progress
                      value={creditsPercentage}
                      className={`h-3 ${isNoCredits ? "[&>[data-slot=progress-indicator]]:bg-destructive" : isLowCredits ? "[&>[data-slot=progress-indicator]]:bg-amber-500" : ""}`}
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>≈ {Math.round(creditsMinutes / 5)} fichiers de 5 min</span>
                      <span>{creditsPercentage}% utilisé</span>
                    </div>
                  </div>

                  {/* Alertes proactives */}
                  {isNoCredits && (
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                      <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-destructive">Crédits épuisés</p>
                        <p className="text-xs text-destructive/80 mt-1">
                          Vous ne pouvez plus effectuer de transcriptions. Rechargez vos crédits ou passez à un plan supérieur.
                        </p>
                      </div>
                    </div>
                  )}

                  {isLowCredits && !isNoCredits && (
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-400">Crédits faibles</p>
                        <p className="text-xs text-amber-400/80 mt-1">
                          Il vous reste moins de 20% de vos crédits. Pensez à recharger pour éviter toute interruption.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Date de renouvellement (abonnements) */}
                  {renewalDate && (plan === "creator" || plan === "agency") && (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border">
                      <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Prochain renouvellement</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {renewalDate} — vos crédits seront réinitialisés automatiquement
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Essai gratuit */}
                  {plan === "free" && isTrialActive && (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <Sparkles className="w-5 h-5 text-primary flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Essai gratuit</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Profitez de 30 minutes de transcription gratuites pour découvrir le service.
                        </p>
                      </div>
                    </div>
                  )}

                  {plan === "free" && !isTrialActive && (
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                      <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-destructive">Essai expiré</p>
                        <p className="text-xs text-destructive/80 mt-1">
                          Votre période d'essai est terminée. Choisissez un plan pour continuer à transcrire.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actions rapides */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Upgrade / Gérer l'abonnement */}
                {(plan === "free" || plan === "starter") && (
                  <Card className="hover:border-primary/40 transition-colors cursor-pointer" onClick={() => setLocation("/pricing")}>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">Passer à un plan supérieur</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {plan === "free" ? "Débloquez plus de minutes" : "Passez au Créateur ou Agence"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Portail Stripe (gérer abonnement) */}
                {hasStripeAccount && (
                  <Card
                    className="hover:border-primary/40 transition-colors cursor-pointer"
                    onClick={() => createPortalSession.mutate()}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                          <p className="font-medium">Gérer mon abonnement</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Modifier, annuler ou mettre à jour votre moyen de paiement
                          </p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground ml-auto" />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Encart Contact — remplacement du bouton recharge redondant */}
                <Card className="hover:border-primary/40 transition-colors cursor-pointer" onClick={() => setLocation("/contact")}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Nous contacter</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Question, bug, facturation — réponse rapide garantie
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recharges rapides — disponibles pour tous les plans */}
              {["free", "starter", "creator", "agency"].includes(plan) && (() => {
                const rechargeGrid = RECHARGE_GRIDS[plan as keyof typeof RECHARGE_GRIDS];
                const isPreferred = plan === "creator" || plan === "agency";
                const accentColor = plan === "agency" ? "amber" : "cyan";
                const accentClasses = plan === "agency"
                  ? { icon: "bg-amber-500/10", iconColor: "text-amber-400", hover: "hover:border-amber-500/50 hover:bg-amber-500/5", text: "group-hover:text-amber-400" }
                  : { icon: "bg-cyan-500/10", iconColor: "text-cyan-400", hover: "hover:border-cyan-500/50 hover:bg-cyan-500/5", text: "group-hover:text-cyan-400" };
                return (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${accentClasses.icon} flex items-center justify-center`}>
                          <Zap className={`w-5 h-5 ${accentClasses.iconColor}`} />
                        </div>
                        <div>
                          <CardTitle className="text-base">Recharger mes crédits</CardTitle>
                          <CardDescription>
                            {isPreferred
                              ? `Tarif préférentiel ${plan === "creator" ? "0,12€/min" : "0,08€/min"} — réservé aux abonnés ${plan === "creator" ? "Créateur" : "Agence"}`
                              : "Crédits ajoutés instantanément après paiement"}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {rechargeGrid.map((option) => (
                          <button
                            key={option.priceId}
                            onClick={() => createCheckoutSession.mutate({ priceId: option.priceId })}
                            disabled={createCheckoutSession.isPending}
                            className={`flex flex-col items-center gap-1.5 p-4 rounded-lg border border-border ${accentClasses.hover} transition-all group disabled:opacity-50`}
                          >
                            <span className={`text-lg font-bold text-foreground ${accentClasses.text} transition-colors`}>{option.price}</span>
                            <span className="text-xs text-muted-foreground">≈ {option.minutes} min</span>
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-3 text-center">
                        Paiement sécurisé par Stripe — crédits sans expiration
                      </p>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Avantages du plan */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Avantages de votre plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <PlanBenefits plan={plan} />
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* ===== ONGLET FACTURATION (Thème 4) ===== */}
          <TabsContent value="billing">
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Facturation</CardTitle>
                      <CardDescription>Consultez vos factures et gérez votre moyen de paiement</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {hasStripeAccount ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Accédez à votre portail de facturation pour consulter vos factures, télécharger vos reçus PDF et mettre à jour votre carte bancaire.
                      </p>
                      <Button
                        onClick={() => createPortalSession.mutate()}
                        disabled={createPortalSession.isPending}
                        className="gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        {createPortalSession.isPending ? "Ouverture..." : "Ouvrir le portail de facturation"}
                      </Button>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <Receipt className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">
                        Aucun historique de facturation disponible.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Votre historique apparaîtra ici après votre premier paiement.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* ===== ONGLET PROFIL (Thème 5) ===== */}
          <TabsContent value="profile">
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Profil</CardTitle>
                      <CardDescription>Vos informations personnelles</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar et nom */}
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary/20">
                      {user?.imageUrl ? (
                        <img src={user.imageUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                          <User className="w-8 h-8 text-primary" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{user?.fullName || "Utilisateur"}</h3>
                      <p className="text-sm text-muted-foreground">{user?.email || "Aucun email"}</p>
                    </div>
                  </div>

                  {/* Informations détaillées */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Prénom</label>
                      <p className="text-sm font-medium">{user?.firstName || "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nom</label>
                      <p className="text-sm font-medium">{user?.lastName || "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</label>
                      <p className="text-sm font-medium">{user?.email || "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Membre depuis</label>
                      <p className="text-sm font-medium">
                        {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—"}
                      </p>
                    </div>
                  </div>

                  {/* Note informative */}
                  <div className="p-4 rounded-lg bg-muted/50 border border-border">
                    <p className="text-xs text-muted-foreground">
                      Votre profil est géré par votre fournisseur d'identité (Google, GitHub ou email). Pour modifier votre nom ou votre photo, utilisez les paramètres de votre compte de connexion.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* ===== ONGLET SÉCURITÉ (Thème 6) ===== */}
          <TabsContent value="security">
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Méthode de connexion */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Sécurité</CardTitle>
                      <CardDescription>Gérez la sécurité de votre compte</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Méthode de connexion */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Méthode de connexion</h4>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                      <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-green-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Authentification active</p>
                        <p className="text-xs text-muted-foreground">
                          Connexion via {user?.email?.includes("gmail") ? "Google" : "email et mot de passe"}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-green-500 border-green-500/30">Actif</Badge>
                    </div>
                  </div>

                  {/* Session actuelle */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Session actuelle</h4>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Cet appareil</p>
                        <p className="text-xs text-muted-foreground">
                          Connecté maintenant — {navigator.userAgent.includes("Chrome") ? "Chrome" : navigator.userAgent.includes("Firefox") ? "Firefox" : "Navigateur"} sur {navigator.platform}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-primary border-primary/30">Actuelle</Badge>
                    </div>
                  </div>

                  {/* Déconnexion de tous les appareils */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Déconnexion</h4>
                    <p className="text-xs text-muted-foreground">
                      Déconnectez-vous de tous les appareils pour sécuriser votre compte en cas de doute.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={async () => {
                        try {
                          await fetch("/api/clerk/logout", { method: "POST", credentials: "include" });
                          toast.success("Déconnecté de tous les appareils");
                          window.location.href = "/login";
                        } catch {
                          toast.error("Erreur lors de la déconnexion");
                        }
                      }}
                    >
                      <LogOut className="w-4 h-4" />
                      Déconnecter tous les appareils
                    </Button>
                  </div>

                  {/* Note sur la 2FA */}
                  <div className="p-4 rounded-lg bg-muted/50 border border-border">
                    <p className="text-xs text-muted-foreground">
                      L'authentification à deux facteurs (2FA) est gérée par votre fournisseur d'identité. Activez-la dans les paramètres de votre compte Google ou GitHub pour une sécurité renforcée.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* ===== ONGLET PRÉFÉRENCES (Thème 7) ===== */}
          <TabsContent value="preferences">
            <PreferencesTab />
          </TabsContent>

          {/* ===== ONGLET DONNÉES (Thème 8) ===== */}
          <TabsContent value="data">
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Export des données */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Database className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Données personnelles</CardTitle>
                      <CardDescription>Gérez vos données et exercez vos droits RGPD</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Export des données */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Exporter mes données</h4>
                    <p className="text-xs text-muted-foreground">
                      Téléchargez une copie de toutes vos données personnelles (profil, transcriptions, historique) au format JSON.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => toast.info("Votre export est en préparation. Vous recevrez un email avec le lien de téléchargement.")}
                    >
                      <Database className="w-4 h-4" />
                      Demander un export
                    </Button>
                  </div>

                  {/* Politique de conservation */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Conservation des données</h4>
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <p>• <strong>Fichiers audio/vidéo</strong> : supprimés automatiquement après transcription (non conservés)</p>
                      <p>• <strong>Transcriptions</strong> : conservées tant que votre compte est actif</p>
                      <p>• <strong>Données de paiement</strong> : gérées par Stripe (PCI-DSS conforme)</p>
                      <p>• <strong>Logs de connexion</strong> : conservés 90 jours maximum</p>
                    </div>
                  </div>

                  {/* Suppression du compte */}
                  <div className="space-y-3 pt-4 border-t border-border">
                    <h4 className="text-sm font-medium text-destructive">Zone de danger</h4>
                    <p className="text-xs text-muted-foreground">
                      La suppression de votre compte est irréversible. Toutes vos transcriptions, vos crédits restants et votre historique seront définitivement supprimés.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => {
                        if (window.confirm("\u00cates-vous s\u00fbr de vouloir supprimer votre compte ? Cette action est irr\u00e9versible.")) {
                          toast.info("Pour supprimer votre compte, contactez-nous à support@transcribeexpress.com");
                        }
                      }}
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Supprimer mon compte
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.main>
    </div>
  );
}

/** Composant des avantages par plan */
function PlanBenefits({ plan }: { plan: string }) {
  const benefits = {
    free: [
      "30 minutes de transcription gratuites",
      "Formats : MP3, WAV, OGG, M4A, MP4, MOV, WEBM",
      "Export TXT, SRT, VTT",
      "Éditeur synchronisé (texte + audio)",
      "Transcription IA (Whisper)",
    ],
    starter: [
      "Recharges à la demande (5€ à 50€)",
      "Formats : MP3, WAV, OGG, M4A, MP4, MOV, WEBM",
      "Export TXT, SRT, VTT",
      "Éditeur synchronisé (texte + audio)",
      "Transcription IA haute précision",
      "Crédits sans expiration",
    ],
    creator: [
      "300 minutes / mois (5 heures)",
      "Formats : MP3, WAV, OGG, M4A, MP4, MOV, WEBM",
      "Export TXT, SRT, VTT",
      "Éditeur synchronisé (texte + audio)",
      "Transcription IA haute précision",
      "Renouvellement automatique mensuel",
      "Support prioritaire",
    ],
    agency: [
      "1 500 minutes / mois (25 heures)",
      "Formats : MP3, WAV, OGG, M4A, MP4, MOV, WEBM",
      "Export TXT, SRT, VTT",
      "Éditeur synchronisé (texte + audio)",
      "Transcription IA haute précision",
      "Renouvellement automatique mensuel",
      "Support prioritaire dédié",
      "Facturation entreprise",
    ],
  };

  const items = benefits[plan as keyof typeof benefits] || benefits.free;

  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-center gap-2 text-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Onglet Préférences — connecté au backend via trpc.preferences
 */
function PreferencesTab() {
  const { data: prefs, isLoading } = trpc.preferences.get.useQuery();
  const updatePrefs = trpc.preferences.update.useMutation({
    onSuccess: () => {
      toast.success("Préférence enregistrée");
    },
    onError: () => {
      toast.error("Erreur lors de la sauvegarde");
    },
  });

  const handleLanguageChange = (value: string) => {
    updatePrefs.mutate({ defaultLanguage: value });
  };

  const handleFormatChange = (value: string) => {
    updatePrefs.mutate({ defaultExportFormat: value as "txt" | "srt" | "vtt" });
  };

  const handleNotificationChange = (field: "notifyOnComplete" | "notifyOnLowCredits" | "emailNotifications", checked: boolean) => {
    updatePrefs.mutate({ [field]: checked ? 1 : 0 });
  };

  if (isLoading) {
    return (
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Chargement des préférences...
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Paramètres</CardTitle>
              <CardDescription>Personnalisez votre expérience de transcription</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Langue de transcription par défaut */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Langue de transcription par défaut</h4>
            <p className="text-xs text-muted-foreground">
              La langue sélectionnée sera utilisée automatiquement pour chaque nouvelle transcription.
            </p>
            <select
              className="w-full sm:w-64 h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={prefs?.defaultLanguage ?? "fr"}
              onChange={(e) => handleLanguageChange(e.target.value)}
            >
              <option value="fr">Français</option>
              <option value="en">Anglais</option>
              <option value="es">Espagnol</option>
              <option value="de">Allemand</option>
              <option value="it">Italien</option>
              <option value="pt">Portugais</option>
              <option value="auto">Détection automatique</option>
            </select>
          </div>

          {/* Format d'export par défaut */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Format d'export par défaut</h4>
            <p className="text-xs text-muted-foreground">
              Le format sélectionné sera proposé en premier lors du téléchargement de vos transcriptions.
            </p>
            <select
              className="w-full sm:w-64 h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={prefs?.defaultExportFormat ?? "txt"}
              onChange={(e) => handleFormatChange(e.target.value)}
            >
              <option value="txt">Texte brut (.txt)</option>
              <option value="srt">Sous-titres SRT (.srt)</option>
              <option value="vtt">Sous-titres VTT (.vtt)</option>
            </select>
          </div>

          {/* Notifications */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Notifications</h4>
            <p className="text-xs text-muted-foreground">
              Choisissez quand vous souhaitez être notifié.
            </p>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs?.notifyOnComplete === 1}
                  onChange={(e) => handleNotificationChange("notifyOnComplete", e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm">Transcription terminée</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs?.notifyOnLowCredits === 1}
                  onChange={(e) => handleNotificationChange("notifyOnLowCredits", e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm">Crédits faibles (moins de 20%)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs?.emailNotifications === 1}
                  onChange={(e) => handleNotificationChange("emailNotifications", e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm">Notifications par email</span>
              </label>
            </div>
          </div>

          {/* Confirmation */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground">
              Vos préférences sont sauvegardées automatiquement sur nos serveurs et synchronisées sur tous vos appareils.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
