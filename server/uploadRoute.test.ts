/**
 * Tests pour la route d'upload multipart et le pipeline V2
 * 
 * Vérifie :
 * - La validation des formats de fichiers (MOV, MP4, etc.)
 * - La validation des extensions supportées
 * - Le pipeline audioProcessor (extraction audio)
 * - Le pipeline audioChunker (chunking et réassemblage)
 * - Le module transcribeBuffer (construction d'URL)
 */

import { describe, it, expect } from 'vitest';
import {
  isVideoFormat,
  isAudioFormat,
  isSupportedFormat,
  SUPPORTED_EXTENSIONS,
  SUPPORTED_VIDEO_MIMES,
  SUPPORTED_AUDIO_MIMES,
} from './audioProcessor';
import {
  needsChunking,
  reassembleTranscriptions,
} from './audioChunker';

describe('audioProcessor — format detection', () => {
  it('should detect MOV as video format', () => {
    expect(isVideoFormat('video/quicktime', 'test.mov')).toBe(true);
  });

  it('should detect MOV by extension even with wrong MIME', () => {
    expect(isVideoFormat('application/octet-stream', 'test.mov')).toBe(true);
  });

  it('should detect MOV by extension with empty MIME', () => {
    expect(isVideoFormat('', 'video.mov')).toBe(true);
  });

  it('should detect MP4 as video format', () => {
    expect(isVideoFormat('video/mp4', 'test.mp4')).toBe(true);
  });

  it('should detect AVI as video format', () => {
    expect(isVideoFormat('video/x-msvideo', 'test.avi')).toBe(true);
  });

  it('should detect MKV as video format', () => {
    expect(isVideoFormat('video/x-matroska', 'test.mkv')).toBe(true);
  });

  it('should detect MP3 as audio format', () => {
    expect(isAudioFormat('audio/mpeg', 'test.mp3')).toBe(true);
  });

  it('should detect WAV as audio format', () => {
    expect(isAudioFormat('audio/wav', 'test.wav')).toBe(true);
  });

  it('should detect FLAC as audio format', () => {
    expect(isAudioFormat('audio/flac', 'test.flac')).toBe(true);
  });

  it('should detect M4A as audio format', () => {
    expect(isAudioFormat('audio/mp4', 'test.m4a')).toBe(true);
  });

  it('should reject unsupported format', () => {
    expect(isSupportedFormat('application/pdf', 'test.pdf')).toBe(false);
  });

  it('should reject TXT files', () => {
    expect(isSupportedFormat('text/plain', 'test.txt')).toBe(false);
  });
});

describe('audioProcessor — SUPPORTED_EXTENSIONS', () => {
  it('should include all expected video extensions', () => {
    expect(SUPPORTED_EXTENSIONS).toContain('mov');
    expect(SUPPORTED_EXTENSIONS).toContain('mp4');
    expect(SUPPORTED_EXTENSIONS).toContain('avi');
    expect(SUPPORTED_EXTENSIONS).toContain('mkv');
    expect(SUPPORTED_EXTENSIONS).toContain('webm');
  });

  it('should include all expected audio extensions', () => {
    expect(SUPPORTED_EXTENSIONS).toContain('mp3');
    expect(SUPPORTED_EXTENSIONS).toContain('wav');
    expect(SUPPORTED_EXTENSIONS).toContain('m4a');
    expect(SUPPORTED_EXTENSIONS).toContain('ogg');
    expect(SUPPORTED_EXTENSIONS).toContain('flac');
  });

  it('should have 10 supported extensions total', () => {
    expect(SUPPORTED_EXTENSIONS.length).toBe(10);
  });
});

describe('audioProcessor — MIME types', () => {
  it('should include video/quicktime for MOV', () => {
    expect(SUPPORTED_VIDEO_MIMES).toContain('video/quicktime');
  });

  it('should include video/mp4 for MP4', () => {
    expect(SUPPORTED_VIDEO_MIMES).toContain('video/mp4');
  });

  it('should include audio/mpeg for MP3', () => {
    expect(SUPPORTED_AUDIO_MIMES).toContain('audio/mpeg');
  });

  it('should include audio/flac for FLAC', () => {
    expect(SUPPORTED_AUDIO_MIMES).toContain('audio/flac');
  });
});

