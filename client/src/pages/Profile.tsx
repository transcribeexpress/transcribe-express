/**
 * Page Profile - Profil utilisateur
 * 
 * Page protégée permettant à l'utilisateur de voir et modifier son profil.
 * Utilise Clerk pour la gestion du profil utilisateur.
 */

import { useAuth } from "@/hooks/useAuth";
import { useClerkSync } from "@/hooks/useClerkSync";
import { UserMenu } from "@/components/UserMenu";
import { ArrowLeft, User, Mail, Calendar, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028820418/oRqyQWHwreNEuW2rCuPNoU/brand/neon-symbol-transparent-v3.png";
const WORDMARK_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028820418/oRqyQWHwreNEuW2rCuPNoU/assets/transcribe-express-wordmark-transparent-e5f6g7h8.png";

export default function Profile() {
  const { user, isSignedIn, isLoading } = useAuth();
  const { isSessionReady, isSyncing, error: syncError } = useClerkSync();
  const [, setLocation] = useLocation();

  // Générer les initiales de l'utilisateur
  const getInitials = () => {
    if (!user) return "?";
    
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    
    if (user.fullName) {
      const parts = user.fullName.split(" ");
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return parts[0][0].toUpperCase();
    }
    
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    
    return "U";
  };

  // État de chargement
  if (isLoading || isSyncing) {
    return <DashboardSkeleton />;
  }

  // Utilisateur non connecté
  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <img src={LOGO_URL} alt="Transcribe Express" className="w-16 h-16 mx-auto" />
          <h2 className="text-xl font-semibold">Connexion requise</h2>
          <p className="text-muted-foreground">Veuillez vous connecter pour accéder à votre profil.</p>
          <Button onClick={() => setLocation("/login")}>
            Se connecter
          </Button>
        </div>
      </div>
    );
  }

  // Erreur de synchronisation
  if (syncError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <img src={LOGO_URL} alt="Transcribe Express" className="w-16 h-16 mx-auto" />
          <h2 className="text-xl font-semibold">Erreur de connexion</h2>
          <p className="text-muted-foreground">Impossible de synchroniser votre session. Veuillez réessayer.</p>
          <Button onClick={() => window.location.reload()}>
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="Transcribe Express Logo" className="w-8 h-8 sm:w-10 sm:h-10 object-contain flex-shrink-0" />
            <img src={WORDMARK_URL} alt="Transcribe Express" className="h-8 sm:h-10 md:h-12 w-auto max-w-[120px] sm:max-w-[160px] md:max-w-[200px] object-contain" />
          </div>

          {/* User Menu */}
          <UserMenu />
        </div>
      </header>

      {/* Main Content */}
      <motion.main 
        className="container py-8 max-w-4xl"
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
          <h1 className="text-3xl font-bold tracking-tight">Mon Profil</h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos informations personnelles et vos préférences
          </p>
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-6">
                <Avatar className="w-24 h-24 border-4 border-primary/20">
                  <AvatarImage 
                    src={user?.imageUrl} 
                    alt={user?.fullName || "Avatar utilisateur"} 
                  />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-semibold">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-2xl">{user?.fullName || "Utilisateur"}</CardTitle>
                  <CardDescription className="text-base mt-1">
                    {user?.email}
                  </CardDescription>
                  <div className="flex gap-2 mt-3">
                    <Badge variant="secondary" className="gap-1">
                      <Shield className="w-3 h-3" />
                      Compte vérifié
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>

            <Separator />

            <CardContent className="pt-6 space-y-6">
              {/* Informations personnelles */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Informations personnelles</h3>
                <div className="space-y-4">
                  {/* Nom complet */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Nom complet</p>
                      <p className="font-medium">{user?.fullName || "Non renseigné"}</p>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Adresse email</p>
                      <p className="font-medium">{user?.email}</p>
                    </div>
                  </div>

                  {/* Date de création */}
                  {user?.createdAt && (
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Membre depuis</p>
                        <p className="font-medium">
                          {format(new Date(user.createdAt), "d MMMM yyyy", { locale: fr })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Gestion du compte */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Gestion du compte</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Pour modifier vos informations personnelles, votre photo de profil ou votre mot de passe, 
                  utilisez le portail de gestion de compte Clerk.
                </p>
                <Button 
                  variant="outline"
                  onClick={() => window.open("https://accounts.clerk.dev/user", "_blank")}
                >
                  Gérer mon compte Clerk
                </Button>
              </div>

              <Separator />

              {/* Statistiques */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Statistiques d'utilisation</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-muted/30">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-primary">-</p>
                        <p className="text-sm text-muted-foreground mt-1">Transcriptions</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/30">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-primary">-</p>
                        <p className="text-sm text-muted-foreground mt-1">Heures traitées</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/30">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-primary">-</p>
                        <p className="text-sm text-muted-foreground mt-1">Taux de succès</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <p className="text-xs text-muted-foreground mt-4 text-center">
                  💡 Consultez la page <Button variant="link" className="h-auto p-0 text-xs" onClick={() => setLocation("/analytics")}>Analytics</Button> pour plus de détails
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.main>
    </div>
  );
}
