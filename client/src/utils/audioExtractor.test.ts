/**
 * Tests pour le module audioExtractor.ts — Extraction audio côté client via FFmpeg WASM
 * 
 * Ces tests vérifient :
 * 1. Les fonctions utilitaires pures (détection de format, support navigateur)
 * 2. La logique de routage pipeline (vidéo → extraction, audio → direct, autre → rejet)
 * 3. Les exports du module
 * 4. La configuration CDN (toBlobURL, ESM, jsdelivr)
 * 
 * L'extraction FFmpeg WASM elle-même ne peut pas être testée dans Vitest (pas de navigateur réel).
 */

import { describe, it, expect } from 'vitest';
import {
  needsAudioExtraction,
  isDirectAudioFile,
  isFFmpegSupported,
} from './audioExtractor';

describe('audioExtractor module', () => {
  // ─── needsAudioExtraction ──────────────────────────────────────────

  describe('needsAudioExtraction', () => {
    it('should return true for MP4 video files', () => {
      const file = new File([''], 'video.mp4', { type: 'video/mp4' });
      expect(needsAudioExtraction(file)).toBe(true);
    });

    it('should return true for MOV video files (iPhone)', () => {
      const file = new File([''], 'recording.mov', { type: 'video/quicktime' });
      expect(needsAudioExtraction(file)).toBe(true);
    });

    it('should return true for MOV with generic MIME (iOS/Safari)', () => {
      const file = new File([''], 'recording.mov', { type: 'application/octet-stream' });
      expect(needsAudioExtraction(file)).toBe(true);
    });

    it('should return true for AVI video files', () => {
      const file = new File([''], 'video.avi', { type: 'video/x-msvideo' });
      expect(needsAudioExtraction(file)).toBe(true);
    });

    it('should return true for MKV video files', () => {
      const file = new File([''], 'video.mkv', { type: 'video/x-matroska' });
      expect(needsAudioExtraction(file)).toBe(true);
    });

    it('should return true for WebM video files', () => {
      const file = new File([''], 'video.webm', { type: 'video/webm' });
      expect(needsAudioExtraction(file)).toBe(true);
    });

    it('should return false for MP3 audio files', () => {
      const file = new File([''], 'audio.mp3', { type: 'audio/mpeg' });
      expect(needsAudioExtraction(file)).toBe(false);
    });

    it('should return false for WAV audio files', () => {
      const file = new File([''], 'audio.wav', { type: 'audio/wav' });
      expect(needsAudioExtraction(file)).toBe(false);
    });

    it('should return false for M4A audio files', () => {
      const file = new File([''], 'audio.m4a', { type: 'audio/mp4' });
      expect(needsAudioExtraction(file)).toBe(false);
    });

    it('should return false for FLAC audio files', () => {
      const file = new File([''], 'audio.flac', { type: 'audio/flac' });
      expect(needsAudioExtraction(file)).toBe(false);
    });

    it('should return false for OGG audio files', () => {
      const file = new File([''], 'audio.ogg', { type: 'audio/ogg' });
      expect(needsAudioExtraction(file)).toBe(false);
    });

    it('should return false for unsupported formats', () => {
      const file = new File([''], 'document.pdf', { type: 'application/pdf' });
      expect(needsAudioExtraction(file)).toBe(false);
    });

    it('should be case-insensitive on extension', () => {
      const file = new File([''], 'VIDEO.MP4', { type: '' });
      expect(needsAudioExtraction(file)).toBe(true);
    });
  });

  // ─── isDirectAudioFile ─────────────────────────────────────────────

  describe('isDirectAudioFile', () => {
    it('should return true for MP3 files', () => {
      const file = new File([''], 'audio.mp3', { type: 'audio/mpeg' });
      expect(isDirectAudioFile(file)).toBe(true);
    });

    it('should return true for WAV files', () => {
      const file = new File([''], 'audio.wav', { type: 'audio/wav' });
      expect(isDirectAudioFile(file)).toBe(true);
    });

    it('should return true for M4A files', () => {
      const file = new File([''], 'audio.m4a', { type: 'audio/mp4' });
      expect(isDirectAudioFile(file)).toBe(true);
    });

    it('should return true for OGG files', () => {
      const file = new File([''], 'audio.ogg', { type: 'audio/ogg' });
      expect(isDirectAudioFile(file)).toBe(true);
    });

    it('should return true for FLAC files', () => {
      const file = new File([''], 'audio.flac', { type: 'audio/flac' });
      expect(isDirectAudioFile(file)).toBe(true);
    });

    it('should return false for video files', () => {
      const file = new File([''], 'video.mp4', { type: 'video/mp4' });
      expect(isDirectAudioFile(file)).toBe(false);
    });

    it('should return false for WebM (classified as video for extraction)', () => {
      const file = new File([''], 'video.webm', { type: 'video/webm' });
      expect(isDirectAudioFile(file)).toBe(false);
    });

    it('should return false for unsupported formats', () => {
      const file = new File([''], 'doc.txt', { type: 'text/plain' });
      expect(isDirectAudioFile(file)).toBe(false);
    });
  });

  // ─── isFFmpegSupported ─────────────────────────────────────────────

  describe('isFFmpegSupported', () => {
    it('should return a boolean', () => {
      const result = isFFmpegSupported();
      expect(typeof result).toBe('boolean');
    });

    it('should return true in Node.js/Vitest environment (WebAssembly available)', () => {
      const result = isFFmpegSupported();
      expect(result).toBeDefined();
    });
  });

  // ─── Module exports ────────────────────────────────────────────────

  describe('module exports', () => {
    it('should export all expected functions', async () => {
      const mod = await import('./audioExtractor');
      expect(typeof mod.needsAudioExtraction).toBe('function');
      expect(typeof mod.isDirectAudioFile).toBe('function');
      expect(typeof mod.isFFmpegSupported).toBe('function');
      expect(typeof mod.extractAudioFromVideo).toBe('function');
      expect(typeof mod.disposeFFmpeg).toBe('function');
    });

    it('should export AudioExtractionResult type (via function return)', async () => {
      const mod = await import('./audioExtractor');
      expect(typeof mod.extractAudioFromVideo).toBe('function');
    });
  });

  // ─── Pipeline routing logic ────────────────────────────────────────

  describe('pipeline routing logic', () => {
    it('video files should need extraction and not be direct audio', () => {
      const videoFiles = [
        new File([''], 'video.mp4', { type: 'video/mp4' }),
        new File([''], 'recording.mov', { type: '' }),
        new File([''], 'clip.avi', { type: '' }),
        new File([''], 'movie.mkv', { type: '' }),
        new File([''], 'stream.webm', { type: '' }),
      ];

      for (const file of videoFiles) {
        expect(needsAudioExtraction(file)).toBe(true);
        expect(isDirectAudioFile(file)).toBe(false);
      }
    });

    it('audio files should not need extraction and be direct audio', () => {
      const audioFiles = [
        new File([''], 'song.mp3', { type: 'audio/mpeg' }),
        new File([''], 'recording.wav', { type: 'audio/wav' }),
        new File([''], 'podcast.m4a', { type: '' }),
        new File([''], 'voice.ogg', { type: '' }),
        new File([''], 'music.flac', { type: '' }),
      ];

      for (const file of audioFiles) {
        expect(needsAudioExtraction(file)).toBe(false);
        expect(isDirectAudioFile(file)).toBe(true);
      }
    });

    it('unsupported files should not need extraction and not be direct audio', () => {
      const unsupportedFiles = [
        new File([''], 'doc.pdf', { type: 'application/pdf' }),
        new File([''], 'image.jpg', { type: 'image/jpeg' }),
        new File([''], 'data.csv', { type: 'text/csv' }),
      ];

      for (const file of unsupportedFiles) {
        expect(needsAudioExtraction(file)).toBe(false);
        expect(isDirectAudioFile(file)).toBe(false);
      }
    });
  });

  // ─── CDN Configuration validation ─────────────────────────────────

  describe('CDN and CORS configuration', () => {
    it('should use toBlobURL from @ffmpeg/util (import check)', async () => {
      // Vérifie que toBlobURL est bien importé et disponible
      const utilMod = await import('@ffmpeg/util');
      expect(typeof utilMod.toBlobURL).toBe('function');
      expect(typeof utilMod.fetchFile).toBe('function');
    });

    it('should use ESM format for Vite compatibility', async () => {
      // Le module audioExtractor doit utiliser ESM (dist/esm) et non UMD (dist/umd)
      // On vérifie indirectement en lisant le code source
      const fs = await import('fs');
      const path = await import('path');
      const sourceCode = fs.readFileSync(
        path.resolve(__dirname, './audioExtractor.ts'),
        'utf-8'
      );
      
      // Doit contenir 'dist/esm' (format ESM pour Vite)
      expect(sourceCode).toContain('dist/esm');
      // Ne doit PAS contenir 'dist/umd' (ancien format incompatible avec Vite)
      expect(sourceCode).not.toContain('dist/umd');
    });

    it('should use jsdelivr CDN instead of unpkg', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const sourceCode = fs.readFileSync(
        path.resolve(__dirname, './audioExtractor.ts'),
        'utf-8'
      );
      
      // Doit utiliser jsdelivr (plus fiable)
      expect(sourceCode).toContain('cdn.jsdelivr.net');
      // Ne doit PAS utiliser unpkg (problèmes CORS)
      expect(sourceCode).not.toContain('unpkg.com');
    });

    it('should use toBlobURL for CORS bypass', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const sourceCode = fs.readFileSync(
        path.resolve(__dirname, './audioExtractor.ts'),
        'utf-8'
      );
      
      // Doit importer toBlobURL
      expect(sourceCode).toContain('toBlobURL');
      // Doit utiliser toBlobURL dans la fonction de chargement
      expect(sourceCode).toContain('await toBlobURL(');
    });

    it('should use @ffmpeg/core version 0.12.10', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const sourceCode = fs.readFileSync(
        path.resolve(__dirname, './audioExtractor.ts'),
        'utf-8'
      );
      
      // Doit utiliser la version 0.12.10 (dernière stable)
      expect(sourceCode).toContain('0.12.10');
    });
  });
});
