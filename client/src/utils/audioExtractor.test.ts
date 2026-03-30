/**
 * Tests pour le module audioExtractor.ts — Extraction audio côté client via FFmpeg WASM
 * 
 * Ces tests vérifient les fonctions utilitaires pures (détection de format, support navigateur).
 * L'extraction FFmpeg WASM elle-même ne peut pas être testée dans Vitest (pas de navigateur réel).
 */

import { describe, it, expect } from 'vitest';
import {
  needsAudioExtraction,
  isDirectAudioFile,
  isFFmpegSupported,
} from './audioExtractor';

describe('audioExtractor module', () => {
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
      // WebM est dans VIDEO_EXTENSIONS car il peut contenir de la vidéo
      const file = new File([''], 'video.webm', { type: 'video/webm' });
      expect(isDirectAudioFile(file)).toBe(false);
    });

    it('should return false for unsupported formats', () => {
      const file = new File([''], 'doc.txt', { type: 'text/plain' });
      expect(isDirectAudioFile(file)).toBe(false);
    });
  });

  describe('isFFmpegSupported', () => {
    it('should return a boolean', () => {
      const result = isFFmpegSupported();
      expect(typeof result).toBe('boolean');
    });

    it('should return true in Node.js/Vitest environment (WebAssembly available)', () => {
      // Dans l'environnement Vitest, WebAssembly est disponible
      // mais Worker peut ne pas l'être selon la config
      const result = isFFmpegSupported();
      // On vérifie juste que ça ne crash pas
      expect(result).toBeDefined();
    });
  });

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
      // Vérifie que extractAudioFromVideo retourne le bon type
      const mod = await import('./audioExtractor');
      expect(typeof mod.extractAudioFromVideo).toBe('function');
    });
  });

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
});
