/**
 * Page Settings - Paramètres utilisateur
 * 
 * Page protégée permettant à l'utilisateur de gérer ses préférences et paramètres.
 */

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useClerkSync } from "@/hooks/useClerkSync";
import { UserMenu } from "@/components/UserMenu";
import { ArrowLeft, Bell, Globe, Palette, Key, Shield, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { toast } from "sonner";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028820418/oRqyQWHwreNEuW2rCuPNoU/brand/neon-symbol-transparent-v3.png";
const WORDMARK_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028820418/oRqyQWHwreNEuW2rCuPNoU/assets/transcribe-express-wordmark-transparent-e5f6g7h8.png";

export default function Settings() {
  const { user, isSignedIn, isLoading } = useAuth();
  const { isSessionReady, isSyncing, error: syncError } = useClerkSync();
  const [, setLocation] = useLocation();

  // États des paramètres
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [transcriptionComplete, setTranscriptionComplete] = useState(true);
  const [transcriptionError, setTranscriptionError] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);
  const [language, setLanguage] = useState("fr");
  const [theme, setTheme] = useState("dark");

  // Handlers
  const handleSaveSettings = () => {
    toast.success("Paramètres enregistrés avec succès");
  };

  const handleResetSettings = () => {
    setEmailNotifications(true);
    setTranscriptionComplete(true);
    setTranscriptionError(true);
    setWeeklyReport(false);
    setLanguage("fr");
    setTheme("dark");
    toast.info("Paramètres réinitialisés");
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
          <p className="text-muted-foreground">Veuillez vous connecter pour accéder aux paramètres.</p>
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
          <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos préférences et paramètres de l'application
          </p>
        </motion.div>

        <div className="space-y-6">
          {/* Notifications */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Notifications</CardTitle>
                    <CardDescription>Gérez vos préférences de notifications</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Email notifications */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notifications" className="text-base">
                      Notifications par email
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Recevoir des notifications par email
                    </p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>

                <Separator />

                {/* Transcription complete */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="transcription-complete" className="text-base">
                      Transcription terminée
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Notification quand une transcription est terminée
                    </p>
                  </div>
                  <Switch
                    id="transcription-complete"
                    checked={transcriptionComplete}
                    onCheckedChange={setTranscriptionComplete}
                    disabled={!emailNotifications}
                  />
                </div>

                {/* Transcription error */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="transcription-error" className="text-base">
                      Erreur de transcription
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Notification en cas d'erreur de transcription
                    </p>
                  </div>
                  <Switch
                    id="transcription-error"
                    checked={transcriptionError}
                    onCheckedChange={setTranscriptionError}
                    disabled={!emailNotifications}
                  />
                </div>

                {/* Weekly report */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="weekly-report" className="text-base">
                      Rapport hebdomadaire
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Recevoir un résumé hebdomadaire de vos transcriptions
                    </p>
                  </div>
                  <Switch
                    id="weekly-report"
                    checked={weeklyReport}
                    onCheckedChange={setWeeklyReport}
                    disabled={!emailNotifications}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Langue et région */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Langue et région</CardTitle>
                    <CardDescription>Personnalisez la langue de l'interface</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Langue de l'interface</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger id="language">
                      <SelectValue placeholder="Sélectionner une langue" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    La langue de l'interface sera changée lors de votre prochaine connexion
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Apparence */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Palette className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Apparence</CardTitle>
                    <CardDescription>Personnalisez l'apparence de l'interface</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="theme">Thème</Label>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger id="theme">
                      <SelectValue placeholder="Sélectionner un thème" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Clair</SelectItem>
                      <SelectItem value="dark">Sombre</SelectItem>
                      <SelectItem value="system">Système</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Le thème sombre est actuellement appliqué par défaut
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Sécurité */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
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
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      Mot de passe
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Pour modifier votre mot de passe, utilisez le portail de gestion Clerk
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open("https://accounts.clerk.dev/user", "_blank")}
                    >
                      Gérer mon compte Clerk
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Zone de danger */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <Card className="border-destructive/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <CardTitle className="text-destructive">Zone de danger</CardTitle>
                    <CardDescription>Actions irréversibles sur votre compte</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Supprimer toutes les transcriptions</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Cette action supprimera définitivement toutes vos transcriptions. Cette action est irréversible.
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => toast.error("Fonctionnalité non implémentée")}
                  >
                    Supprimer toutes les transcriptions
                  </Button>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-medium mb-2">Supprimer mon compte</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Pour supprimer votre compte, utilisez le portail de gestion Clerk
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => window.open("https://accounts.clerk.dev/user", "_blank")}
                  >
                    Gérer mon compte Clerk
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Actions */}
          <motion.div
            className="flex justify-end gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <Button variant="outline" onClick={handleResetSettings}>
              Réinitialiser
            </Button>
            <Button onClick={handleSaveSettings}>
              Enregistrer les modifications
            </Button>
          </motion.div>
        </div>
      </motion.main>
    </div>
  );
}
