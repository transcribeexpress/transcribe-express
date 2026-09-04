import crypto from "node:crypto";
import { describe, expect, it } from "vitest";

const shouldRun = process.env.ALLOW_WEBHOOK_SECRET_TEST === "true";

function signSvixPayload(secret: string, messageId: string, timestamp: string, payload: string): string {
  const encodedSecret = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  const key = Buffer.from(encodedSecret, "base64");
  const signedContent = `${messageId}.${timestamp}.${payload}`;
  const signature = crypto.createHmac("sha256", key).update(signedContent).digest("base64");
  return `v1,${signature}`;
}

describe.runIf(shouldRun)("Clerk webhook signing secret integration", () => {
  it("accepte un événement signé et inoffensif sur l’endpoint local", async () => {
    const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
    expect(secret).toBeTruthy();
    expect(secret?.startsWith("whsec_")).toBe(true);

    const payload = JSON.stringify({
      data: { id: "sess_secret_validation" },
      object: "event",
      type: "session.created",
      event_attributes: {
        http_request: { client_ip: "127.0.0.1", user_agent: "vitest" },
      },
    });
    const messageId = `msg_validation_${Date.now()}`;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const endpoint = process.env.CLERK_WEBHOOK_TEST_URL ?? "http://127.0.0.1:3000/api/webhooks/clerk";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "svix-id": messageId,
        "svix-timestamp": timestamp,
        "svix-signature": signSvixPayload(secret!, messageId, timestamp, payload),
      },
      body: payload,
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true, action: "ignored" });
  });
});
