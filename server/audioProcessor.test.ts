import { describe, expect, it } from "vitest";
import {
  isVideoFormat,
  isAudioFormat,
  isSupportedFormat,
  SUPPORTED_EXTENSIONS,
  SUPPORTED_VIDEO_MIMES,
  SUPPORTED_AUDIO_MIMES,
  MAX_FILE_SIZE_MB,
  MAX_FILE_SIZE_BYTES,
} from "./audioProcessor";

describe("audioProcessor", () => {
  describe("isVideoFormat", () => {
    it("recognizes MOV (iPhone native) by MIME type", () => {
      expect(isVideoFormat("video/quicktime", "video.mov")).toBe(true);
    });

    it("recognizes MP4 by MIME type", () => {
      expect(isVideoFormat("video/mp4", "video.mp4")).toBe(true);
    });

    it("recognizes AVI by MIME type", () => {
      expect(isVideoFormat("video/x-msvideo", "video.avi")).toBe(true);
    });

    it("recognizes MKV by MIME type", () => {
      expect(isVideoFormat("video/x-matroska", "video.mkv")).toBe(true);
    });

    it("recognizes WEBM video by MIME type", () => {
      expect(isVideoFormat("video/webm", "video.webm")).toBe(true);
    });

    it("recognizes MOV by extension when MIME is generic", () => {
      expect(isVideoFormat("application/octet-stream", "recording.mov")).toBe(true);
    });

    it("recognizes MKV by extension when MIME is generic", () => {
      expect(isVideoFormat("application/octet-stream", "video.mkv")).toBe(true);
    });

    it("rejects audio files", () => {
      expect(isVideoFormat("audio/mpeg", "song.mp3")).toBe(false);
    });

    it("rejects unknown formats", () => {
      expect(isVideoFormat("application/pdf", "document.pdf")).toBe(false);
    });
  });

  describe("isAudioFormat", () => {
    it("recognizes MP3 by MIME type", () => {
      expect(isAudioFormat("audio/mpeg", "audio.mp3")).toBe(true);
    });

    it("recognizes WAV by MIME type", () => {
      expect(isAudioFormat("audio/wav", "audio.wav")).toBe(true);
    });

    it("recognizes M4A by MIME type", () => {
      expect(isAudioFormat("audio/mp4", "audio.m4a")).toBe(true);
    });

    it("recognizes FLAC by MIME type", () => {
      expect(isAudioFormat("audio/flac", "audio.flac")).toBe(true);
    });

    it("recognizes OGG by MIME type", () => {
      expect(isAudioFormat("audio/ogg", "audio.ogg")).toBe(true);
    });

    it("recognizes M4A by extension when MIME is generic", () => {
      expect(isAudioFormat("application/octet-stream", "recording.m4a")).toBe(true);
    });

    it("rejects video files", () => {
      expect(isAudioFormat("video/mp4", "video.mp4")).toBe(false);
    });
  });

  describe("isSupportedFormat", () => {
    it("accepts all video formats", () => {
      expect(isSupportedFormat("video/quicktime", "video.mov")).toBe(true);
      expect(isSupportedFormat("video/mp4", "video.mp4")).toBe(true);
      expect(isSupportedFormat("video/x-msvideo", "video.avi")).toBe(true);
      expect(isSupportedFormat("video/x-matroska", "video.mkv")).toBe(true);
      expect(isSupportedFormat("video/webm", "video.webm")).toBe(true);
    });

    it("accepts all audio formats", () => {
      expect(isSupportedFormat("audio/mpeg", "audio.mp3")).toBe(true);
      expect(isSupportedFormat("audio/wav", "audio.wav")).toBe(true);
      expect(isSupportedFormat("audio/mp4", "audio.m4a")).toBe(true);
      expect(isSupportedFormat("audio/ogg", "audio.ogg")).toBe(true);
      expect(isSupportedFormat("audio/flac", "audio.flac")).toBe(true);
    });

    it("rejects unsupported formats", () => {
      expect(isSupportedFormat("application/pdf", "doc.pdf")).toBe(false);
      expect(isSupportedFormat("image/jpeg", "photo.jpg")).toBe(false);
      expect(isSupportedFormat("text/plain", "notes.txt")).toBe(false);
    });
  });

  describe("constants", () => {
    it("has correct max file size of 500 MB", () => {
      expect(MAX_FILE_SIZE_MB).toBe(500);
      expect(MAX_FILE_SIZE_BYTES).toBe(500 * 1024 * 1024);
    });

    it("includes all expected extensions", () => {
      const expected = ['mov', 'mp4', 'avi', 'mkv', 'webm', 'mp3', 'wav', 'm4a', 'ogg', 'flac'];
      for (const ext of expected) {
        expect(SUPPORTED_EXTENSIONS).toContain(ext);
      }
    });

    it("includes MOV in video MIME types", () => {
      expect(SUPPORTED_VIDEO_MIMES).toContain("video/quicktime");
    });

    it("includes FLAC in audio MIME types", () => {
      expect(SUPPORTED_AUDIO_MIMES).toContain("audio/flac");
    });
  });
});
