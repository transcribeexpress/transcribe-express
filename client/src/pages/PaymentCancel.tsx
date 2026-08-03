import { Link } from "wouter";
import { XCircle, ArrowLeft, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Page affichée quand l'utilisateur annule le paiement Stripe
 * ou ferme la fenêtre de checkout.
 */
export default function PaymentCancel() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Icône d'annulation */}
        <div className="relative inline-flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-amber-500/10 border-2 border-amber-500/50 flex items-center justify-center">
            <XCircle className="w-10 h-10 text-amber-400" />
          </div>
        </div>

        {/* Titre */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-white">
            Paiement annulé
          </h1>
          <p className="text-gray-400 text-lg">
            Pas de souci ! Aucun montant n'a été débité. Vous pouvez revenir à tout moment pour finaliser votre achat.
          </p>
        </div>

        {/* Rappel */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-3">
          <div className="flex items-center justify-center gap-2 text-amber-400">
            <HelpCircle className="w-5 h-5" />
            <span className="font-medium">Besoin d'aide ?</span>
          </div>
          <p className="text-gray-300 text-sm">
            Si vous avez rencontré un problème technique ou si vous avez des questions sur nos offres, n'hésitez pas à nous contacter.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link href="/pricing">
            <Button className="w-full bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-semibold py-6 text-lg">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Revoir les tarifs
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost" className="w-full text-gray-400 hover:text-white">
              Retour au tableau de bord
            </Button>
          </Link>
        </div>

        {/* Essai gratuit */}
        <p className="text-xs text-gray-500">
          Rappel : vous disposez de 30 minutes gratuites pour tester Transcribe Express sans engagement.
        </p>
      </div>
    </div>
  );
}
