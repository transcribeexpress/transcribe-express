import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyWebhook: vi.fn(),
  syncClerkIdentity: vi.fn(),
  disableClerkIdentity: vi.fn(),
}));

vi.mock("@clerk/express/webhooks", () => ({
  verifyWebhook: mocks.verifyWebhook,
}));

vi.mock("../db", () => ({
  syncClerkIdentity: mocks.syncClerkIdentity,
  disableClerkIdentity: mocks.disableClerkIdentity,
}));

import { handleClerkWebhook } from "./webhook";

function createResponse() {
  let statusCode = 200;
  let payload: unknown;
  const response = {
    status(code: number) {
      statusCode = code;
      return response;
    },
    json(value: unknown) {
      payload = value;
      return response;
    },
  };

  return {
    response: response as any,
    getStatus: () => statusCode,
    getPayload: () => payload,
  };
}

function createRequest(headers: Record<string, string> = {}) {
  return {
    body: Buffer.from("{}"),
    header(name: string) {
      return headers[name.toLowerCase()];
    },
  } as any;
}

describe("Clerk webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CLERK_WEBHOOK_SIGNING_SECRET", "whsec_test_only");
    mocks.syncClerkIdentity.mockResolvedValue(undefined);
    mocks.disableClerkIdentity.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("refuse le webhook si le secret de signature n’est pas configuré", async () => {
    delete process.env.CLERK_WEBHOOK_SIGNING_SECRET;
    const { response, getStatus } = createResponse();

    await handleClerkWebhook(createRequest(), response);

    expect(getStatus()).toBe(503);
    expect(mocks.verifyWebhook).not.toHaveBeenCalled();
  });

  it("refuse une signature invalide sans écrire en base", async () => {
    mocks.verifyWebhook.mockRejectedValue(new Error("invalid signature"));
    const { response, getStatus } = createResponse();

    await handleClerkWebhook(createRequest(), response);

    expect(getStatus()).toBe(400);
    expect(mocks.syncClerkIdentity).not.toHaveBeenCalled();
    expect(mocks.disableClerkIdentity).not.toHaveBeenCalled();
  });

  it("synchronise uniquement les champs d’identité pour user.created", async () => {
    mocks.verifyWebhook.mockResolvedValue({
      type: "user.created",
      data: {
        id: "user_test",
        first_name: "Prénom",
        last_name: "Nom",
        username: null,
        primary_email_address_id: "email_primary",
        email_addresses: [
          { id: "email_secondary", email_address: "secondary@example.test" },
          { id: "email_primary", email_address: "primary@example.test" },
        ],
        external_accounts: [{ provider: "oauth_google" }],
        updated_at: 1_700_000_000_000,
      },
    });
    const { response, getStatus, getPayload } = createResponse();

    await handleClerkWebhook(createRequest(), response);

    expect(getStatus()).toBe(200);
    expect(getPayload()).toEqual({ received: true, action: "synchronized" });
    expect(mocks.syncClerkIdentity).toHaveBeenCalledWith({
      clerkUserId: "user_test",
      name: "Prénom Nom",
      email: "primary@example.test",
      loginMethod: "oauth_google",
    }, new Date(1_700_000_000_000));
    expect(mocks.disableClerkIdentity).not.toHaveBeenCalled();
  });

  it("désactive localement user.deleted sans appeler de suppression métier", async () => {
    mocks.verifyWebhook.mockResolvedValue({
      type: "user.deleted",
      data: { id: "user_test", deleted: true, object: "user" },
    });
    const { response, getStatus, getPayload } = createResponse();

    await handleClerkWebhook(
      createRequest({ "svix-timestamp": "1700000000" }),
      response
    );

    expect(getStatus()).toBe(200);
    expect(getPayload()).toEqual({ received: true, action: "disabled" });
    expect(mocks.disableClerkIdentity).toHaveBeenCalledWith(
      "user_test",
      new Date(1_700_000_000_000)
    );
    expect(mocks.syncClerkIdentity).not.toHaveBeenCalled();
  });

  it("ignore explicitement les événements non abonnés", async () => {
    mocks.verifyWebhook.mockResolvedValue({
      type: "session.created",
      data: { id: "session_test" },
    });
    const { response, getStatus, getPayload } = createResponse();

    await handleClerkWebhook(createRequest(), response);

    expect(getStatus()).toBe(200);
    expect(getPayload()).toEqual({ received: true, action: "ignored" });
    expect(mocks.syncClerkIdentity).not.toHaveBeenCalled();
    expect(mocks.disableClerkIdentity).not.toHaveBeenCalled();
  });
});
