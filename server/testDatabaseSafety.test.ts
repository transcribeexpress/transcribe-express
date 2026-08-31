import { afterEach, describe, expect, it } from "vitest";
import {
  getRuntimeDatabaseUrl,
  hasDedicatedTestDatabase,
} from "./testDatabaseSafety";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("test database safety", () => {
  it("uses DATABASE_URL outside the test environment", () => {
    process.env.NODE_ENV = "production";
    process.env.DATABASE_URL = "mysql://application-database";

    expect(getRuntimeDatabaseUrl()).toBe("mysql://application-database");
  });

  it("blocks database access during tests by default", () => {
    process.env.NODE_ENV = "test";
    process.env.DATABASE_URL = "mysql://application-database";
    delete process.env.TEST_DATABASE_URL;
    delete process.env.ALLOW_DATABASE_TESTS;

    expect(hasDedicatedTestDatabase()).toBe(false);
    expect(getRuntimeDatabaseUrl()).toBeUndefined();
  });

  it("rejects a test URL identical to the application database", () => {
    process.env.NODE_ENV = "test";
    process.env.DATABASE_URL = "mysql://application-database";
    process.env.TEST_DATABASE_URL = "mysql://application-database";
    process.env.ALLOW_DATABASE_TESTS = "true";

    expect(hasDedicatedTestDatabase()).toBe(false);
    expect(getRuntimeDatabaseUrl()).toBeUndefined();
  });

  it("requires explicit consent before using a distinct test database", () => {
    process.env.NODE_ENV = "test";
    process.env.DATABASE_URL = "mysql://application-database";
    process.env.TEST_DATABASE_URL = "mysql://dedicated-test-database";
    delete process.env.ALLOW_DATABASE_TESTS;

    expect(hasDedicatedTestDatabase()).toBe(false);
    expect(getRuntimeDatabaseUrl()).toBeUndefined();
  });

  it("allows only an explicitly confirmed, distinct test database", () => {
    process.env.NODE_ENV = "test";
    process.env.DATABASE_URL = "mysql://application-database";
    process.env.TEST_DATABASE_URL = "mysql://dedicated-test-database";
    process.env.ALLOW_DATABASE_TESTS = "true";

    expect(hasDedicatedTestDatabase()).toBe(true);
    expect(getRuntimeDatabaseUrl()).toBe("mysql://dedicated-test-database");
  });
});
