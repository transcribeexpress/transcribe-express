import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");
const auditScript = fs.readFileSync(
  path.join(projectRoot, "scripts/audit-s3-protection.mjs"),
  "utf8"
);

describe("S3 protection audit", () => {
  it("uses only read-only bucket configuration commands", () => {
    expect(auditScript).toContain("GetBucketVersioningCommand");
    expect(auditScript).toContain("GetBucketLifecycleConfigurationCommand");
    expect(auditScript).toContain("GetObjectLockConfigurationCommand");
    expect(auditScript).not.toMatch(/Put[A-Za-z]+Command|Delete[A-Za-z]+Command/);
  });

  it("does not enumerate, download or expose user objects", () => {
    expect(auditScript).not.toMatch(/ListObjects|GetObjectCommand|HeadObjectCommand/);
    expect(auditScript).not.toContain("Contents");
  });
});
