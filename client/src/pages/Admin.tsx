/**
 * Page Admin — Panneau de gestion des utilisateurs
 * 
 * Accès réservé aux utilisateurs avec role === "admin"
 * Fonctionnalités :
 * - Liste des utilisateurs avec pagination
 * - Suppression manuelle avec double confirmation (saisir "CONFIRMER_SUPPRESSION")
 * - Statistiques globales
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useClerkSync } from "@/hooks/useClerkSync";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft,
  Users,
  Trash2,
  AlertTriangle,
  Crown,
  Zap,
  TrendingUp,
  Sparkles,
  Shield,
} from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028820418/oRqyQWHwreNEuW2rCuPNoU/neon_symbol_transparent_9075d38e.png";
const WORDMARK_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028820418/oRqyQWHwreNEuW2rCuPNoU/wordmark-transparent_d2755219.webp";

const PLAN_BADGE: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  free: { label: "Gratuit", className: "bg-muted text-muted-foreground", icon: Sparkles },
  starter: { label: "Starter", className: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30", icon: Zap },
  creator: { label: "Créateur", className: "bg-primary/10 text-primary border-primary/30", icon: Crown },
  agency: { label: "Agence", className: "bg-amber-500/10 text-amber-400 border-amber-500/30", icon: TrendingUp },
};

export default function Admin() {
  const [, navigate] = useLocation();
  const [offset, setOffset] = useState(0);
  const limit = 50;

  // Synchroniser la session Clerk → Manus OAuth (cookie) avant tout appel tRPC
  const { isSessionReady, isSyncing } = useClerkSync();

  // Vérifier le rôle admin via trpc.auth.me — uniquement quand la session est prête
  const { data: currentUser, isLoading: authLoading } = trpc.auth.me.useQuery(
    undefined,
    { enabled: isSessionReady }
  );

  // Stats
  const { data: stats } = trpc.admin.stats.useQuery(undefined, {
    enabled: currentUser?.role === "admin",
  });

  // Liste des utilisateurs
  const { data: usersData, isLoading: usersLoading, refetch } = trpc.admin.listUsers.useQuery(
    { limit, offset },
    { enabled: currentUser?.role === "admin" }
  );

  // Afficher un loader pendant la synchronisation de session ou le chargement auth
  if (isSyncing || (isSessionReady && authLoading)) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="container flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src={LOGO_URL} alt="Logo" className="w-8 h-8" />
              <img src={WORDMARK_URL} alt="Transcribe Express" className="h-7 w-auto object-contain" />
            </div>
            <Badge variant="outline" className="gap-1 border-primary/30 text-primary text-xs">
              <Shield className="w-3 h-3" />
              Espace Administration
            </Badge>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl scale-150" />
              <img src={LOGO_URL} alt="Logo" className="relative w-16 h-16 animate-pulse drop-shadow-[0_0_16px_rgba(190,52,213,0.5)]" />
            </div>
            <p className="text-muted-foreground text-sm">Vérification des droits d'accès…</p>
          </div>
        </div>
      </div>
    );
  }

  // Rediriger si pas admin
  if (!authLoading && (!currentUser || currentUser.role !== "admin")) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header identité visuelle */}
        <header className="border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="container flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src={LOGO_URL} alt="Logo" className="w-8 h-8" />
              <img src={WORDMARK_URL} alt="Transcribe Express" className="h-7 w-auto object-contain" />
            </div>
            <Badge variant="outline" className="gap-1 border-primary/30 text-primary text-xs">
              <Shield className="w-3 h-3" />
              Espace Administration
            </Badge>
          </div>
        </header>

        {/* Contenu centré */}
        <div className="flex-1 flex items-center justify-center px-4">
          <motion.div
            className="w-full max-w-md"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Logo néon mis en valeur */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl scale-150" />
                <img src={LOGO_URL} alt="Logo" className="relative w-20 h-20 drop-shadow-[0_0_24px_rgba(190,52,213,0.6)]" />
              </div>
            </div>

            <Card className="border-destructive/20 bg-card">
              <CardContent className="p-8 text-center space-y-6">
                {/* Icône et titre */}
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto">
                    <Shield className="w-7 h-7 text-destructive" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Accès refusé</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Cette page est réservée aux administrateurs de Transcribe Express.
                    </p>
                  </div>
                </div>

                {/* Explication */}
                <div className="p-4 rounded-lg bg-muted/40 border border-border text-left">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Votre compte ne dispose pas des droits d'administration nécessaires pour accéder à ce panneau. Si vous êtes administrateur, connectez-vous avec le compte admin ou contactez le support.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                  {!currentUser ? (
                    <Button
                      className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={() => navigate("/login?redirect=/admin")}
                    >
                      <Shield className="w-4 h-4" />
                      Se connecter en tant qu'admin
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/10"
                      onClick={() => navigate("/login?redirect=/admin")}
                    >
                      <Shield className="w-4 h-4" />
                      Connexion avec un compte admin
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => navigate("/dashboard")}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Footer discret */}
            <p className="text-center text-xs text-muted-foreground mt-6">
              Transcribe Express — Panneau d'administration sécurisé
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <img src={LOGO_URL} alt="Logo" className="w-8 h-8" />
              <h1 className="text-lg font-bold text-foreground">Administration</h1>
            </div>
          </div>
          <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
            <Shield className="w-3 h-3" />
            Admin
          </Badge>
        </div>
      </header>

      <motion.main
        className="container py-8 space-y-8 max-w-6xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats?.totalUsers ?? "—"}</p>
                <p className="text-xs text-muted-foreground">Utilisateurs inscrits</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Liste des utilisateurs */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Gestion des utilisateurs</CardTitle>
                <CardDescription>
                  {usersData?.total ?? 0} utilisateur{(usersData?.total ?? 0) > 1 ? "s" : ""} au total
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded-lg bg-muted/50 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {usersData?.users.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    isCurrentUser={user.id === currentUser?.id}
                    onDeleted={() => refetch()}
                  />
                ))}

                {/* Pagination */}
                {usersData && usersData.total > limit && (
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Page {Math.floor(offset / limit) + 1} / {Math.ceil(usersData.total / limit)}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={offset === 0}
                        onClick={() => setOffset(Math.max(0, offset - limit))}
                      >
                        Précédent
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={offset + limit >= usersData.total}
                        onClick={() => setOffset(offset + limit)}
                      >
                        Suivant
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.main>
    </div>
  );
}

