/**
 * Tests pour le module audioValidation.ts — V3
 * 
 * V3 : Aucune limite de taille ni de durée.
 * Upload direct vers S3 via URL pré-signée.
 * Validation par extension uniquement.
 */

import { describe, it, expect } from 'vitest';
import {
  validateFormat,
  formatDuration,
  formatFileSize,
  isVideoFile,
  isAudioFile,
  SUPPORTED_FORMATS,
  SUPPORTED_EXTENSIONS,
} from './audioValidation';

describe('audioValidation module V3', () => {
  describe('validateFormat', () => {
    it('should accept supported audio extensions', () => {
      const mp3File = new File([''], 'test.mp3', { type: 'audio/mpeg' });
      const wavFile = new File([''], 'test.wav', { type: 'audio/wav' });
      const m4aFile = new File([''], 'test.m4a', { type: 'audio/x-m4a' });
      const flacFile = new File([''], 'test.flac', { type: 'audio/flac' });
      const oggFile = new File([''], 'test.ogg', { type: 'audio/ogg' });
      
      expect(validateFormat(mp3File)).toBe(true);
      expect(validateFormat(wavFile)).toBe(true);
      expect(validateFormat(m4aFile)).toBe(true);
      expect(validateFormat(flacFile)).toBe(true);
      expect(validateFormat(oggFile)).toBe(true);
    });

    it('should accept supported video extensions', () => {
      const mp4File = new File([''], 'test.mp4', { type: 'video/mp4' });
      const webmFile = new File([''], 'test.webm', { type: 'video/webm' });
      const movFile = new File([''], 'test.mov', { type: 'video/quicktime' });
      const aviFile = new File([''], 'test.avi', { type: 'video/x-msvideo' });
      const mkvFile = new File([''], 'test.mkv', { type: 'video/x-matroska' });
      
      expect(validateFormat(mp4File)).toBe(true);
      expect(validateFormat(webmFile)).toBe(true);
      expect(validateFormat(movFile)).toBe(true);
      expect(validateFormat(aviFile)).toBe(true);
      expect(validateFormat(mkvFile)).toBe(true);
    });

    it('should accept files with unknown MIME type but valid extension (iOS/Safari MOV)', () => {
      const movFile = new File([''], 'recording.mov', { type: 'application/octet-stream' });
      const mkvFile = new File([''], 'video.mkv', { type: '' });
      const mp3File = new File([''], 'audio.mp3', { type: '' });
      
      expect(validateFormat(movFile)).toBe(true);
      expect(validateFormat(mkvFile)).toBe(true);
      expect(validateFormat(mp3File)).toBe(true);
    });

    it('should reject unsupported formats', () => {
      const txtFile = new File([''], 'test.txt', { type: 'text/plain' });
      const pdfFile = new File([''], 'test.pdf', { type: 'application/pdf' });
      const jpgFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const docFile = new File([''], 'test.docx', { type: 'application/vnd.openxmlformats' });
      
      expect(validateFormat(txtFile)).toBe(false);
      expect(validateFormat(pdfFile)).toBe(false);
      expect(validateFormat(jpgFile)).toBe(false);
      expect(validateFormat(docFile)).toBe(false);
    });
  });

  describe('isVideoFile', () => {
    it('should identify video files by MIME type', () => {
      const mp4File = new File([''], 'test.mp4', { type: 'video/mp4' });
      const movFile = new File([''], 'test.mov', { type: 'video/quicktime' });
      expect(isVideoFile(mp4File)).toBe(true);
      expect(isVideoFile(movFile)).toBe(true);
    });

    it('should identify video files by extension when MIME is unknown', () => {
      const movFile = new File([''], 'test.mov', { type: 'application/octet-stream' });
      const mkvFile = new File([''], 'test.mkv', { type: '' });
      const aviFile = new File([''], 'test.avi', { type: '' });
      expect(isVideoFile(movFile)).toBe(true);
      expect(isVideoFile(mkvFile)).toBe(true);
      expect(isVideoFile(aviFile)).toBe(true);
    });

    it('should not identify audio files as video', () => {
      const mp3File = new File([''], 'test.mp3', { type: 'audio/mpeg' });
      const wavFile = new File([''], 'test.wav', { type: 'audio/wav' });
      expect(isVideoFile(mp3File)).toBe(false);
      expect(isVideoFile(wavFile)).toBe(false);
    });
  });

  describe('isAudioFile', () => {
    it('should identify audio files by extension', () => {
      const mp3File = new File([''], 'test.mp3', { type: 'audio/mpeg' });
      const flacFile = new File([''], 'test.flac', { type: '' });
      expect(isAudioFile(mp3File)).toBe(true);
      expect(isAudioFile(flacFile)).toBe(true);
    });

    it('should not identify video files as audio', () => {
      const mp4File = new File([''], 'test.mp4', { type: 'video/mp4' });
      expect(isAudioFile(mp4File)).toBe(false);
    });
  });

  describe('formatDuration', () => {
    it('should format durations correctly', () => {
      expect(formatDuration(0)).toBe('0:00');
      expect(formatDuration(30)).toBe('0:30');
      expect(formatDuration(60)).toBe('1:00');
      expect(formatDuration(90)).toBe('1:30');
      expect(formatDuration(3600)).toBe('60:00');
      expect(formatDuration(3665)).toBe('61:05');
    });
  });

  describe('formatFileSize', () => {
    it('should format small file sizes in B', () => {
      expect(formatFileSize(500)).toBe('500 B');
    });

    it('should format file sizes in Ko', () => {
      expect(formatFileSize(1024)).toBe('1.0 Ko');
      expect(formatFileSize(512 * 1024)).toBe('512.0 Ko');
    });

    it('should format file sizes in Mo', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1.0 Mo');
      expect(formatFileSize(500 * 1024 * 1024)).toBe('500.0 Mo');
    });

    it('should format large file sizes in Go', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.00 Go');
      expect(formatFileSize(2.5 * 1024 * 1024 * 1024)).toBe('2.50 Go');
    });
  });

  describe('SUPPORTED_FORMATS constant', () => {
    it('should include all required audio formats', () => {
      expect(SUPPORTED_FORMATS).toContain('audio/mpeg');
      expect(SUPPORTED_FORMATS).toContain('audio/wav');
      expect(SUPPORTED_FORMATS).toContain('audio/x-wav');
      expect(SUPPORTED_FORMATS).toContain('audio/ogg');
      expect(SUPPORTED_FORMATS).toContain('audio/flac');
    });

    it('should include all required video formats', () => {
      expect(SUPPORTED_FORMATS).toContain('video/mp4');
      expect(SUPPORTED_FORMATS).toContain('video/webm');
      expect(SUPPORTED_FORMATS).toContain('video/quicktime');
      expect(SUPPORTED_FORMATS).toContain('video/x-msvideo');
      expect(SUPPORTED_FORMATS).toContain('video/x-matroska');
    });
  });

  describe('SUPPORTED_EXTENSIONS constant', () => {
    it('should include all audio extensions', () => {
      expect(SUPPORTED_EXTENSIONS).toContain('mp3');
      expect(SUPPORTED_EXTENSIONS).toContain('wav');
      expect(SUPPORTED_EXTENSIONS).toContain('m4a');
      expect(SUPPORTED_EXTENSIONS).toContain('ogg');
      expect(SUPPORTED_EXTENSIONS).toContain('flac');
      expect(SUPPORTED_EXTENSIONS).toContain('webm');
    });

    it('should include all video extensions', () => {
      expect(SUPPORTED_EXTENSIONS).toContain('mp4');
      expect(SUPPORTED_EXTENSIONS).toContain('mov');
      expect(SUPPORTED_EXTENSIONS).toContain('avi');
      expect(SUPPORTED_EXTENSIONS).toContain('mkv');
    });
  });

  describe('V3 — No size or duration limits', () => {
    it('should not export MAX_FILE_SIZE constants (removed in V3)', async () => {
      // V3 removes all size limits — upload goes directly to S3
      const module = await import('./audioValidation');
      expect((module as any).MAX_FILE_SIZE_BYTES).toBeUndefined();
      expect((module as any).MAX_FILE_SIZE_MB).toBeUndefined();
      expect((module as any).MAX_DURATION_SECONDS).toBeUndefined();
      expect((module as any).MAX_DURATION_MINUTES).toBeUndefined();
    });
  });
});
