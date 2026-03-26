/**
 * EmailSignIn - Formulaire de connexion par email et mot de passe
 * 
 * Utilise Clerk useSignIn pour gérer :
 * - Connexion email + mot de passe
 * - Vérification OTP si nécessaire
 * - Réinitialisation de mot de passe
 */

import { useState } from "react";
import { useSignIn } from "@clerk/clerk-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, Mail, Lock, ArrowRight } from "lucide-react";

type EmailSignInMode = "signin" | "forgot_password" | "reset_code";

interface EmailSignInProps {
  onSwitchToSignUp: () => void;
}

export function EmailSignIn({ onSwitchToSignUp }: EmailSignInProps) {
  const { signIn, isLoaded, setActive } = useSignIn();
  const [, setLocation] = useLocation();

  const [mode, setMode] = useState<EmailSignInMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        setLocation("/dashboard");
      } else {
        setError("Une vérification supplémentaire est requise.");
      }
    } catch (err: unknown) {
      const clerkError = err as { errors?: Array<{ message: string; code: string }> };
      const message = clerkError.errors?.[0]?.message;
      const code = clerkError.errors?.[0]?.code;

      if (code === "form_password_incorrect") {
        setError("Mot de passe incorrect. Veuillez réessayer.");
      } else if (code === "form_identifier_not_found") {
        setError("Aucun compte trouvé avec cet email.");
      } else {
        setError(message || "Une erreur est survenue. Veuillez réessayer.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      setSuccessMessage(`Un code de réinitialisation a été envoyé à ${email}`);
      setMode("reset_code");
    } catch (err: unknown) {
      const clerkError = err as { errors?: Array<{ message: string }> };
      setError(clerkError.errors?.[0]?.message || "Impossible d'envoyer l'email de réinitialisation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: resetCode,
        password: newPassword,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        setLocation("/dashboard");
      }
    } catch (err: unknown) {
      const clerkError = err as { errors?: Array<{ message: string; code: string }> };
      const code = clerkError.errors?.[0]?.code;
      if (code === "form_code_incorrect") {
        setError("Code incorrect. Vérifiez votre email et réessayez.");
      } else {
        setError(clerkError.errors?.[0]?.message || "Erreur lors de la réinitialisation.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Mode : Connexion ---
  if (mode === "signin") {
    return (
      <form onSubmit={handleSignIn} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Adresse email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="vous@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-11 bg-background/50 border-border/60 focus:border-primary"
              required
              autoComplete="email"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium">
              Mot de passe
            </Label>
            <button
              type="button"
              onClick={() => { setMode("forgot_password"); setError(null); }}
              className="text-xs text-accent hover:text-accent/80 transition-colors"
            >
              Mot de passe oublié ?
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10 h-11 bg-background/50 border-border/60 focus:border-primary"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitting || !isLoaded}
          className="w-full h-11 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-medium transition-all"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <ArrowRight className="w-4 h-4 mr-2" />
          )}
          {isSubmitting ? "Connexion en cours..." : "Se connecter"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <button
            type="button"
            onClick={onSwitchToSignUp}
            className="font-medium text-accent hover:text-accent/80 transition-colors underline-offset-4 hover:underline"
          >
            Créer un compte
          </button>
        </p>
      </form>
    );
  }

  // --- Mode : Mot de passe oublié ---
  if (mode === "forgot_password") {
    return (
      <form onSubmit={handleForgotPassword} className="space-y-4">
        <div className="text-center space-y-1 mb-4">
          <p className="text-sm font-medium">Réinitialisation du mot de passe</p>
          <p className="text-xs text-muted-foreground">
            Entrez votre email pour recevoir un code de réinitialisation
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reset-email" className="text-sm font-medium">
            Adresse email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="reset-email"
              type="email"
              placeholder="vous@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-11 bg-background/50 border-border/60 focus:border-primary"
              required
              autoComplete="email"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitting || !isLoaded}
          className="w-full h-11 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-medium"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : null}
          {isSubmitting ? "Envoi en cours..." : "Envoyer le code"}
        </Button>

        <button
          type="button"
          onClick={() => { setMode("signin"); setError(null); }}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Retour à la connexion
        </button>
      </form>
    );
  }

  // --- Mode : Saisie du code de réinitialisation ---
  return (
    <form onSubmit={handleResetPassword} className="space-y-4">
      <div className="text-center space-y-1 mb-4">
        <p className="text-sm font-medium">Nouveau mot de passe</p>
        {successMessage && (
          <p className="text-xs text-green-400">{successMessage}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="reset-code" className="text-sm font-medium">
          Code de vérification
        </Label>
        <Input
          id="reset-code"
          type="text"
          placeholder="123456"
          value={resetCode}
          onChange={(e) => setResetCode(e.target.value)}
          className="h-11 text-center tracking-widest text-lg bg-background/50 border-border/60 focus:border-primary"
          maxLength={6}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-password" className="text-sm font-medium">
          Nouveau mot de passe
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="new-password"
            type={showNewPassword ? "text" : "password"}
            placeholder="Minimum 8 caractères"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="pl-10 pr-10 h-11 bg-background/50 border-border/60 focus:border-primary"
            required
            minLength={8}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={isSubmitting || !isLoaded}
        className="w-full h-11 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-medium"
      >
        {isSubmitting ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : null}
        {isSubmitting ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
      </Button>

      <button
        type="button"
        onClick={() => { setMode("forgot_password"); setError(null); setSuccessMessage(null); }}
        className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Renvoyer un code
      </button>
    </form>
  );
}

export default EmailSignIn;
