import type { Request, Response } from "express";
import { verifyWebhook, type WebhookEvent } from "@clerk/express/webhooks";
import { disableClerkIdentity, syncClerkIdentity } from "../db";

function getVerifiedEventTime(req: Request, event: WebhookEvent): Date {
  if (event.type === "user.created" || event.type === "user.updated") {
    const updatedAt = Number(event.data.updated_at);
    if (Number.isFinite(updatedAt) && updatedAt > 0) {
      return new Date(updatedAt);
    }
  }

  const signedTimestamp = Number(req.header("svix-timestamp"));
  if (Number.isFinite(signedTimestamp) && signedTimestamp > 0) {
    return new Date(signedTimestamp * 1000);
  }

  return new Date();
}

function getPrimaryEmail(data: Extract<WebhookEvent, { type: "user.created" | "user.updated" }>["data"]): string | null {
  const primary = data.email_addresses.find(address => address.id === data.primary_email_address_id);
  return primary?.email_address ?? data.email_addresses[0]?.email_address ?? null;
}

function getDisplayName(data: Extract<WebhookEvent, { type: "user.created" | "user.updated" }>["data"], email: string | null): string | null {
  const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ").trim();
  return fullName || data.username || email;
}

function getLoginMethod(data: Extract<WebhookEvent, { type: "user.created" | "user.updated" }>["data"]): string {
  return data.external_accounts[0]?.provider ?? "clerk";
}

export async function handleClerkWebhook(req: Request, res: Response): Promise<void> {
  const signingSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!signingSecret) {
    console.error("[ClerkWebhook] Signing secret is not configured");
    res.status(503).json({ error: "Webhook unavailable" });
    return;
  }

  let event: WebhookEvent;
  try {
    event = await verifyWebhook(req, { signingSecret });
  } catch {
    console.warn("[ClerkWebhook] Rejected invalid signature");
    res.status(400).json({ error: "Invalid webhook signature" });
    return;
  }

  try {
    if (event.type === "user.created" || event.type === "user.updated") {
      const email = getPrimaryEmail(event.data);
      await syncClerkIdentity({
        clerkUserId: event.data.id,
        name: getDisplayName(event.data, email),
        email,
        loginMethod: getLoginMethod(event.data),
      }, getVerifiedEventTime(req, event));

      console.info(`[ClerkWebhook] ${event.type} synchronized`);
      res.status(200).json({ received: true, action: "synchronized" });
      return;
    }

    if (event.type === "user.deleted") {
      if (!event.data.id) {
        res.status(400).json({ error: "Missing user identifier" });
        return;
      }

      const disabled = await disableClerkIdentity(event.data.id, getVerifiedEventTime(req, event));
      console.info(`[ClerkWebhook] user.deleted processed (${disabled ? "disabled" : "not_found_or_stale"})`);
      res.status(200).json({ received: true, action: disabled ? "disabled" : "unchanged" });
      return;
    }

    res.status(200).json({ received: true, action: "ignored" });
  } catch (error) {
    console.error("[ClerkWebhook] Processing failed", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
}
