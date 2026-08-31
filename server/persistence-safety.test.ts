import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");
const read = (relativePath: string) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

const databaseIntegrationTests = [
  "server/transcriptions.create.test.ts",
  "server/transcriptions.delete.test.ts",
  "server/transcriptions.getById.test.ts",
  "server/transcriptions.list.test.ts",
  "server/transcriptions.stats.test.ts",
];

describe("publication and persistence safety", () => {
  it("keeps migrations outside build, start and publication scripts", () => {
    const packageJson = JSON.parse(read("package.json")) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts.build).not.toMatch(/db:push|drizzle-kit|migrate/i);
    expect(packageJson.scripts.start).not.toMatch(/db:push|drizzle-kit|migrate/i);
    expect(packageJson.scripts["audit:schema"]).toContain("audit-schema-parity.mts");
  });

  it("does not run schema mutations while booting the server", () => {
    const serverEntry = read("server/_core/index.ts");

    expect(serverEntry).not.toMatch(/db:push|drizzle-kit|migrate|DROP TABLE|TRUNCATE/i);
  });

  it("blocks every database integration test without a dedicated test database", () => {
    for (const file of databaseIntegrationTests) {
      const source = read(file);
      expect(source, file).toContain("hasDedicatedTestDatabase");
      expect(source, file).toContain("describeWithDatabase");
    }
  });

  it("never performs an unscoped transcription-table delete in tests", () => {
    for (const file of databaseIntegrationTests) {
      const source = read(file);
      expect(source, file).not.toMatch(/DELETE\s+FROM\s+transcriptions/i);
      expect(source, file).not.toMatch(/delete\(transcriptions\)(?!\.where)/i);
    }
  });

  it("tracks all durable transcription fields in the Drizzle schema", () => {
    const schema = read("drizzle/schema.ts");

    for (const column of [
      "fileKey",
      "status",
      "transcriptText",
      "editedText",
      "segmentsData",
      "resultUrl",
      "resultSrt",
      "resultVtt",
      "resultTxt",
      "workerLeaseOwner",
      "workerLeaseExpiresAt",
      "workerAttemptCount",
      "creditsDeductedAt",
    ]) {
      expect(schema).toContain(`${column}:`);
    }
  });

  it("claims a durable lease before starting any transcription worker", () => {
    const worker = read("server/workers/transcriptionWorker.ts");

    expect(worker).toContain("await claimTranscriptionLease(transcriptionId, leaseOwner)");
    expect(worker).not.toContain("await deductCredits(");
    expect(worker).not.toContain("updateTranscriptionStatus(transcriptionId, 'completed'");
  });

  it("uses startup, dashboard and authenticated heartbeat recovery paths", () => {
    const serverEntry = read("server/_core/index.ts");
    const router = read("server/routers.ts");
    const scheduledRoute = read("server/scheduled/transcriptionRecoveryRoute.ts");

    expect(serverEntry).toContain('source: "startup"');
    expect(serverEntry).toContain('/api/scheduled/transcription-recovery');
    expect(router).toContain('source: "dashboard"');
    expect(scheduledRoute).toContain("!user.isCron || !user.taskUid");
    expect(scheduledRoute).toContain('source: "heartbeat"');
  });

  it("finalizes result and credit deduction in one locked transaction", () => {
    const database = read("server/db.ts");
    const completion = database.slice(
      database.indexOf("export async function completeTranscriptionAndDeductCredits"),
      database.indexOf("export async function failClaimedTranscription")
    );

    expect(completion).toContain("db.transaction");
    expect(completion).toContain('.for("update")');
    expect(completion).toContain("creditsDeductedAt");
    expect(completion).toContain("...completionPlan.finalState");

    const policy = read("server/workers/transcriptionLeasePolicy.ts");
    expect(policy).toContain("workerLeaseOwner: null");
    expect(policy).toContain("workerLeaseExpiresAt: null");
  });

  it("persists final transcription data before deleting the local temporary copy", () => {
    const worker = read("server/workers/transcriptionWorker.ts");
    const durableWrite = worker.indexOf("await completeTranscriptionAndDeductCredits");
    const temporaryCleanup = worker.lastIndexOf("fs.unlinkSync(inputPath)");

    expect(durableWrite).toBeGreaterThan(-1);
    expect(temporaryCleanup).toBeGreaterThan(durableWrite);
  });

  it("keeps user deletion behind an authenticated ownership check", () => {
    const router = read("server/routers.ts");
    const deleteProcedure = router.slice(
      router.indexOf("delete: protectedProcedure"),
      router.indexOf("Annuler une transcription en cours")
    );

    expect(deleteProcedure).toContain("transcription.userId !== ctx.user.openId");
    expect(deleteProcedure).toContain("storageDelete(transcription.fileKey)");
    expect(deleteProcedure).toContain("deleteTranscription(input.id)");
  });
});
