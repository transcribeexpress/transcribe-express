/**
 * EmailSignUp - Formulaire d'inscription par email et mot de passe
 * 
 * Utilise Clerk useSignUp pour gérer :
 * - Inscription email + mot de passe
 * - Vérification de l'email par code OTP
 * - Redirection vers le dashboard après inscription
 */

import { useState } from "react";
import { useSignUp } from "@clerk/clerk-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, Mail, Lock, User, ArrowRight, CheckCircle2 } from "lucide-react";

interface EmailSignUpProps {
  onSwitchToSignIn: () => void;
}

export function EmailSignUp({ onSwitchToSignIn }: EmailSignUpProps) {
  const { signUp, isLoaded, setActive } = useSignUp();
  const [, setLocation] = useLocation();

  const [step, setStep] = useState<"form" | "verify">("form");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signUp) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await signUp.create({
        firstName,
        lastName,
        emailAddress: email,
        password,
      });

      // Envoyer le code de vérification par email
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep("verify");
    } catch (err: unknown) {
      const clerkError = err as { errors?: Array<{ message: string; code: string }> };
      const message = clerkError.errors?.[0]?.message;
      const code = clerkError.errors?.[0]?.code;

      if (code === "form_identifier_exists") {
        setError("Un compte existe déjà avec cet email. Essayez de vous connecter.");
      } else if (code === "form_password_pwned") {
        setError("Ce mot de passe est trop commun. Choisissez un mot de passe plus sécurisé.");
      } else if (code === "form_password_length_too_short") {
        setError("Le mot de passe doit contenir au moins 8 caractères.");
      } else {
        setError(message || "Une erreur est survenue lors de l'inscription.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signUp) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        setLocation("/dashboard");
      } else {
        setError("Vérification incomplète. Veuillez réessayer.");
      }
    } catch (err: unknown) {
      const clerkError = err as { errors?: Array<{ message: string; code: string }> };
      const code = clerkError.errors?.[0]?.code;
      if (code === "form_code_incorrect") {
        setError("Code incorrect. Vérifiez votre email et réessayez.");
      } else if (code === "verification_expired") {
        setError("Le code a expiré. Cliquez sur 'Renvoyer le code'.");
      } else {
        setError(clerkError.errors?.[0]?.message || "Erreur de vérification.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (!isLoaded || !signUp) return;
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setError(null);
    } catch {
      setError("Impossible de renvoyer le code. Réessayez dans quelques secondes.");
    }
  };

  // --- Étape 1 : Formulaire d'inscription ---
  if (step === "form") {
    return (
      <form onSubmit={handleSignUp} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-sm font-medium">
              Prénom
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="firstName"
                type="text"
                placeholder="Jean"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="pl-10 h-11 bg-background/50 border-border/60 focus:border-primary"
                required
                autoComplete="given-name"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-sm font-medium">
              Nom
            </Label>
            <Input
              id="lastName"
              type="text"
              placeholder="Dupont"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="h-11 bg-background/50 border-border/60 focus:border-primary"
              required
              autoComplete="family-name"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="signup-email" className="text-sm font-medium">
            Adresse email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="signup-email"
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
          <Label htmlFor="signup-password" className="text-sm font-medium">
            Mot de passe
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              placeholder="Minimum 8 caractères"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10 h-11 bg-background/50 border-border/60 focus:border-primary"
              required
              minLength={8}
              autoComplete="new-password"
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
          {password.length > 0 && password.length < 8 && (
            <p className="text-xs text-amber-400">
              {8 - password.length} caractère{8 - password.length > 1 ? "s" : ""} supplémentaire{8 - password.length > 1 ? "s" : ""} requis
            </p>
          )}
          {password.length >= 8 && (
            <p className="text-xs text-green-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Mot de passe valide
            </p>
          )}
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
          {isSubmitting ? "Création en cours..." : "Créer mon compte"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Déjà un compte ?{" "}
          <button
            type="button"
            onClick={onSwitchToSignIn}
            className="font-medium text-accent hover:text-accent/80 transition-colors underline-offset-4 hover:underline"
          >
            Se connecter
          </button>
        </p>
      </form>
    );
  }

  // --- Étape 2 : Vérification de l'email ---
  return (
    <form onSubmit={handleVerify} className="space-y-4">
      <div className="text-center space-y-2 mb-4">
        <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
          <Mail className="w-6 h-6 text-accent" />
        </div>
        <p className="text-sm font-medium">Vérifiez votre email</p>
        <p className="text-xs text-muted-foreground">
          Un code à 6 chiffres a été envoyé à{" "}
          <span className="text-foreground font-medium">{email}</span>
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="verify-code" className="text-sm font-medium">
          Code de vérification
        </Label>
        <Input
          id="verify-code"
          type="text"
          placeholder="123456"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="h-12 text-center tracking-[0.5em] text-xl font-mono bg-background/50 border-border/60 focus:border-primary"
          maxLength={6}
          required
          autoComplete="one-time-code"
          inputMode="numeric"
        />
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={isSubmitting || !isLoaded || verificationCode.length !== 6}
        className="w-full h-11 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-medium"
      >
        {isSubmitting ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <CheckCircle2 className="w-4 h-4 mr-2" />
        )}
        {isSubmitting ? "Vérification..." : "Vérifier mon email"}
      </Button>

      <div className="text-center space-y-2">
        <button
          type="button"
          onClick={handleResendCode}
          className="text-sm text-accent hover:text-accent/80 transition-colors"
        >
          Renvoyer le code
        </button>
        <br />
        <button
          type="button"
          onClick={() => { setStep("form"); setError(null); setVerificationCode(""); }}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Modifier l'email
        </button>
      </div>
    </form>
  );
}

export default EmailSignUp;
