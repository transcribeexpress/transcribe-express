/**
 * EmailSignIn - Formulaire de connexion par email et mot de passe
 *
 * Gère tous les statuts Clerk :
 * - "complete"            → session créée, redirection dashboard
 * - "needs_first_factor"  → Clerk demande un code OTP envoyé par email
 * - "needs_second_factor" → MFA activé (TOTP / SMS)
 * - Réinitialisation de mot de passe via code email
 */

import { useState } from "react";
import { useSignIn } from "@clerk/clerk-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, Mail, Lock, ArrowRight, ShieldCheck } from "lucide-react";

type EmailSignInMode =
  | "signin"
  | "otp_first_factor"
  | "otp_second_factor"
  | "forgot_password"
  | "reset_code";

interface EmailSignInProps {
  onSwitchToSignUp: () => void;
}

export function EmailSignIn({ onSwitchToSignUp }: EmailSignInProps) {
  const { signIn, isLoaded, setActive } = useSignIn();
  const [, setLocation] = useLocation();

  const [mode, setMode] = useState<EmailSignInMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ─── Connexion email + mot de passe ──────────────────────────────────────
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
      } else if (result.status === "needs_first_factor") {
        // Clerk demande une vérification supplémentaire (OTP email)
        // Récupérer le emailAddressId depuis supportedFirstFactors
        const emailFactor = result.supportedFirstFactors?.find(
          (f): f is typeof f & { emailAddressId: string } =>
            f.strategy === "email_code" && "emailAddressId" in f && typeof (f as { emailAddressId?: string }).emailAddressId === "string"
        );

        if (!emailFactor?.emailAddressId) {
          // Fallback : tenter de récupérer depuis userData ou relancer un create email_code
          try {
            // Relancer signIn.create avec strategy email_code pour forcer l'envoi
            await signIn.create({
              strategy: "email_code",
              identifier: email,
            });
          } catch (fallbackErr: unknown) {
            const fe = fallbackErr as { errors?: Array<{ message: string }> };
            setError(
              fe.errors?.[0]?.message ||
              "Impossible d'envoyer le code de vérification. Vérifiez votre email."
            );
            setIsSubmitting(false);
            return;
          }
        } else {
          try {
            await signIn.prepareFirstFactor({
              strategy: "email_code",
              emailAddressId: emailFactor.emailAddressId,
            });
          } catch (prepErr: unknown) {
            const pe = prepErr as { errors?: Array<{ message: string; code: string }> };
            const peCode = pe.errors?.[0]?.code;
            // Ignorer l'erreur "already_prepared" — le code a déjà été envoyé
            if (peCode !== "verification_already_verified" && peCode !== "verification_already_prepared") {
              setError(
                pe.errors?.[0]?.message ||
                "Impossible d'envoyer le code de vérification. Veuillez réessayer."
              );
              setIsSubmitting(false);
              return;
            }
          }
        }
        setSuccessMessage(`Un code de vérification a été envoyé à ${email}`);
        setMode("otp_first_factor");
      } else if (result.status === "needs_second_factor") {
        // MFA activé sur le compte
        setSuccessMessage("Entrez le code de votre application d'authentification.");
        setMode("otp_second_factor");
      } else {
        // Statut inattendu — afficher un message générique
        setError(`Statut inattendu : ${result.status}. Veuillez réessayer.`);
      }
    } catch (err: unknown) {
      const clerkError = err as { errors?: Array<{ message: string; code: string }> };
      const message = clerkError.errors?.[0]?.message;
      const code = clerkError.errors?.[0]?.code;

      if (code === "form_password_incorrect") {
        setError("Mot de passe incorrect. Veuillez réessayer.");
      } else if (code === "form_identifier_not_found") {
        setError("Aucun compte trouvé avec cet email.");
      } else if (code === "session_exists") {
        // Session déjà active → rediriger directement
        setLocation("/dashboard");
      } else {
        setError(message || "Une erreur est survenue. Veuillez réessayer.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Vérification OTP (first factor) ─────────────────────────────────────
  const handleOtpFirstFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code: otpCode,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        setLocation("/dashboard");
      } else if (result.status === "needs_second_factor") {
        setSuccessMessage("Entrez le code de votre application d'authentification.");
        setMode("otp_second_factor");
      } else {
        setError("Vérification incomplète. Veuillez réessayer.");
      }
    } catch (err: unknown) {
      const clerkError = err as { errors?: Array<{ message: string; code: string }> };
      const code = clerkError.errors?.[0]?.code;
      if (code === "form_code_incorrect") {
        setError("Code incorrect. Vérifiez votre email et réessayez.");
      } else if (code === "verification_expired") {
        setError("Le code a expiré. Retournez à la connexion pour en recevoir un nouveau.");
      } else {
        setError(clerkError.errors?.[0]?.message || "Erreur de vérification.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Vérification OTP (second factor / MFA) ──────────────────────────────
  const handleOtpSecondFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await signIn.attemptSecondFactor({
        strategy: "totp",
        code: otpCode,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        setLocation("/dashboard");
      } else {
        setError("Vérification MFA incomplète. Veuillez réessayer.");
      }
    } catch (err: unknown) {
      const clerkError = err as { errors?: Array<{ message: string; code: string }> };
      const code = clerkError.errors?.[0]?.code;
      if (code === "form_code_incorrect") {
        setError("Code MFA incorrect. Vérifiez votre application et réessayez.");
      } else {
        setError(clerkError.errors?.[0]?.message || "Erreur de vérification MFA.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Mot de passe oublié ──────────────────────────────────────────────────
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

  // ─── Réinitialisation du mot de passe ────────────────────────────────────
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
      } else if (result.status === "needs_second_factor") {
        setSuccessMessage("Entrez le code de votre application d'authentification.");
        setMode("otp_second_factor");
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

  // ─── Rendu : Connexion ────────────────────────────────────────────────────
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

  // ─── Rendu : OTP first factor (vérification email) ───────────────────────
  if (mode === "otp_first_factor") {
    return (
      <form onSubmit={handleOtpFirstFactor} className="space-y-4">
        <div className="text-center space-y-1 mb-4">
          <div className="flex justify-center mb-3">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <p className="text-sm font-medium">Vérification de votre identité</p>
          {successMessage && (
            <p className="text-xs text-muted-foreground">{successMessage}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="otp-code" className="text-sm font-medium">
            Code de vérification
          </Label>
          <Input
            id="otp-code"
            type="text"
            inputMode="numeric"
            placeholder="123456"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="h-11 text-center tracking-widest text-lg bg-background/50 border-border/60 focus:border-primary"
            maxLength={6}
            required
            autoFocus
            autoComplete="one-time-code"
          />
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitting || !isLoaded || otpCode.length < 6}
          className="w-full h-11 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-medium"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <ShieldCheck className="w-4 h-4 mr-2" />
          )}
          {isSubmitting ? "Vérification..." : "Vérifier le code"}
        </Button>

        <button
          type="button"
          onClick={() => { setMode("signin"); setError(null); setOtpCode(""); setSuccessMessage(null); }}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Retour à la connexion
        </button>
      </form>
    );
  }

  // ─── Rendu : OTP second factor (MFA) ─────────────────────────────────────
  if (mode === "otp_second_factor") {
    return (
      <form onSubmit={handleOtpSecondFactor} className="space-y-4">
        <div className="text-center space-y-1 mb-4">
          <div className="flex justify-center mb-3">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <p className="text-sm font-medium">Authentification à deux facteurs</p>
          {successMessage && (
            <p className="text-xs text-muted-foreground">{successMessage}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="mfa-code" className="text-sm font-medium">
            Code d'authentification
          </Label>
          <Input
            id="mfa-code"
            type="text"
            inputMode="numeric"
            placeholder="123456"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="h-11 text-center tracking-widest text-lg bg-background/50 border-border/60 focus:border-primary"
            maxLength={6}
            required
            autoFocus
            autoComplete="one-time-code"
          />
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitting || !isLoaded || otpCode.length < 6}
          className="w-full h-11 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-medium"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <ShieldCheck className="w-4 h-4 mr-2" />
          )}
          {isSubmitting ? "Vérification..." : "Confirmer"}
        </Button>

        <button
          type="button"
          onClick={() => { setMode("signin"); setError(null); setOtpCode(""); setSuccessMessage(null); }}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Retour à la connexion
        </button>
      </form>
    );
  }

  // ─── Rendu : Mot de passe oublié ─────────────────────────────────────────
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

  // ─── Rendu : Saisie du code de réinitialisation ───────────────────────────
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
          inputMode="numeric"
          placeholder="123456"
          value={resetCode}
          onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="h-11 text-center tracking-widest text-lg bg-background/50 border-border/60 focus:border-primary"
          maxLength={6}
          required
          autoComplete="one-time-code"
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
