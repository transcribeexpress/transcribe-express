import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRecoverableTranscriptionIds: vi.fn(),
  markExhaustedTranscriptions: vi.fn(),
  triggerTranscriptionWorker: vi.fn(),
}));

vi.mock("../db", () => ({
  getRecoverableTranscriptionIds: mocks.getRecoverableTranscriptionIds,
  markExhaustedTranscriptions: mocks.markExhaustedTranscriptions,
}));

vi.mock("./transcriptionWorker", () => ({
  triggerTranscriptionWorker: mocks.triggerTranscriptionWorker,
}));

import {
  isRecoveryDue,
  resetRecoveryThrottleForTests,
  resumeInterruptedTranscriptions,
} from "./transcriptionRecovery";

describe("durable transcription recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRecoveryThrottleForTests();
    mocks.markExhaustedTranscriptions.mockResolvedValue(0);
    mocks.getRecoverableTranscriptionIds.mockResolvedValue([]);
    mocks.triggerTranscriptionWorker.mockResolvedValue(true);
  });

  it("considers a never-scanned or expired scope due for recovery", () => {
    expect(isRecoveryDue(undefined, 10_000, 30_000)).toBe(true);
    expect(isRecoveryDue(10_000, 39_999, 30_000)).toBe(false);
    expect(isRecoveryDue(10_000, 40_000, 30_000)).toBe(true);
  });

  it("starts every recoverable job that wins its atomic lease", async () => {
    mocks.getRecoverableTranscriptionIds.mockResolvedValue([11, 12, 13]);
    mocks.triggerTranscriptionWorker
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const result = await resumeInterruptedTranscriptions({
      source: "startup",
      force: true,
      now: new Date("2026-08-31T08:00:00.000Z"),
    });

    expect(result).toEqual({
      scanned: 3,
      started: 2,
      exhausted: 0,
      skipped: false,
    });
    expect(mocks.triggerTranscriptionWorker).toHaveBeenCalledTimes(3);
  });

  it("treats a refused claim as a concurrent worker, not as an error", async () => {
    mocks.getRecoverableTranscriptionIds.mockResolvedValue([21]);
    mocks.triggerTranscriptionWorker.mockResolvedValue(false);

    const result = await resumeInterruptedTranscriptions({
      source: "heartbeat",
      force: true,
    });

    expect(result.started).toBe(0);
    expect(result.scanned).toBe(1);
  });

  it("reports exhausted jobs while preserving the source file for support", async () => {
    mocks.markExhaustedTranscriptions.mockResolvedValue(2);

    const result = await resumeInterruptedTranscriptions({
      source: "startup",
      force: true,
    });

    expect(result.exhausted).toBe(2);
    expect(mocks.markExhaustedTranscriptions).toHaveBeenCalledTimes(1);
  });

  it("throttles repeated dashboard scans for the same user", async () => {
    const now = new Date("2026-08-31T08:00:00.000Z");
    await resumeInterruptedTranscriptions({
      userId: "user-1",
      source: "dashboard",
      now,
    });

    const second = await resumeInterruptedTranscriptions({
      userId: "user-1",
      source: "dashboard",
      now: new Date(now.getTime() + 10_000),
    });

    expect(second.skipped).toBe(true);
    expect(mocks.markExhaustedTranscriptions).toHaveBeenCalledTimes(1);
    expect(mocks.getRecoverableTranscriptionIds).toHaveBeenCalledTimes(1);
  });
});

