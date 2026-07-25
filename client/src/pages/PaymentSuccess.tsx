import { useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import { CheckCircle, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Page de confirmation après un paiement Stripe réussi.
 * Affichée après redirection depuis Stripe Checkout.
 */
export default function PaymentSuccess() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const sessionId = params.get("session_id");
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    // Masquer l'animation après 3 secondes
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Icône de succès animée */}
        <div className="relative inline-flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
          <div className="relative w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
        </div>

        {/* Titre */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-white">
            Paiement confirmé !
          </h1>
          <p className="text-gray-400 text-lg">
            Votre compte a été mis à jour avec succès. Vos minutes de transcription sont maintenant disponibles.
          </p>
        </div>

        {/* Détails */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-3">
          <div className="flex items-center justify-center gap-2 text-emerald-400">
            <Sparkles className="w-5 h-5" />
            <span className="font-medium">Crédits activés</span>
          </div>
          <p className="text-gray-300 text-sm">
            Vous pouvez commencer à transcrire immédiatement. Vos minutes seront déduites automatiquement à chaque transcription.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link href="/dashboard">
            <Button className="w-full bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-semibold py-6 text-lg">
              Commencer à transcrire
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <Link href="/">
            <Button variant="ghost" className="w-full text-gray-400 hover:text-white">
              Retour à l'accueil
            </Button>
          </Link>
        </div>

        {/* Note de sécurité */}
        <p className="text-xs text-gray-500">
          Un reçu vous a été envoyé par email. Vous pouvez gérer votre abonnement à tout moment depuis votre tableau de bord.
        </p>
      </div>
    </div>
  );
}
