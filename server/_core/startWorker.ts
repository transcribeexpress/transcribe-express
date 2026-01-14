import { startWorker } from "../worker";

// Start the transcription worker
// This will poll for pending transcriptions every 5 seconds
export const workerInterval = startWorker(5000);

console.log("[Server] Transcription worker started");
