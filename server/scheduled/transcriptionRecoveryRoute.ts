import type { Request, Response } from "express";
import { sdk } from "../_core/sdk";
import { resumeInterruptedTranscriptions } from "../workers/transcriptionRecovery";

export async function handleTranscriptionRecovery(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      res.status(403).json({ error: "cron-only" });
      return;
    }

    const result = await resumeInterruptedTranscriptions({
      source: "heartbeat",
      force: true,
      limit: 20,
    });

    res.json({ ok: true, taskUid: user.taskUid, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      error: message,
      context: {
        url: req.originalUrl,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
