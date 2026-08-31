import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  resumeInterruptedTranscriptions: vi.fn(),
}));

vi.mock("../_core/sdk", () => ({
  sdk: { authenticateRequest: mocks.authenticateRequest },
}));

vi.mock("../workers/transcriptionRecovery", () => ({
  resumeInterruptedTranscriptions: mocks.resumeInterruptedTranscriptions,
}));

import { handleTranscriptionRecovery } from "./transcriptionRecoveryRoute";

function createResponse() {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return response;
}

describe("scheduled transcription recovery route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resumeInterruptedTranscriptions.mockResolvedValue({
      scanned: 0,
      started: 0,
      exhausted: 0,
      skipped: false,
    });
  });

  it("rejects an authenticated ordinary user", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: false });
    const response = createResponse();

    await handleTranscriptionRecovery(
      { originalUrl: "/api/scheduled/transcription-recovery" } as never,
      response as never
    );

    expect(response.statusCode).toBe(403);
    expect(response.body).toEqual({ error: "cron-only" });
    expect(mocks.resumeInterruptedTranscriptions).not.toHaveBeenCalled();
  });

  it("runs a forced recovery for a signed scheduled identity", async () => {
    mocks.authenticateRequest.mockResolvedValue({
      isCron: true,
      taskUid: "task-recovery-1",
    });
    mocks.resumeInterruptedTranscriptions.mockResolvedValue({
      scanned: 3,
      started: 2,
      exhausted: 1,
      skipped: false,
    });
    const response = createResponse();

    await handleTranscriptionRecovery(
      { originalUrl: "/api/scheduled/transcription-recovery" } as never,
      response as never
    );

    expect(response.statusCode).toBe(200);
    expect(mocks.resumeInterruptedTranscriptions).toHaveBeenCalledWith({
      source: "heartbeat",
      force: true,
      limit: 20,
    });
    expect(response.body).toMatchObject({
      ok: true,
      taskUid: "task-recovery-1",
      started: 2,
    });
  });
});

