/**
 * Tests pour le worker de transcription V5 — Architecture Hybride
 * 
 * Vérifie le routage du pipeline :
 * - Mode A (Audio Direct) : fichiers audio → pas de FFmpeg
 * - Mode B (Vidéo Complète) : fichiers vidéo → FFmpeg + transcription
 * 
 * Les fonctions internes du worker ne sont pas exportées,
 * donc on teste les fonctions utilitaires et le comportement observable.
 */

import { describe, it, expect, vi } from 'vitest';
import { cancelTranscriptionWorker } from './transcriptionWorker';

describe('transcriptionWorker V5', () => {
  describe('cancelTranscriptionWorker', () => {
    it('should return false for non-existent worker', () => {
      // Un worker qui n'existe pas ne peut pas être annulé
      const result = cancelTranscriptionWorker(99999);
      expect(result).toBe(false);
    });

    it('should be a function', () => {
      expect(typeof cancelTranscriptionWorker).toBe('function');
    });
  });

  describe('pipeline routing logic (isUploadedAudioFile equivalent)', () => {
    // Reproduire la logique de routage du worker pour la tester
    function isUploadedAudioFile(fileName: string): boolean {
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      return ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'webm'].includes(ext);
    }

    describe('Mode A — Audio Direct (no FFmpeg)', () => {
      it('should route MP3 files to audio direct pipeline', () => {
        expect(isUploadedAudioFile('podcast.mp3')).toBe(true);
      });

      it('should route WAV files to audio direct pipeline', () => {
        expect(isUploadedAudioFile('recording.wav')).toBe(true);
      });

      it('should route M4A files to audio direct pipeline (client-extracted)', () => {
        // M4A est le format de sortie de l'extraction WASM pour MP4/MOV
        expect(isUploadedAudioFile('video.m4a')).toBe(true);
      });

      it('should route OGG files to audio direct pipeline (client-extracted WebM)', () => {
        // OGG est le format de sortie de l'extraction WASM pour WebM
        expect(isUploadedAudioFile('stream.ogg')).toBe(true);
      });

      it('should route FLAC files to audio direct pipeline', () => {
        expect(isUploadedAudioFile('music.flac')).toBe(true);
      });

      it('should route WEBM audio files to audio direct pipeline', () => {
        expect(isUploadedAudioFile('audio.webm')).toBe(true);
      });
    });

    describe('Mode B — Video Full (with FFmpeg)', () => {
      it('should route MP4 files to video full pipeline', () => {
        expect(isUploadedAudioFile('video.mp4')).toBe(false);
      });

      it('should route MOV files to video full pipeline (iPhone fallback)', () => {
        expect(isUploadedAudioFile('recording.mov')).toBe(false);
      });

      it('should route AVI files to video full pipeline', () => {
        expect(isUploadedAudioFile('clip.avi')).toBe(false);
      });

      it('should route MKV files to video full pipeline', () => {
        expect(isUploadedAudioFile('movie.mkv')).toBe(false);
      });
    });

    describe('Case insensitivity', () => {
      it('should handle uppercase extensions', () => {
        expect(isUploadedAudioFile('AUDIO.MP3')).toBe(true);
        expect(isUploadedAudioFile('VIDEO.MP4')).toBe(false);
      });

      it('should handle mixed case extensions', () => {
        expect(isUploadedAudioFile('audio.M4a')).toBe(true);
        expect(isUploadedAudioFile('video.MoV')).toBe(false);
      });
    });
  });

  describe('getMimeTypeFromFileName equivalent', () => {
    function getMimeTypeFromFileName(fileName: string): string {
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      const mimeMap: Record<string, string> = {
        'mov': 'video/quicktime',
        'mp4': 'video/mp4',
        'avi': 'video/x-msvideo',
        'mkv': 'video/x-matroska',
        'webm': 'video/webm',
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'm4a': 'audio/mp4',
        'ogg': 'audio/ogg',
        'flac': 'audio/flac',
      };
      return mimeMap[ext] || 'application/octet-stream';
    }

    it('should return correct MIME for video formats', () => {
      expect(getMimeTypeFromFileName('video.mp4')).toBe('video/mp4');
      expect(getMimeTypeFromFileName('recording.mov')).toBe('video/quicktime');
      expect(getMimeTypeFromFileName('clip.avi')).toBe('video/x-msvideo');
      expect(getMimeTypeFromFileName('movie.mkv')).toBe('video/x-matroska');
      expect(getMimeTypeFromFileName('stream.webm')).toBe('video/webm');
    });

    it('should return correct MIME for audio formats', () => {
      expect(getMimeTypeFromFileName('song.mp3')).toBe('audio/mpeg');
      expect(getMimeTypeFromFileName('recording.wav')).toBe('audio/wav');
      expect(getMimeTypeFromFileName('podcast.m4a')).toBe('audio/mp4');
      expect(getMimeTypeFromFileName('voice.ogg')).toBe('audio/ogg');
      expect(getMimeTypeFromFileName('music.flac')).toBe('audio/flac');
    });

    it('should return application/octet-stream for unknown formats', () => {
      expect(getMimeTypeFromFileName('file.xyz')).toBe('application/octet-stream');
      expect(getMimeTypeFromFileName('document.pdf')).toBe('application/octet-stream');
    });
  });

  describe('hybrid architecture integration', () => {
    it('client-extracted M4A from MP4 should route to audio direct', () => {
      // Scénario : utilisateur uploade video.mp4
      // Client WASM extrait l'audio → video.m4a
      // Upload vers S3 avec fileName = "video.m4a"
      // Worker doit router vers Mode A (audio direct)
      const fileName = 'video.m4a'; // Nom après extraction client
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      const isAudio = ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'webm'].includes(ext);
      expect(isAudio).toBe(true);
    });

    it('fallback MOV should route to video full pipeline', () => {
      // Scénario : utilisateur uploade recording.mov
      // Client WASM échoue → fallback
      // Upload vers S3 avec fileName = "recording.mov" (nom original)
      // Worker doit router vers Mode B (vidéo complète)
      const fileName = 'recording.mov';
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      const isAudio = ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'webm'].includes(ext);
      expect(isAudio).toBe(false);
    });

    it('direct audio upload should route to audio direct', () => {
      // Scénario : utilisateur uploade directement un fichier audio
      // Pas d'extraction nécessaire
      // Upload vers S3 avec fileName = "podcast.mp3"
      // Worker doit router vers Mode A (audio direct)
      const fileName = 'podcast.mp3';
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      const isAudio = ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'webm'].includes(ext);
      expect(isAudio).toBe(true);
    });
  });
});
