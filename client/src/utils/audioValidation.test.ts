/**
 * Tests pour le module audioValidation.ts — V2
 * 
 * Teste la validation des fichiers audio/vidéo avec les nouvelles limites :
 * - 500 Mo (au lieu de 16 Mo)
 * - 120 min (au lieu de 60 min)
 * - Formats vidéo supplémentaires : MOV, AVI, MKV
 */

import { describe, it, expect } from 'vitest';
import {
  validateFormat,
  validateSize,
  validateDuration,
  formatDuration,
  formatFileSize,
  isVideoFile,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  MAX_DURATION_SECONDS,
  MAX_DURATION_MINUTES,
  SUPPORTED_FORMATS,
  SUPPORTED_EXTENSIONS,
} from './audioValidation';

describe('audioValidation module V2', () => {
  describe('validateFormat', () => {
    it('should accept supported audio MIME types', () => {
      const mp3File = new File([''], 'test.mp3', { type: 'audio/mpeg' });
      const wavFile = new File([''], 'test.wav', { type: 'audio/wav' });
      const m4aFile = new File([''], 'test.m4a', { type: 'audio/x-m4a' });
      const flacFile = new File([''], 'test.flac', { type: 'audio/flac' });
      
      expect(validateFormat(mp3File)).toBe(true);
      expect(validateFormat(wavFile)).toBe(true);
      expect(validateFormat(m4aFile)).toBe(true);
      expect(validateFormat(flacFile)).toBe(true);
    });

    it('should accept supported video MIME types (V2)', () => {
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

    it('should accept supported extensions even with unknown MIME type', () => {
      const mp3File = new File([''], 'test.mp3', { type: 'application/octet-stream' });
      const wavFile = new File([''], 'test.wav', { type: '' });
      const movFile = new File([''], 'recording.mov', { type: 'application/octet-stream' });
      const mkvFile = new File([''], 'video.mkv', { type: '' });
      
      expect(validateFormat(mp3File)).toBe(true);
      expect(validateFormat(wavFile)).toBe(true);
      expect(validateFormat(movFile)).toBe(true);
      expect(validateFormat(mkvFile)).toBe(true);
    });

    it('should reject unsupported formats', () => {
      const txtFile = new File([''], 'test.txt', { type: 'text/plain' });
      const pdfFile = new File([''], 'test.pdf', { type: 'application/pdf' });
      const jpgFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      
      expect(validateFormat(txtFile)).toBe(false);
      expect(validateFormat(pdfFile)).toBe(false);
      expect(validateFormat(jpgFile)).toBe(false);
    });
  });

  describe('validateSize', () => {
    it('should accept files under the size limit', () => {
      const smallFile = new File(['a'.repeat(1024)], 'small.mp3', { type: 'audio/mpeg' });
      expect(validateSize(smallFile)).toBe(true);
      
      const mediumFile = new File(['a'.repeat(10 * 1024 * 1024)], 'medium.mp3', { type: 'audio/mpeg' });
      expect(validateSize(mediumFile)).toBe(true);
    });

    it('should accept files exactly at the size limit', () => {
      const exactFile = new File(['a'.repeat(MAX_FILE_SIZE_BYTES)], 'exact.mp3', { type: 'audio/mpeg' });
      expect(validateSize(exactFile)).toBe(true);
    });

    it('should reject files over the size limit', () => {
      const largeFile = new File(['a'.repeat(MAX_FILE_SIZE_BYTES + 1)], 'large.mp3', { type: 'audio/mpeg' });
      expect(validateSize(largeFile)).toBe(false);
    });
  });

  describe('validateDuration', () => {
    it('should accept durations under the limit', () => {
      expect(validateDuration(60)).toBe(true);    // 1 minute
      expect(validateDuration(1800)).toBe(true);   // 30 minutes
      expect(validateDuration(3600)).toBe(true);   // 60 minutes
      expect(validateDuration(5400)).toBe(true);   // 90 minutes
    });

    it('should accept durations exactly at the limit', () => {
      expect(validateDuration(MAX_DURATION_SECONDS)).toBe(true); // 120 minutes
    });

    it('should reject durations over the limit', () => {
      expect(validateDuration(MAX_DURATION_SECONDS + 1)).toBe(false);
      expect(validateDuration(9000)).toBe(false); // 150 minutes
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
    it('should format file sizes correctly', () => {
      expect(formatFileSize(0)).toBe('0.0 Ko');
      expect(formatFileSize(1024 * 1024)).toBe('1.0 Mo');
      expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 Mo');
      expect(formatFileSize(500 * 1024 * 1024)).toBe('500.0 Mo');
    });
  });

  describe('isVideoFile', () => {
    it('should identify video files by MIME type', () => {
      const mp4File = new File([''], 'test.mp4', { type: 'video/mp4' });
      const movFile = new File([''], 'test.mov', { type: 'video/quicktime' });
      expect(isVideoFile(mp4File)).toBe(true);
      expect(isVideoFile(movFile)).toBe(true);
    });

    it('should identify video files by extension', () => {
      const movFile = new File([''], 'test.mov', { type: 'application/octet-stream' });
      const mkvFile = new File([''], 'test.mkv', { type: '' });
      expect(isVideoFile(movFile)).toBe(true);
      expect(isVideoFile(mkvFile)).toBe(true);
    });

    it('should not identify audio files as video', () => {
      const mp3File = new File([''], 'test.mp3', { type: 'audio/mpeg' });
      expect(isVideoFile(mp3File)).toBe(false);
    });
  });

  describe('SUPPORTED_FORMATS constant', () => {
    it('should include all required audio formats', () => {
      expect(SUPPORTED_FORMATS).toContain('audio/mpeg');   // mp3
      expect(SUPPORTED_FORMATS).toContain('audio/wav');    // wav
      expect(SUPPORTED_FORMATS).toContain('audio/x-m4a'); // m4a
      expect(SUPPORTED_FORMATS).toContain('audio/ogg');    // ogg
      expect(SUPPORTED_FORMATS).toContain('audio/flac');   // flac
    });

    it('should include all required video formats (V2)', () => {
      expect(SUPPORTED_FORMATS).toContain('video/mp4');           // mp4
      expect(SUPPORTED_FORMATS).toContain('video/webm');          // webm
      expect(SUPPORTED_FORMATS).toContain('video/quicktime');     // mov
      expect(SUPPORTED_FORMATS).toContain('video/x-msvideo');    // avi
      expect(SUPPORTED_FORMATS).toContain('video/x-matroska');   // mkv
    });
  });

  describe('SUPPORTED_EXTENSIONS constant', () => {
    it('should include MOV, AVI, MKV extensions (V2)', () => {
      expect(SUPPORTED_EXTENSIONS).toContain('mov');
      expect(SUPPORTED_EXTENSIONS).toContain('avi');
      expect(SUPPORTED_EXTENSIONS).toContain('mkv');
      expect(SUPPORTED_EXTENSIONS).toContain('flac');
    });
  });

  describe('V2 constants', () => {
    it('should have max file size of 500 MB', () => {
      expect(MAX_FILE_SIZE_MB).toBe(500);
      expect(MAX_FILE_SIZE_BYTES).toBe(500 * 1024 * 1024);
    });

    it('should have max duration of 120 minutes', () => {
      expect(MAX_DURATION_MINUTES).toBe(120);
      expect(MAX_DURATION_SECONDS).toBe(120 * 60);
    });
  });
});
