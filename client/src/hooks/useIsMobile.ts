/**
 * Hook de détection mobile/desktop basé sur le User-Agent.
 *
 * Retourne `true` si l'appareil est un smartphone (iOS ou Android).
 * Les tablettes et desktops retournent `false`.
 *
 * Utilisé pour appliquer des contraintes spécifiques aux mobiles
 * (ex : limite de taille de fichier à 300 Mo).
 */
export function useIsMobile(): boolean {
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent;

  // Détection smartphone : iOS (iPhone/iPod) ou Android mobile
  // On exclut volontairement iPad et tablettes Android (comportement desktop)
  const isMobileDevice =
    /iPhone|iPod/i.test(ua) ||
    (/Android/i.test(ua) && /Mobile/i.test(ua));

  return isMobileDevice;
}
