import { describe, expect, it } from "vitest";
import {
  canAcquireTranscriptionLease,
  MAX_TRANSCRIPTION_ATTEMPTS,
  planTranscriptionCompletion,
  type CompletionState,
  type RecoverableTranscriptionState,
} from "./transcriptionLeasePolicy";

const now = new Date("2026-08-31T08:00:00.000Z");

function recoverable(
  overrides: Partial<RecoverableTranscriptionState> = {}
): RecoverableTranscriptionState {
  return {
    status: "processing",
    workerLeaseOwner: "worker-a",
    workerLeaseExpiresAt: new Date(now.getTime() + 60_000),
    workerAttemptCount: 1,
    ...overrides,
  };
}

describe("transcription lease policy", () => {
  it("allows a pending job and a processing job with an expired lease", () => {
    expect(canAcquireTranscriptionLease(recoverable({ status: "pending" }), now)).toBe(true);
    expect(canAcquireTranscriptionLease(recoverable({
      workerLeaseExpiresAt: new Date(now.getTime() - 1),
    }), now)).toBe(true);
  });

  it("refuses an active lease, a terminal status and an exhausted job", () => {
    expect(canAcquireTranscriptionLease(recoverable(), now)).toBe(false);
    expect(canAcquireTranscriptionLease(recoverable({ status: "completed" }), now)).toBe(false);
    expect(canAcquireTranscriptionLease(recoverable({
      workerAttemptCount: MAX_TRANSCRIPTION_ATTEMPTS,
      workerLeaseExpiresAt: new Date(now.getTime() - 1),
    }), now)).toBe(false);
  });

  it("plans one finalization, one debit and releases the lease", () => {
    const initial: CompletionState = {
      ...recoverable(),
      creditsDeductedAt: null,
    };
    const first = planTranscriptionCompletion(initial, "worker-a", 61, now);

    expect(first).toEqual({
      action: "finalize",
      minutesToDeduct: 2,
      creditsDeductedAt: now,
      finalState: {
        status: "completed",
        workerLeaseOwner: null,
        workerLeaseExpiresAt: null,
      },
    });

    if (first.action !== "finalize") throw new Error("Unexpected completion plan");
    const persisted: CompletionState = {
      ...initial,
      ...first.finalState,
      creditsDeductedAt: first.creditsDeductedAt,
    };
    const replay = planTranscriptionCompletion(persisted, "worker-a", 61, now);

    expect(replay).toEqual({ action: "already_completed", minutesToDeduct: 0 });
  });

  it("refuses finalization from a worker that does not own the lease", () => {
    const state: CompletionState = {
      ...recoverable(),
      creditsDeductedAt: null,
    };

    expect(planTranscriptionCompletion(state, "worker-b", 61, now)).toEqual({
      action: "rejected",
      minutesToDeduct: 0,
    });
  });
});

