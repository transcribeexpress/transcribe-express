import {
  getRecoverableTranscriptionIds,
  markExhaustedTranscriptions,
} from "../db";
import { triggerTranscriptionWorker } from "./transcriptionWorker";

const RECOVERY_THROTTLE_MS = 30_000;
const lastRecoveryByScope = new Map<string, number>();

export function resetRecoveryThrottleForTests(): void {
  lastRecoveryByScope.clear();
}

export function isRecoveryDue(
  lastRunAt: number | undefined,
  now: number,
  throttleMs = RECOVERY_THROTTLE_MS
): boolean {
  return lastRunAt === undefined || now - lastRunAt >= throttleMs;
}

export async function resumeInterruptedTranscriptions(options?: {
  userId?: string;
  source?: "startup" | "dashboard" | "heartbeat";
  force?: boolean;
  now?: Date;
  limit?: number;
}): Promise<{ scanned: number; started: number; exhausted: number; skipped: boolean }> {
  const source = options?.source ?? "startup";
  const scope = options?.userId ? `user:${options.userId}` : "global";
  const now = options?.now ?? new Date();
  const lastRunAt = lastRecoveryByScope.get(scope);

  if (!options?.force && !isRecoveryDue(lastRunAt, now.getTime())) {
    return { scanned: 0, started: 0, exhausted: 0, skipped: true };
  }

  lastRecoveryByScope.set(scope, now.getTime());

  const exhausted = await markExhaustedTranscriptions({
    userId: options?.userId,
    now,
  });
  const recoverableIds = await getRecoverableTranscriptionIds({
    userId: options?.userId,
    now,
    limit: options?.limit ?? (options?.userId ? 5 : 20),
  });

  let started = 0;
  for (const transcriptionId of recoverableIds) {
    try {
      if (await triggerTranscriptionWorker(transcriptionId)) {
        started += 1;
      }
    } catch (error) {
      console.error(
        `[Recovery] Failed to claim transcription ${transcriptionId} from ${source}:`,
        error
      );
    }
  }

  if (recoverableIds.length > 0 || exhausted > 0) {
    console.log(
      `[Recovery] source=${source} scope=${scope} scanned=${recoverableIds.length} started=${started} exhausted=${exhausted}`
    );
  }

  return {
    scanned: recoverableIds.length,
    started,
    exhausted,
    skipped: false,
  };
}
