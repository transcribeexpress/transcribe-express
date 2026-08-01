import { Link } from "wouter";
import { XCircle, ArrowLeft, HelpCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028820418/oRqyQWHwreNEuW2rCuPNoU/neon_symbol_transparent_9075d38e.png";
const WORDMARK_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028820418/oRqyQWHwreNEuW2rCuPNoU/wordmark-transparent_d2755219.webp";

/**
 * Page affichée quand l'utilisateur annule le paiement Stripe
 * ou ferme la fenêtre de checkout.
 * 
 * Design harmonisé avec la charte Transcribe Express :
 * - Palette Magenta (#BE34D5) / Cyan (#34D5BE)
 * - Fond dark cohérent avec bg-background
 * - Logo + wordmark identiques aux autres pages
 */
export default function PaymentCancel() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header identique aux autres pages */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/40">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <img src={LOGO_URL} alt="Logo" className="w-8 h-8" />
            <img src={WORDMARK_URL} alt="Transcribe Express" className="h-5" />
          </div>
        </Link>
      </header>

      {/* Contenu centré */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-md w-full text-center space-y-8"
        >
          {/* Icône d'annulation — couleur ambre cohérente avec les alertes du SaaS */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="relative inline-flex items-center justify-center"
          >
            <div className="w-20 h-20 rounded-full bg-amber-500/10 border-2 border-amber-500/40 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-amber-400" />
            </div>
          </motion.div>

          {/* Titre et description */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Paiement annulé
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed">
              Pas de souci ! Aucun montant n'a été débité.{" "}
              Vous pouvez revenir à tout moment pour finaliser votre achat.
            </p>
          </motion.div>

          {/* Carte "Besoin d'aide ?" — cliquable vers /contact */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Link href="/contact">
              <div className="group bg-card border border-border hover:border-[#BE34D5]/50 rounded-xl p-6 space-y-3 cursor-pointer transition-all duration-200 hover:bg-[#BE34D5]/5">
                <div className="flex items-center justify-center gap-2 text-[#BE34D5]">
                  <HelpCircle className="w-5 h-5" />
                  <span className="font-semibold text-sm">Besoin d'aide ?</span>
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity -ml-1" />
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Si vous avez rencontré un problème technique ou si vous avez des questions
                  sur nos offres, notre équipe est disponible pour vous aider.
                </p>
                <p className="text-xs text-[#BE34D5]/70 font-medium group-hover:text-[#BE34D5] transition-colors">
                  Contacter le support →
                </p>
              </div>
            </Link>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col gap-3"
          >
            <Link href="/pricing">
              <Button
                className="w-full font-semibold py-6 text-base"
                style={{
                  background: "linear-gradient(135deg, #BE34D5, #8B21A0)",
                }}
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Revoir les tarifs
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button
                variant="ghost"
                className="w-full text-muted-foreground hover:text-foreground hover:bg-muted/50"
              >
                Retour au tableau de bord
              </Button>
            </Link>
          </motion.div>

          {/* Rappel essai gratuit */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-xs text-muted-foreground/60"
          >
            Rappel : vous disposez de 30 minutes gratuites pour tester{" "}
            <span className="text-[#BE34D5]/80">Transcribe Express</span> sans engagement.
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
