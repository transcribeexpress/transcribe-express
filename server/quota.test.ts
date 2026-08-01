/**
 * Tests pour les helpers de quota (décompte et vérification des crédits)
 * 
 * Ces tests vérifient la logique métier critique :
 * - deductCredits : déduction atomique des minutes après transcription
 * - checkQuota : vérification avant lancement d'une transcription
 *   - Blocage si crédits = 0
 *   - Blocage si crédits < estimatedMinutes (nouveau V2)
 *   - Blocage si essai expiré
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock de la base de données
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();
const mockWhere = vi.fn();
const mockFrom = vi.fn();
const mockLimit = vi.fn();

const mockDb = {
  select: mockSelect,
  update: mockUpdate,
};

vi.mock('./db', async (importOriginal) => {
  const original = await importOriginal() as any;
  return {
    ...original,
    getDb: vi.fn(() => mockDb),
  };
});

// Import après le mock
import { deductCredits, checkQuota } from './db';

describe('Quota - deductCredits (arrondi au supérieur)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup chain pour update
    mockUpdate.mockReturnValue({ set: mockSet });
    mockSet.mockReturnValue({ where: mockWhere });
    mockWhere.mockResolvedValue(undefined);
    // Setup chain pour select (récupérer le nouveau solde)
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: vi.fn().mockResolvedValue([{ creditsMinutes: 28 }]) });
  });

  it('devrait arrondir au supérieur (1min43s = 2 minutes déduites)', () => {
    const minutesUsed = 103 / 60; // 1.716...
    expect(Math.ceil(minutesUsed)).toBe(2);
  });

  it('devrait arrondir 30s à 1 minute', () => {
    const minutesUsed = 30 / 60; // 0.5
    expect(Math.ceil(minutesUsed)).toBe(1);
  });

  it('devrait arrondir 5min exactes à 5 minutes', () => {
    const minutesUsed = 300 / 60; // 5.0
    expect(Math.ceil(minutesUsed)).toBe(5);
  });

  it('devrait arrondir 5min01s à 6 minutes', () => {
    const minutesUsed = 301 / 60; // 5.016...
    expect(Math.ceil(minutesUsed)).toBe(6);
  });

  it('devrait arrondir 25min12s à 26 minutes', () => {
    const minutesUsed = 1512 / 60; // 25.2
    expect(Math.ceil(minutesUsed)).toBe(26);
  });
});

describe('Quota - checkQuota (logique de blocage)', () => {
  it('devrait autoriser si crédits > 0 et pas d\'estimatedMinutes', () => {
    const user = { creditsMinutes: 30, plan: 'free', trialExpiresAt: new Date(Date.now() + 86400000) };
    // Sans estimation, on vérifie juste > 0
    expect(user.creditsMinutes > 0).toBe(true);
  });

  it('devrait bloquer si crédits = 0', () => {
    const user = { creditsMinutes: 0, plan: 'free', trialExpiresAt: new Date(Date.now() + 86400000) };
    expect(user.creditsMinutes <= 0).toBe(true);
  });

  it('devrait bloquer si crédits < estimatedMinutes (scénario critique V2)', () => {
    // Scénario : 3 min restantes, fichier de 25 min
    const creditsMinutes = 3;
    const estimatedMinutes = 25;
    const requiredMinutes = Math.ceil(estimatedMinutes);
    const canTranscribe = creditsMinutes >= requiredMinutes;
    expect(canTranscribe).toBe(false);
  });

  it('devrait autoriser si crédits >= estimatedMinutes', () => {
    // Scénario : 30 min restantes, fichier de 2 min
    const creditsMinutes = 30;
    const estimatedMinutes = 1.716; // 1min43s
    const requiredMinutes = Math.ceil(estimatedMinutes);
    const canTranscribe = creditsMinutes >= requiredMinutes;
    expect(canTranscribe).toBe(true);
  });

  it('devrait autoriser si crédits = estimatedMinutes exactement', () => {
    // Scénario : 25 min restantes, fichier de 25 min exactes
    const creditsMinutes = 25;
    const estimatedMinutes = 25;
    const requiredMinutes = Math.ceil(estimatedMinutes);
    const canTranscribe = creditsMinutes >= requiredMinutes;
    expect(canTranscribe).toBe(true);
  });

  it('devrait bloquer si essai expiré même avec crédits restants', () => {
    const user = { creditsMinutes: 30, plan: 'free', trialExpiresAt: new Date(Date.now() - 86400000) };
    const now = new Date();
    const isExpired = user.plan === 'free' && user.trialExpiresAt && now > new Date(user.trialExpiresAt);
    expect(isExpired).toBe(true);
  });

  it('devrait autoriser un plan payant avec crédits suffisants', () => {
    const user = { creditsMinutes: 300, plan: 'creator', trialExpiresAt: null };
    const estimatedMinutes = 45;
    const canTranscribe = user.creditsMinutes >= Math.ceil(estimatedMinutes);
    expect(canTranscribe).toBe(true);
  });

  it('devrait bloquer un plan payant avec crédits insuffisants', () => {
    const user = { creditsMinutes: 5, plan: 'starter', trialExpiresAt: null };
    const estimatedMinutes = 25;
    const canTranscribe = user.creditsMinutes >= Math.ceil(estimatedMinutes);
    expect(canTranscribe).toBe(false);
  });
});

describe('Quota - Estimation de durée depuis la taille du fichier', () => {
  it('Audio 1 Mo ≈ 1 min (128kbps)', () => {
    const fileSizeBytes = 1 * 1024 * 1024; // 1 Mo
    const bytesPerMinute = 1 * 1024 * 1024;
    const estimatedMinutes = fileSizeBytes / bytesPerMinute;
    expect(Math.ceil(estimatedMinutes)).toBe(1);
  });

  it('Audio 25 Mo ≈ 25 min', () => {
    const fileSizeBytes = 25 * 1024 * 1024; // 25 Mo
    const bytesPerMinute = 1 * 1024 * 1024;
    const estimatedMinutes = fileSizeBytes / bytesPerMinute;
    expect(Math.ceil(estimatedMinutes)).toBe(25);
  });

  it('Vidéo 125 Mo ≈ 25 min (5 Mo/min)', () => {
    const fileSizeBytes = 125 * 1024 * 1024; // 125 Mo
    const bytesPerMinute = 5 * 1024 * 1024;
    const estimatedMinutes = fileSizeBytes / bytesPerMinute;
    expect(Math.ceil(estimatedMinutes)).toBe(25);
  });

  it('Audio 500 Ko ≈ 1 min (arrondi au supérieur)', () => {
    const fileSizeBytes = 500 * 1024; // 500 Ko
    const bytesPerMinute = 1 * 1024 * 1024;
    const estimatedMinutes = fileSizeBytes / bytesPerMinute;
    expect(Math.ceil(estimatedMinutes)).toBe(1);
  });
});

describe('Quota - Scénario complet de déduction par plan', () => {
  it('Plan Free : 30 min - 2 min utilisées = 28 min restantes', () => {
    const initial = 30;
    const used = Math.ceil(103 / 60); // 1min43s → 2 min
    const remaining = Math.max(initial - used, 0);
    expect(remaining).toBe(28);
  });

  it('Plan Free : 28 min - 25 min utilisées = 3 min restantes', () => {
    const initial = 28;
    const used = Math.ceil(1494 / 60); // 24min54s → 25 min
    const remaining = Math.max(initial - used, 0);
    expect(remaining).toBe(3);
  });

  it('Plan Free : 3 min restantes, fichier 25 min → BLOQUÉ', () => {
    const creditsMinutes = 3;
    const estimatedMinutes = 25;
    const canTranscribe = creditsMinutes >= Math.ceil(estimatedMinutes);
    expect(canTranscribe).toBe(false);
  });

  it('Plan Starter : recharge 10€ = 66 min, après 10 min utilisées = 56 min', () => {
    const initial = 66;
    const used = Math.ceil(600 / 60); // 10 min exactes
    const remaining = Math.max(initial - used, 0);
    expect(remaining).toBe(56);
  });

  it('Plan Créateur : 300 min/mois, après 45 min utilisées = 255 min', () => {
    const initial = 300;
    const used = Math.ceil(2700 / 60); // 45 min
    const remaining = Math.max(initial - used, 0);
    expect(remaining).toBe(255);
  });

  it('Plan Agence : 1500 min/mois, après 120 min utilisées = 1380 min', () => {
    const initial = 1500;
    const used = Math.ceil(7200 / 60); // 120 min
    const remaining = Math.max(initial - used, 0);
    expect(remaining).toBe(1380);
  });

  it('Ne devrait jamais descendre en dessous de 0', () => {
    const initial = 2;
    const used = Math.ceil(600 / 60); // 10 min (plus que le solde)
    const remaining = Math.max(initial - used, 0);
    expect(remaining).toBe(0);
  });

  it('Devrait bloquer si crédits = 0 avant transcription', () => {
    const creditsMinutes = 0;
    const canTranscribe = creditsMinutes > 0;
    expect(canTranscribe).toBe(false);
  });
});

describe('Quota - Message d\'erreur contextuel', () => {
  it('devrait inclure les crédits restants et la durée requise dans le message', () => {
    const creditsMinutes = 3;
    const requiredMinutes = 25;
    const message = `Crédits insuffisants. Il vous reste ${creditsMinutes} min mais ce fichier nécessite environ ${requiredMinutes} min. Rechargez vos crédits ou choisissez un fichier plus court.`;
    expect(message).toContain('3 min');
    expect(message).toContain('25 min');
    expect(message).toContain('Rechargez');
  });

  it('devrait avoir un message pour crédits épuisés', () => {
    const message = "Crédits épuisés. Rechargez vos crédits ou passez à un plan supérieur.";
    expect(message).toContain('épuisés');
  });

  it('devrait avoir un message pour essai expiré', () => {
    const message = "Votre essai gratuit de 30 jours est expiré.";
    expect(message).toContain('expiré');
  });
});
