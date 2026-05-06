/**
 * Tests unitaires — Solution combinée mobile
 *
 * Couvre :
 * - audioContextExtractor : détection mobile, seuils, logique de routage
 * - chunkedUploader : calcul de chunks, estimation de temps
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isMobileDevice,
  isAudioContextSupported,
  canDecodeNatively,
  shouldUseAudioContext,
  shouldUseChunkedUpload,
} from './audioContextExtractor';
import {
  getChunkCount,
  estimateUploadTime,
} from './chunkedUploader';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Créer un File factice avec une taille donnée */
function makeFile(name: string, sizeBytes: number): File {
  const blob = new Blob([new Uint8Array(Math.min(sizeBytes, 1))], { type: 'video/mp4' });
  const file = new File([blob], name, { type: blob.type });
  // Simuler la taille sans allouer la mémoire réelle
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
}

const MB = 1024 * 1024;
const THRESHOLD = 300 * MB; // 300 Mo

// ─── isMobileDevice ───────────────────────────────────────────────────────────

describe('isMobileDevice', () => {
  const originalUA = navigator.userAgent;
  const originalInnerWidth = window.innerWidth;

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', { value: originalUA, configurable: true });
    Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, configurable: true });
  });

  it('retourne true pour un userAgent iPhone', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      configurable: true,
    });
    expect(isMobileDevice()).toBe(true);
  });

  it('retourne true pour un userAgent Android', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 14; Pixel 8)',
      configurable: true,
    });
    expect(isMobileDevice()).toBe(true);
  });

  it('retourne true pour une fenêtre < 1024px (desktop redimensionné)', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      configurable: true,
    });
    Object.defineProperty(window, 'innerWidth', { value: 768, configurable: true });
    expect(isMobileDevice()).toBe(true);
  });

  it('retourne false pour un desktop avec fenêtre large', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      configurable: true,
    });
    Object.defineProperty(window, 'innerWidth', { value: 1440, configurable: true });
    expect(isMobileDevice()).toBe(false);
  });

  it('retourne true exactement à 1023px (limite basse)', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      configurable: true,
    });
    Object.defineProperty(window, 'innerWidth', { value: 1023, configurable: true });
    expect(isMobileDevice()).toBe(true);
  });

  it('retourne false exactement à 1024px (limite haute)', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      configurable: true,
    });
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
    expect(isMobileDevice()).toBe(false);
  });
});

// ─── canDecodeNatively ────────────────────────────────────────────────────────

describe('canDecodeNatively', () => {
  it('retourne true pour MP4', () => {
    expect(canDecodeNatively(makeFile('video.mp4', 100 * MB))).toBe(true);
  });

  it('retourne true pour MOV', () => {
    expect(canDecodeNatively(makeFile('video.mov', 100 * MB))).toBe(true);
  });

  it('retourne true pour WebM', () => {
    expect(canDecodeNatively(makeFile('video.webm', 100 * MB))).toBe(true);
  });

  it('retourne true pour M4V', () => {
    expect(canDecodeNatively(makeFile('video.m4v', 100 * MB))).toBe(true);
  });

  it('retourne false pour AVI', () => {
    expect(canDecodeNatively(makeFile('video.avi', 100 * MB))).toBe(false);
  });

  it('retourne false pour MKV', () => {
    expect(canDecodeNatively(makeFile('video.mkv', 100 * MB))).toBe(false);
  });

  it('retourne false pour FLV', () => {
    expect(canDecodeNatively(makeFile('video.flv', 100 * MB))).toBe(false);
  });

  it('retourne false pour WMV', () => {
    expect(canDecodeNatively(makeFile('video.wmv', 100 * MB))).toBe(false);
  });

  it('est insensible à la casse de l\'extension', () => {
    expect(canDecodeNatively(makeFile('video.MP4', 100 * MB))).toBe(true);
    expect(canDecodeNatively(makeFile('video.AVI', 100 * MB))).toBe(false);
  });
});

// ─── shouldUseAudioContext ────────────────────────────────────────────────────

describe('shouldUseAudioContext', () => {
  const originalUA = navigator.userAgent;
  const originalInnerWidth = window.innerWidth;

  beforeEach(() => {
    // Simuler un mobile
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      configurable: true,
    });
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true });
    // AudioContext disponible
    (window as any).AudioContext = class {};
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', { value: originalUA, configurable: true });
    Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, configurable: true });
    delete (window as any).AudioContext;
  });

  it('retourne true pour mobile + MP4 > 300 Mo', () => {
    const file = makeFile('video.mp4', THRESHOLD + 1);
    expect(shouldUseAudioContext(file)).toBe(true);
  });

  it('retourne false pour mobile + MP4 < 300 Mo (WASM suffisant)', () => {
    const file = makeFile('video.mp4', THRESHOLD - 1);
    expect(shouldUseAudioContext(file)).toBe(false);
  });

  it('retourne false pour mobile + AVI > 300 Mo (format non natif)', () => {
    const file = makeFile('video.avi', THRESHOLD + 1);
    expect(shouldUseAudioContext(file)).toBe(false);
  });

  it('retourne false pour desktop + MP4 > 300 Mo (WASM disponible)', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      configurable: true,
    });
    Object.defineProperty(window, 'innerWidth', { value: 1440, configurable: true });
    const file = makeFile('video.mp4', THRESHOLD + 1);
    expect(shouldUseAudioContext(file)).toBe(false);
  });

  it('retourne false si AudioContext non disponible', () => {
    delete (window as any).AudioContext;
    delete (window as any).webkitAudioContext;
    const file = makeFile('video.mp4', THRESHOLD + 1);
    expect(shouldUseAudioContext(file)).toBe(false);
  });

  it('retourne false exactement à 300 Mo (limite non incluse)', () => {
    const file = makeFile('video.mp4', THRESHOLD);
    expect(shouldUseAudioContext(file)).toBe(false);
  });
});

