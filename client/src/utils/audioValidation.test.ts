/**
 * Tests pour le module audioValidation.ts
 * 
 * Teste la validation des fichiers audio/vidéo
 */

import { describe, it, expect } from 'vitest';
import {
  validateFormat,
  validateSize,
  validateDuration,
  formatDuration,
  formatFileSize,
  MAX_FILE_SIZE_BYTES,
  MAX_DURATION_SECONDS,
  SUPPORTED_FORMATS,
} from './audioValidation';

describe('audioValidation module', () => {
  describe('validateFormat', () => {
    it('should accept supported MIME types', () => {
      const mp3File = new File([''], 'test.mp3', { type: 'audio/mpeg' });
      const wavFile = new File([''], 'test.wav', { type: 'audio/wav' });
      const m4aFile = new File([''], 'test.m4a', { type: 'audio/x-m4a' });
      const webmFile = new File([''], 'test.webm', { type: 'video/webm' });
      
      expect(validateFormat(mp3File)).toBe(true);
      expect(validateFormat(wavFile)).toBe(true);
      expect(validateFormat(m4aFile)).toBe(true);
      expect(validateFormat(webmFile)).toBe(true);
    });

    it('should accept supported extensions even with unknown MIME type', () => {
      const mp3File = new File([''], 'test.mp3', { type: 'application/octet-stream' });
      const wavFile = new File([''], 'test.wav', { type: '' });
      
      expect(validateFormat(mp3File)).toBe(true);
      expect(validateFormat(wavFile)).toBe(true);
    });

    it('should reject unsupported formats', () => {
      const txtFile = new File([''], 'test.txt', { type: 'text/plain' });
      const pdfFile = new File([''], 'test.pdf', { type: 'application/pdf' });
      const aviFile = new File([''], 'test.avi', { type: 'video/x-msvideo' });
      
      expect(validateFormat(txtFile)).toBe(false);
      expect(validateFormat(pdfFile)).toBe(false);
      expect(validateFormat(aviFile)).toBe(false);
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
      expect(validateDuration(60)).toBe(true); // 1 minute
      expect(validateDuration(1800)).toBe(true); // 30 minutes
      expect(validateDuration(3000)).toBe(true); // 50 minutes
    });

    it('should accept durations exactly at the limit', () => {
      expect(validateDuration(MAX_DURATION_SECONDS)).toBe(true); // 60 minutes
    });

    it('should reject durations over the limit', () => {
      expect(validateDuration(MAX_DURATION_SECONDS + 1)).toBe(false);
      expect(validateDuration(7200)).toBe(false); // 120 minutes
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
      expect(formatFileSize(0)).toBe('0.00 MB');
      expect(formatFileSize(1024 * 1024)).toBe('1.00 MB');
      expect(formatFileSize(5 * 1024 * 1024)).toBe('5.00 MB');
      expect(formatFileSize(16 * 1024 * 1024)).toBe('16.00 MB');
      expect(formatFileSize(1536 * 1024)).toBe('1.50 MB');
    });
  });

  describe('SUPPORTED_FORMATS constant', () => {
    it('should include all required formats', () => {
      expect(SUPPORTED_FORMATS).toContain('audio/mpeg'); // mp3
      expect(SUPPORTED_FORMATS).toContain('audio/wav'); // wav
      expect(SUPPORTED_FORMATS).toContain('audio/x-m4a'); // m4a
      expect(SUPPORTED_FORMATS).toContain('video/webm'); // webm
      expect(SUPPORTED_FORMATS).toContain('audio/ogg'); // ogg
      expect(SUPPORTED_FORMATS).toContain('video/mp4'); // mp4
    });
  });

  describe('MAX_FILE_SIZE_BYTES constant', () => {
    it('should be 16MB', () => {
      expect(MAX_FILE_SIZE_BYTES).toBe(16 * 1024 * 1024);
    });
  });

  describe('MAX_DURATION_SECONDS constant', () => {
    it('should be 60 minutes', () => {
      expect(MAX_DURATION_SECONDS).toBe(60 * 60);
    });
  });
});
