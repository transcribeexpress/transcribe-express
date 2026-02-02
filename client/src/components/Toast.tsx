import { Toaster as Sonner } from "sonner";
import { CheckCircle2, XCircle, Info, AlertTriangle } from "lucide-react";

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      expand={true}
      richColors
      closeButton
      toastOptions={{
        style: {
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(10px)",
          color: "white",
        },
        className: "toast-custom",
      }}
      icons={{
        success: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
        error: <XCircle className="w-5 h-5 text-red-400" />,
        info: <Info className="w-5 h-5 text-cyan-400" />,
        warning: <AlertTriangle className="w-5 h-5 text-amber-400" />,
      }}
    />
  );
}

// Export toast function for easy use
export { toast } from "sonner";