// ============================================================
// UserRow — Ligne utilisateur avec bouton de suppression
// ============================================================
interface UserRowProps {
  user: {
    id: number;
    name: string | null;
    email: string | null;
    plan: string;
    role: string;
    creditsMinutes: number;
    createdAt: Date;
  };
  isCurrentUser: boolean;
  onDeleted: () => void;
}

function UserRow({ user, isCurrentUser, onDeleted }: UserRowProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const deleteMutation = trpc.admin.deleteUser.useMutation({
    onSuccess: () => {
      toast.success("Utilisateur supprimé avec succès");
      setShowConfirm(false);
      setConfirmText("");
      onDeleted();
    },
    onError: (err) => {
      toast.error(err.message || "Erreur lors de la suppression");
    },
  });

  const planConfig = PLAN_BADGE[user.plan] || PLAN_BADGE.free;
  const PlanIcon = planConfig.icon;

  const handleDelete = () => {
    if (confirmText !== "CONFIRMER_SUPPRESSION") return;
    deleteMutation.mutate({ userId: user.id, confirmation: "CONFIRMER_SUPPRESSION" });
  };

  return (
    <div className="p-4 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
      <div className="flex items-center justify-between gap-4">
        {/* Info utilisateur */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
            <span className="text-sm font-medium text-foreground">
              {(user.name || user.email || "?").charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground truncate">
                {user.name || "Sans nom"}
              </p>
              {user.role === "admin" && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">
                  Admin
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{user.email || "—"}</p>
          </div>
        </div>

        {/* Plan */}
        <Badge variant="outline" className={`shrink-0 gap-1 text-xs ${planConfig.className}`}>
          <PlanIcon className="w-3 h-3" />
          {planConfig.label}
        </Badge>

        {/* Crédits */}
        <div className="hidden sm:block text-right shrink-0 w-20">
          <p className="text-sm font-medium text-foreground">{user.creditsMinutes} min</p>
          <p className="text-[10px] text-muted-foreground">crédits</p>
        </div>

        {/* Date */}
        <div className="hidden md:block text-right shrink-0 w-24">
          <p className="text-xs text-muted-foreground">
            {new Date(user.createdAt).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>

        {/* Actions */}
        <div className="shrink-0">
          {isCurrentUser ? (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">Vous</Badge>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowConfirm(true)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Dialog de confirmation inline */}
      {showConfirm && (
        <motion.div
          className="mt-4 p-4 rounded-lg border border-destructive/30 bg-destructive/5 space-y-3"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <p className="text-sm font-medium text-destructive">
              Supprimer le compte de {user.name || user.email || "cet utilisateur"} ?
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Cette action supprimera toutes les données (S3, Stripe, BDD, Clerk). Tapez{" "}
            <span className="font-mono font-bold text-destructive">CONFIRMER_SUPPRESSION</span>{" "}
            pour confirmer.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Tapez CONFIRMER_SUPPRESSION"
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-muted/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-destructive/50"
              disabled={deleteMutation.isPending}
            />
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={confirmText !== "CONFIRMER_SUPPRESSION" || deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "..." : "Supprimer"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShowConfirm(false); setConfirmText(""); }}
              disabled={deleteMutation.isPending}
            >
              Annuler
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