// ─── shouldUseChunkedUpload ───────────────────────────────────────────────────

describe('shouldUseChunkedUpload', () => {
  const originalUA = navigator.userAgent;
  const originalInnerWidth = window.innerWidth;

  beforeEach(() => {
    // Simuler un mobile
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      configurable: true,
    });
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true });
    (window as any).AudioContext = class {};
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', { value: originalUA, configurable: true });
    Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, configurable: true });
    delete (window as any).AudioContext;
  });

  it('retourne true pour mobile + AVI > 300 Mo (format non natif)', () => {
    const file = makeFile('video.avi', THRESHOLD + 1);
    expect(shouldUseChunkedUpload(file)).toBe(true);
  });

  it('retourne true pour mobile + MKV > 300 Mo', () => {
    const file = makeFile('video.mkv', THRESHOLD + 1);
    expect(shouldUseChunkedUpload(file)).toBe(true);
  });

  it('retourne false pour mobile + MP4 > 300 Mo (AudioContext disponible)', () => {
    const file = makeFile('video.mp4', THRESHOLD + 1);
    expect(shouldUseChunkedUpload(file)).toBe(false);
  });

  it('retourne false pour mobile + fichier < 300 Mo (WASM suffisant)', () => {
    const file = makeFile('video.avi', THRESHOLD - 1);
    expect(shouldUseChunkedUpload(file)).toBe(false);
  });

  it('retourne false pour desktop + AVI > 300 Mo (WASM disponible)', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      configurable: true,
    });
    Object.defineProperty(window, 'innerWidth', { value: 1440, configurable: true });
    const file = makeFile('video.avi', THRESHOLD + 1);
    expect(shouldUseChunkedUpload(file)).toBe(false);
  });

  it('retourne true si AudioContext non disponible sur mobile + MP4 > 300 Mo', () => {
    delete (window as any).AudioContext;
    delete (window as any).webkitAudioContext;
    const file = makeFile('video.mp4', THRESHOLD + 1);
    expect(shouldUseChunkedUpload(file)).toBe(true);
  });
});

// ─── getChunkCount ────────────────────────────────────────────────────────────

describe('getChunkCount', () => {
  const CHUNK_SIZE = 10 * MB; // 10 Mo

  it('retourne 1 pour un fichier exactement de 10 Mo', () => {
    expect(getChunkCount(CHUNK_SIZE)).toBe(1);
  });

  it('retourne 2 pour un fichier de 10 Mo + 1 octet', () => {
    expect(getChunkCount(CHUNK_SIZE + 1)).toBe(2);
  });

  it('retourne 50 pour un fichier de 500 Mo', () => {
    expect(getChunkCount(500 * MB)).toBe(50);
  });

  it('retourne 1 pour un fichier de 1 octet', () => {
    expect(getChunkCount(1)).toBe(1);
  });

  it('retourne 100 pour un fichier de 1 Go', () => {
    expect(getChunkCount(1024 * MB)).toBe(Math.ceil(1024 / 10));
  });

  it('retourne le bon nombre pour 300 Mo (seuil mobile)', () => {
    expect(getChunkCount(300 * MB)).toBe(30);
  });
});

// ─── estimateUploadTime ───────────────────────────────────────────────────────

describe('estimateUploadTime', () => {
  it('estime correctement pour 100 Mo à 10 Mbps → 10 secondes', () => {
    expect(estimateUploadTime(100 * MB, 10)).toBe(10);
  });

  it('estime correctement pour 500 Mo à 20 Mbps → 25 secondes', () => {
    expect(estimateUploadTime(500 * MB, 20)).toBe(25);
  });

  it('arrondit vers le haut (ceil)', () => {
    // 15 Mo à 10 Mbps = 1.5s → arrondi à 2
    expect(estimateUploadTime(15 * MB, 10)).toBe(2);
  });

  it('utilise 10 Mbps par défaut', () => {
    expect(estimateUploadTime(100 * MB)).toBe(10);
  });

  it('retourne 1 pour un fichier très petit', () => {
    expect(estimateUploadTime(1, 10)).toBe(1);
  });
});