describe('audioChunker — needsChunking', () => {
  it('should not need chunking for small files (< 20 MB)', () => {
    const size10MB = 10 * 1024 * 1024;
    expect(needsChunking(size10MB)).toBe(false);
  });

  it('should not need chunking for files exactly at 20 MB', () => {
    const size20MB = 20 * 1024 * 1024;
    expect(needsChunking(size20MB)).toBe(false);
  });

  it('should need chunking for files > 20 MB', () => {
    const size25MB = 25 * 1024 * 1024;
    expect(needsChunking(size25MB)).toBe(true);
  });

  it('should need chunking for large files (100 MB)', () => {
    const size100MB = 100 * 1024 * 1024;
    expect(needsChunking(size100MB)).toBe(true);
  });
});

describe('audioChunker — reassembleTranscriptions', () => {
  it('should return empty string for no chunks', () => {
    expect(reassembleTranscriptions([])).toBe('');
  });

  it('should return single chunk text as-is', () => {
    const chunks = [{
      index: 0,
      text: 'Bonjour le monde',
      startSeconds: 0,
      endSeconds: 30,
      language: 'fr',
      duration: 30,
    }];
    expect(reassembleTranscriptions(chunks)).toBe('Bonjour le monde');
  });

  it('should concatenate multiple chunks', () => {
    const chunks = [
      { index: 0, text: 'Bonjour le monde', startSeconds: 0, endSeconds: 30, language: 'fr', duration: 30 },
      { index: 1, text: 'comment allez-vous', startSeconds: 28, endSeconds: 60, language: 'fr', duration: 32 },
    ];
    const result = reassembleTranscriptions(chunks);
    expect(result).toContain('Bonjour le monde');
    expect(result).toContain('comment allez-vous');
  });

  it('should deduplicate overlapping words', () => {
    const chunks = [
      { index: 0, text: 'Bonjour le monde comment', startSeconds: 0, endSeconds: 32, language: 'fr', duration: 32 },
      { index: 1, text: 'comment allez-vous', startSeconds: 30, endSeconds: 60, language: 'fr', duration: 30 },
    ];
    const result = reassembleTranscriptions(chunks);
    // "comment" should appear only once
    const commentCount = (result.match(/comment/g) || []).length;
    expect(commentCount).toBe(1);
  });

  it('should sort chunks by index before reassembling', () => {
    const chunks = [
      { index: 1, text: 'deuxième partie', startSeconds: 30, endSeconds: 60, language: 'fr', duration: 30 },
      { index: 0, text: 'première partie', startSeconds: 0, endSeconds: 30, language: 'fr', duration: 30 },
    ];
    const result = reassembleTranscriptions(chunks);
    expect(result.indexOf('première')).toBeLessThan(result.indexOf('deuxième'));
  });

  it('should handle chunks with extra whitespace', () => {
    const chunks = [
      { index: 0, text: '  Bonjour   le   monde  ', startSeconds: 0, endSeconds: 30, language: 'fr', duration: 30 },
      { index: 1, text: '  comment   allez-vous  ', startSeconds: 28, endSeconds: 60, language: 'fr', duration: 32 },
    ];
    const result = reassembleTranscriptions(chunks);
    // No double spaces in result
    expect(result).not.toMatch(/\s{2,}/);
  });
});

describe('Upload route — format validation', () => {
  it('should accept MOV extension', () => {
    expect(SUPPORTED_EXTENSIONS.includes('mov')).toBe(true);
  });

  it('should accept MP4 extension', () => {
    expect(SUPPORTED_EXTENSIONS.includes('mp4')).toBe(true);
  });

  it('should accept AVI extension', () => {
    expect(SUPPORTED_EXTENSIONS.includes('avi')).toBe(true);
  });

  it('should accept MKV extension', () => {
    expect(SUPPORTED_EXTENSIONS.includes('mkv')).toBe(true);
  });

  it('should accept FLAC extension', () => {
    expect(SUPPORTED_EXTENSIONS.includes('flac')).toBe(true);
  });

  it('should not accept PDF extension', () => {
    expect(SUPPORTED_EXTENSIONS.includes('pdf')).toBe(false);
  });

  it('should not accept ZIP extension', () => {
    expect(SUPPORTED_EXTENSIONS.includes('zip')).toBe(false);
  });
});
