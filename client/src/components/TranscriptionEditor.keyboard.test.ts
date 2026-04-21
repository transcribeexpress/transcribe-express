/**
 * Tests unitaires pour la logique des raccourcis clavier et des contrôles audio
 * de TranscriptionEditor.tsx
 *
 * Ces tests vérifient :
 * - La logique de skipAudio (±5s, bornes min/max)
 * - La détection des éléments de saisie (isTyping)
 * - La logique de détection d'écran tactile
 * - Le feedback haptique (vibrate API)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Helpers extraits de TranscriptionEditor.tsx ──────────────────────────────

/**
 * Calcule la nouvelle position audio après un skip.
 * Reproduit la logique de skipAudio() dans TranscriptionEditor.
 */
function computeSkipTime(
  currentTime: number,
  duration: number,
  delta: number
): number {
  return Math.max(0, Math.min(duration, currentTime + delta));
}

/**
 * Détermine si un élément HTML est un champ de saisie actif.
 * Reproduit la logique isTyping dans handleKeyDown.
 */
function isTypingElement(element: Partial<HTMLElement>): boolean {
  const tag = (element as HTMLElement).tagName ?? "";
  const role = (element as HTMLElement).getAttribute?.("role") ?? "";
  const editable = (element as HTMLElement).isContentEditable ?? false;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    role === "textbox" ||
    editable
  );
}

/**
 * Simule le feedback haptique si navigator.vibrate est disponible.
 */
function triggerHaptic(duration = 15): boolean {
  if ("vibrate" in navigator) {
    navigator.vibrate(duration);
    return true;
  }
  return false;
}

// ─── Tests : skipAudio ────────────────────────────────────────────────────────

describe("skipAudio — logique de calcul de position", () => {
  it("avance de 5 secondes normalement", () => {
    expect(computeSkipTime(10, 60, 5)).toBe(15);
  });

  it("recule de 5 secondes normalement", () => {
    expect(computeSkipTime(10, 60, -5)).toBe(5);
  });

  it("ne descend pas en dessous de 0", () => {
    expect(computeSkipTime(2, 60, -5)).toBe(0);
  });

  it("ne dépasse pas la durée totale", () => {
    expect(computeSkipTime(58, 60, 5)).toBe(60);
  });

  it("reste à 0 si currentTime est déjà à 0 et delta négatif", () => {
    expect(computeSkipTime(0, 60, -10)).toBe(0);
  });

  it("reste à la durée si currentTime est à la fin et delta positif", () => {
    expect(computeSkipTime(60, 60, 10)).toBe(60);
  });

  it("gère une durée de 0 (audio non chargé)", () => {
    expect(computeSkipTime(0, 0, 5)).toBe(0);
  });

  it("gère un delta de 0 (pas de mouvement)", () => {
    expect(computeSkipTime(30, 60, 0)).toBe(30);
  });

  it("gère des valeurs décimales précises", () => {
    expect(computeSkipTime(12.3, 60, 5)).toBeCloseTo(17.3, 5);
  });

  it("avance de 10 secondes (double skip)", () => {
    expect(computeSkipTime(20, 60, 10)).toBe(30);
  });
});

// ─── Tests : isTypingElement ──────────────────────────────────────────────────

describe("isTypingElement — détection des champs de saisie", () => {
  it("détecte un INPUT comme champ de saisie", () => {
    const el = { tagName: "INPUT", getAttribute: () => null, isContentEditable: false };
    expect(isTypingElement(el as unknown as HTMLElement)).toBe(true);
  });

  it("détecte un TEXTAREA comme champ de saisie", () => {
    const el = { tagName: "TEXTAREA", getAttribute: () => null, isContentEditable: false };
    expect(isTypingElement(el as unknown as HTMLElement)).toBe(true);
  });

  it("détecte un élément avec role=textbox", () => {
    const el = {
      tagName: "DIV",
      getAttribute: (attr: string) => (attr === "role" ? "textbox" : null),
      isContentEditable: false,
    };
    expect(isTypingElement(el as unknown as HTMLElement)).toBe(true);
  });

  it("détecte un élément contentEditable", () => {
    const el = { tagName: "DIV", getAttribute: () => null, isContentEditable: true };
    expect(isTypingElement(el as unknown as HTMLElement)).toBe(true);
  });

  it("ne détecte pas un BUTTON comme champ de saisie", () => {
    const el = { tagName: "BUTTON", getAttribute: () => null, isContentEditable: false };
    expect(isTypingElement(el as unknown as HTMLElement)).toBe(false);
  });

  it("ne détecte pas un DIV ordinaire comme champ de saisie", () => {
    const el = { tagName: "DIV", getAttribute: () => null, isContentEditable: false };
    expect(isTypingElement(el as unknown as HTMLElement)).toBe(false);
  });

  it("ne détecte pas un SPAN comme champ de saisie", () => {
    const el = { tagName: "SPAN", getAttribute: () => null, isContentEditable: false };
    expect(isTypingElement(el as unknown as HTMLElement)).toBe(false);
  });
});

// ─── Tests : feedback haptique ───────────────────────────────────────────────

describe("triggerHaptic — feedback haptique", () => {
  beforeEach(() => {
    // Simuler navigator.vibrate disponible
    Object.defineProperty(navigator, "vibrate", {
      value: vi.fn().mockReturnValue(true),
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("appelle navigator.vibrate avec la durée par défaut (15ms)", () => {
    const result = triggerHaptic();
    expect(result).toBe(true);
    expect(navigator.vibrate).toHaveBeenCalledWith(15);
  });

  it("appelle navigator.vibrate avec une durée personnalisée", () => {
    triggerHaptic(30);
    expect(navigator.vibrate).toHaveBeenCalledWith(30);
  });

  it("retourne false si navigator.vibrate n'est pas disponible", () => {
    // Supprimer vibrate
    const nav = navigator as Record<string, unknown>;
    const original = nav["vibrate"];
    delete nav["vibrate"];
    const result = triggerHaptic();
    expect(result).toBe(false);
    nav["vibrate"] = original;
  });
});

// ─── Tests : logique de raccourcis clavier ────────────────────────────────────

describe("raccourcis clavier — logique de filtrage", () => {
  it("Espace doit être bloqué si isTyping est vrai", () => {
    const el = { tagName: "INPUT", getAttribute: () => null, isContentEditable: false };
    const isTyping = isTypingElement(el as unknown as HTMLElement);
    // Si isTyping, on ne doit pas déclencher togglePlayPause
    expect(isTyping).toBe(true);
  });

  it("Espace doit être autorisé si l'élément n'est pas un champ de saisie", () => {
    const el = { tagName: "DIV", getAttribute: () => null, isContentEditable: false };
    const isTyping = isTypingElement(el as unknown as HTMLElement);
    expect(isTyping).toBe(false);
  });

  it("ArrowLeft doit reculer de 5 secondes", () => {
    const result = computeSkipTime(30, 120, -5);
    expect(result).toBe(25);
  });

  it("ArrowRight doit avancer de 5 secondes", () => {
    const result = computeSkipTime(30, 120, 5);
    expect(result).toBe(35);
  });

  it("ArrowLeft en début de piste reste à 0", () => {
    const result = computeSkipTime(3, 120, -5);
    expect(result).toBe(0);
  });

  it("ArrowRight en fin de piste reste à la durée", () => {
    const result = computeSkipTime(118, 120, 5);
    expect(result).toBe(120);
  });
});
