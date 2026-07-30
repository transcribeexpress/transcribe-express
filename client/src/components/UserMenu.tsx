/**
 * UserMenu - Menu utilisateur avec avatar et dropdown
 * 
 * Composant affichant l'avatar de l'utilisateur connecté avec un menu
 * déroulant pour accéder au profil et se déconnecter.
 * 
 * Spécifications :
 * - Avatar utilisateur (40x40px, border-radius 50%)
 * - Dropdown avec options : Profil, Déconnexion
 * - Utilisation de shadcn/ui DropdownMenu
 */

import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LogOut, Settings, CreditCard } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

/** Mapping plan → label et couleur du badge */
const PLAN_BADGE: Record<string, { label: string; className: string }> = {
  free:    { label: "Gratuit",  className: "bg-muted text-muted-foreground border-border" },
  starter: { label: "Starter",  className: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" },
  creator: { label: "Créateur", className: "bg-primary/10 text-primary border-primary/30" },
  agency:  { label: "Agence",   className: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
};

interface UserMenuProps {
  className?: string;
}

export function UserMenu({ className }: UserMenuProps) {
  const { user, signOut, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Récupérer le plan de l'utilisateur (uniquement si connecté)
  const { data: planData } = trpc.stripe.getUserPlan.useQuery(undefined, {
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // cache 5 min pour éviter les requêtes excessives
  });

  const plan = planData?.plan ?? "free";
  const badge = PLAN_BADGE[plan] ?? PLAN_BADGE.free;

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

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className={className}>
        <button
          className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background transition-all"
          aria-label="Menu utilisateur"
        >
          <Avatar className="w-10 h-10 border-2 border-primary/20 hover:border-primary/50 transition-colors">
            <AvatarImage 
              src={user.imageUrl} 
              alt={user.fullName || "Avatar utilisateur"} 
            />
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1.5">
            <p className="text-sm font-medium leading-none">
              {user.fullName || "Utilisateur"}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
            <Badge
              variant="outline"
              className={`w-fit text-[10px] px-1.5 py-0 h-4 font-medium mt-0.5 ${badge.className}`}
            >
              {badge.label}
            </Badge>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={() => setLocation("/account")}
          className="cursor-pointer"
        >
          <CreditCard className="mr-2 h-4 w-4" />
          <span>Mon Compte</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => setLocation("/account?tab=preferences")}
          className="cursor-pointer"
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Paramètres</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleSignOut}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Déconnexion</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default UserMenu;
