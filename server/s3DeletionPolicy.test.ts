import { describe, expect, it } from "vitest";
import { getManagedAccountArtifactKey, getManagedTranscriptionKey, isOwnedTranscriptionKey } from "./s3Direct";

describe("S3 versioned deletion policy", () => {
  const owner = "user_abc123";
  const key = `transcriptions/${owner}/1700000000000-safe.mp3`;

  it("accepts only a durable transcription key belonging to the expected owner", () => {
    expect(getManagedTranscriptionKey(key, owner)).toBe(key);
    expect(isOwnedTranscriptionKey(key, owner)).toBe(true);
  });

  it("rejects temporary, result and traversal keys", () => {
    for (const candidate of ["uploads/file.mp3", "results/file.txt", "transcriptions/../other/file.mp3"]) {
      expect(() => getManagedTranscriptionKey(candidate, owner)).toThrow();
    }
  });

  it("rejects a durable key owned by another user", () => {
    expect(isOwnedTranscriptionKey("transcriptions/user_other/file.mp3", owner)).toBe(false);
    expect(() => getManagedTranscriptionKey("transcriptions/user_other/file.mp3", owner)).toThrow();
  });

  it("accepts only account-owned result artifacts, whether stored as a key or S3 URL", () => {
    expect(getManagedAccountArtifactKey(`results/${owner}/export.srt`, owner)).toBe(`results/${owner}/export.srt`);
    expect(
      getManagedAccountArtifactKey(
        `https://transcribe-express-files.s3.eu-west-3.amazonaws.com/results/${owner}/export.vtt`,
        owner
      )
    ).toBe(`results/${owner}/export.vtt`);
    expect(() => getManagedAccountArtifactKey("https://example.com/results/file.srt", owner)).toThrow();
  });
});
