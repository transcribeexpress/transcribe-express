export const TRANSCRIPTION_LEASE_MS = 12 * 60 * 1000;
export const MAX_TRANSCRIPTION_ATTEMPTS = 3;

export type RecoverableTranscriptionState = {
  status: "pending" | "processing" | "completed" | "error" | "cancelled";
  workerLeaseOwner: string | null;
  workerLeaseExpiresAt: Date | null;
  workerAttemptCount: number;
};

export function canAcquireTranscriptionLease(
  transcription: RecoverableTranscriptionState,
  now: Date,
  maxAttempts = MAX_TRANSCRIPTION_ATTEMPTS
): boolean {
  if (transcription.workerAttemptCount >= maxAttempts) return false;
  if (transcription.status === "pending") return true;
  if (transcription.status !== "processing") return false;

  return (
    !transcription.workerLeaseOwner ||
    !transcription.workerLeaseExpiresAt ||
    transcription.workerLeaseExpiresAt.getTime() <= now.getTime()
  );
}

export type CompletionState = RecoverableTranscriptionState & {
  creditsDeductedAt: Date | null;
};

export type CompletionPlan =
  | { action: "already_completed"; minutesToDeduct: 0 }
  | { action: "rejected"; minutesToDeduct: 0 }
  | {
      action: "finalize";
      minutesToDeduct: number;
      creditsDeductedAt: Date;
      finalState: {
        status: "completed";
        workerLeaseOwner: null;
        workerLeaseExpiresAt: null;
      };
    };

export function planTranscriptionCompletion(
  transcription: CompletionState,
  leaseOwner: string,
  durationSeconds: number,
  now = new Date()
): CompletionPlan {
  if (transcription.status === "completed") {
    return { action: "already_completed", minutesToDeduct: 0 };
  }

  if (
    transcription.status !== "processing" ||
    transcription.workerLeaseOwner !== leaseOwner
  ) {
    return { action: "rejected", minutesToDeduct: 0 };
  }

  const normalizedDuration = Math.max(0, Math.floor(durationSeconds));
  return {
    action: "finalize",
    minutesToDeduct: transcription.creditsDeductedAt
      ? 0
      : Math.ceil(normalizedDuration / 60),
    creditsDeductedAt: transcription.creditsDeductedAt ?? now,
    finalState: {
      status: "completed",
      workerLeaseOwner: null,
      workerLeaseExpiresAt: null,
    },
  };
}

