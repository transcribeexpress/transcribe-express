import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyToken: vi.fn(),
  getUser: vi.fn(),
  upsertUser: vi.fn(),
  createSessionToken: vi.fn(),
}));

vi.mock("@clerk/backend", () => ({
  verifyToken: mocks.verifyToken,
}));

vi.mock("@clerk/express", () => ({
  createClerkClient: () => ({ users: { getUser: mocks.getUser } }),
}));

vi.mock("../db", () => ({
  upsertUser: mocks.upsertUser,
}));

vi.mock("./sdk", () => ({
  sdk: { createSessionToken: mocks.createSessionToken },
}));

import { registerClerkSyncRoutes } from "./clerkSync";

function getSyncHandler() {
  let handler: ((req: any, res: any) => Promise<void>) | undefined;
  const app = {
    post(path: string, routeHandler: (req: any, res: any) => Promise<void>) {
      if (path === "/api/clerk/sync") handler = routeHandler;
    },
  };
  registerClerkSyncRoutes(app as any);
  if (!handler) throw new Error("Sync handler not registered");
  return handler;
}

function createResponse() {
  let statusCode = 200;
  let payload: unknown;
  const cookies: Array<{ name: string; value: string }> = [];
  const response = {
    status(code: number) {
      statusCode = code;
      return response;
    },
    json(value: unknown) {
      payload = value;
      return response;
    },
    cookie(name: string, value: string) {
      cookies.push({ name, value });
      return response;
    },
    clearCookie() {
      return response;
    },
  };
  return { response, getStatus: () => statusCode, getPayload: () => payload, cookies };
}

function createRequest(options?: { token?: string; clerkUserId?: string }) {
  const token = options?.token;
  return {
    body: { clerkUserId: options?.clerkUserId ?? "user_expected" },
    protocol: "https",
    headers: {},
    header(name: string) {
      const normalized = name.toLowerCase();
      if (normalized === "authorization" && token) return `Bearer ${token}`;
      if (normalized === "host") return "transcribeexpress.fr";
      return undefined;
    },
  };
}

describe("Clerk session sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CLERK_SECRET_KEY", "sk_test_only");
    mocks.upsertUser.mockResolvedValue(undefined);
    mocks.createSessionToken.mockResolvedValue("app_session_test");
    mocks.getUser.mockResolvedValue({
      id: "user_expected",
      firstName: "Test",
      lastName: "User",
      username: null,
      emailAddresses: [{ emailAddress: "test@example.test" }],
      externalAccounts: [{ provider: "oauth_google" }],
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("refuse une synchronisation sans jeton Clerk", async () => {
    const { response, getStatus } = createResponse();

    await getSyncHandler()(createRequest(), response);

    expect(getStatus()).toBe(401);
    expect(mocks.verifyToken).not.toHaveBeenCalled();
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it("refuse un jeton valide appartenant à un autre utilisateur", async () => {
    mocks.verifyToken.mockResolvedValue({ data: { sub: "user_attacker" } });
    const { response, getStatus } = createResponse();

    await getSyncHandler()(createRequest({ token: "token_test" }), response);

    expect(getStatus()).toBe(401);
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.upsertUser).not.toHaveBeenCalled();
  });

  it("refuse un jeton dont la vérification échoue", async () => {
    mocks.verifyToken.mockRejectedValue(new Error("invalid"));
    const { response, getStatus } = createResponse();

    await getSyncHandler()(createRequest({ token: "invalid" }), response);

    expect(getStatus()).toBe(401);
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it("synchronise uniquement l’utilisateur correspondant au sujet du jeton", async () => {
    mocks.verifyToken.mockResolvedValue({ data: { sub: "user_expected" } });
    const { response, getStatus, getPayload, cookies } = createResponse();

    await getSyncHandler()(createRequest({ token: "valid" }), response);

    expect(getStatus()).toBe(200);
    expect(getPayload()).toMatchObject({ success: true });
    expect(mocks.getUser).toHaveBeenCalledWith("user_expected");
    expect(mocks.upsertUser).toHaveBeenCalledWith(expect.objectContaining({
      openId: "clerk_user_expected",
      identityProvider: "clerk",
      identityStatus: "active",
      identityDisabledAt: null,
    }));
    expect(mocks.upsertUser).not.toHaveBeenCalledWith(expect.objectContaining({
      openId: "user_expected",
    }));
    expect(cookies).toHaveLength(1);
  });
});
