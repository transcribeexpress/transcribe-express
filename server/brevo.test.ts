/**
 * Test de validation de la clé API Brevo
 * 
 * Vérifie que la clé BREVO_API_KEY est valide en appelant
 * l'endpoint GET /v3/account de l'API Brevo.
 */
import { describe, it, expect } from "vitest";

describe("Brevo API Key Validation", () => {
  it("should be able to authenticate with Brevo API", async () => {
    const apiKey = process.env.BREVO_API_KEY;
    console.log(`[Brevo Test] API Key present: ${!!apiKey}, length: ${apiKey?.length ?? 0}, starts with: ${apiKey?.substring(0, 8) ?? 'N/A'}`);
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe("");

    const response = await fetch("https://api.brevo.com/v3/account", {
      method: "GET",
      headers: {
        "api-key": apiKey!,
        "Accept": "application/json",
      },
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("email");
    expect(data).toHaveProperty("companyName");
    console.log(`[Brevo] Account verified: ${data.email} (${data.companyName})`);
  });

  it("should have email sending capability", async () => {
    const apiKey = process.env.BREVO_API_KEY;

    // Vérifier que le compte a le relay SMTP activé (capacité d'envoi)
    const response = await fetch("https://api.brevo.com/v3/account", {
      method: "GET",
      headers: {
        "api-key": apiKey!,
        "Accept": "application/json",
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("relay");
    expect(data.relay.enabled).toBe(true);
    console.log(`[Brevo] Relay enabled: ${data.relay.enabled}, SMTP: ${data.relay.data?.relay}`);
  });

  it("should send a test email via Brevo API", async () => {
    const apiKey = process.env.BREVO_API_KEY;

    const payload = {
      sender: { name: "Transcribe Express", email: "contact@transcribeexpress.fr" },
      to: [{ email: "contact@transcribeexpress.fr", name: "Admin Test" }],
      subject: "[TEST] Validation intégration Brevo - Transcribe Express",
      htmlContent: "<h1>Test réussi</h1><p>L'intégration Brevo fonctionne correctement.</p><p>Ce message a été envoyé automatiquement par les tests Vitest.</p>",
      tags: ["test", "validation"],
    };

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey!,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty("messageId");
    console.log(`[Brevo] Test email sent successfully. MessageId: ${data.messageId}`);
  });
});
