/**
 * Email Service — Envoi d'emails transactionnels via Brevo API v3
 * 
 * Ce module fournit les helpers pour envoyer des emails depuis la page Contact.
 * Chaque thème de contact est routé vers une adresse email dédiée.
 * 
 * Adresses configurées (O2switch) :
 * - bug@transcribeexpress.fr → Support technique (bugs)
 * - ask@transcribeexpress.fr → Questions utilisateurs
 * - paiement@transcribeexpress.fr → Facturation & abonnements
 * - suggest@transcribeexpress.fr → Suggestions & fonctionnalités
 * - dpo@transcribeexpress.fr → RGPD & données personnelles
 * - other@transcribeexpress.fr → Autres demandes
 * - contact@transcribeexpress.fr → Réservé administration/prestataires (non utilisé par le formulaire)
 */

import { ENV } from "./env";

// ─── Configuration ────────────────────────────────────────────────────────────

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

/** Adresse expéditeur pour tous les emails transactionnels */
const SENDER = {
  name: "Transcribe Express",
  email: "contact@transcribeexpress.fr",
};

/** Mapping catégorie de contact → adresse email destinataire */
export const CONTACT_EMAIL_MAP: Record<string, { email: string; label: string }> = {
  technical: {
    email: "bug@transcribeexpress.fr",
    label: "Support Technique",
  },
  billing: {
    email: "paiement@transcribeexpress.fr",
    label: "Facturation & Abonnement",
  },
  account: {
    email: "dpo@transcribeexpress.fr",
    label: "RGPD & Données Personnelles",
  },
  feature: {
    email: "suggest@transcribeexpress.fr",
    label: "Suggestions & Fonctionnalités",
  },
  other: {
    email: "other@transcribeexpress.fr",
    label: "Autres Demandes",
  },
};

/**
 * Mapping étendu pour les types de contact frontend (id) → catégorie backend
 * Utilisé pour router "question" vers ask@ au lieu de bug@
 */
export const CONTACT_TYPE_EMAIL_MAP: Record<string, { email: string; label: string }> = {
  bug: {
    email: "bug@transcribeexpress.fr",
    label: "Support Technique — Bugs",
  },
  question: {
    email: "ask@transcribeexpress.fr",
    label: "Questions Utilisateurs",
  },
  billing: {
    email: "paiement@transcribeexpress.fr",
    label: "Facturation & Abonnement",
  },
  suggestion: {
    email: "suggest@transcribeexpress.fr",
    label: "Suggestions & Fonctionnalités",
  },
  dpo: {
    email: "dpo@transcribeexpress.fr",
    label: "RGPD & Données Personnelles",
  },
  other: {
    email: "other@transcribeexpress.fr",
    label: "Autres Demandes",
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SendEmailOptions {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  replyTo?: { email: string; name?: string };
  tags?: string[];
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ─── Helper principal ─────────────────────────────────────────────────────────

/**
 * Envoyer un email via l'API Brevo v3
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    console.error("[Email] BREVO_API_KEY is not configured");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const payload = {
      sender: SENDER,
      to: options.to,
      subject: options.subject,
      htmlContent: options.htmlContent,
      textContent: options.textContent,
      replyTo: options.replyTo,
      tags: options.tags,
    };

    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[Email] Brevo API error:", response.status, errorData);
      return {
        success: false,
        error: `Brevo API error: ${response.status} - ${(errorData as any)?.message || "Unknown error"}`,
      };
    }

    const data = await response.json() as { messageId?: string };
    console.log(`[Email] Sent successfully. MessageId: ${data.messageId}`);
    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error("[Email] Failed to send:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ─── Helpers spécialisés ──────────────────────────────────────────────────────

/**
 * Envoyer l'email de contact vers l'adresse dédiée au thème
 */
export async function sendContactEmail(params: {
  contactType: string;
  category: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
  ticketId: number;
}): Promise<SendEmailResult> {
  // Résoudre l'adresse destinataire via le type de contact (plus précis)
  const destination = CONTACT_TYPE_EMAIL_MAP[params.contactType]
    ?? CONTACT_EMAIL_MAP[params.category]
    ?? CONTACT_EMAIL_MAP["other"];

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #BE34D5 0%, #34D5BE 100%); padding: 20px; border-radius: 8px 8px 0 0; }
    .header h1 { color: white; margin: 0; font-size: 18px; }
    .header p { color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px; }
    .body { background: #f9f9f9; padding: 24px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; }
    .meta { background: white; padding: 16px; border-radius: 6px; margin-bottom: 16px; border: 1px solid #eee; }
    .meta-row { display: flex; margin-bottom: 8px; }
    .meta-label { font-weight: 600; color: #666; min-width: 120px; }
    .meta-value { color: #333; }
    .message { background: white; padding: 16px; border-radius: 6px; border: 1px solid #eee; white-space: pre-wrap; }
    .footer { text-align: center; padding: 16px; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Nouveau message — ${destination.label}</h1>
      <p>Ticket #${params.ticketId}</p>
    </div>
    <div class="body">
      <div class="meta">
        <div class="meta-row"><span class="meta-label">De :</span><span class="meta-value">${params.senderName} &lt;${params.senderEmail}&gt;</span></div>
        <div class="meta-row"><span class="meta-label">Catégorie :</span><span class="meta-value">${destination.label}</span></div>
        <div class="meta-row"><span class="meta-label">Sujet :</span><span class="meta-value">${params.subject}</span></div>
        <div class="meta-row"><span class="meta-label">Ticket :</span><span class="meta-value">#${params.ticketId}</span></div>
      </div>
      <h3 style="margin: 0 0 8px; color: #555;">Message :</h3>
      <div class="message">${params.message.replace(/\n/g, "<br>")}</div>
    </div>
    <div class="footer">
      Transcribe Express — Système de support automatisé
    </div>
  </div>
</body>
</html>`;

  const textContent = `Nouveau message — ${destination.label}\n\nDe : ${params.senderName} <${params.senderEmail}>\nCatégorie : ${destination.label}\nSujet : ${params.subject}\nTicket : #${params.ticketId}\n\nMessage :\n${params.message}`;

  return sendEmail({
    to: [{ email: destination.email, name: destination.label }],
    subject: `[Ticket #${params.ticketId}] ${params.subject}`,
    htmlContent,
    textContent,
    replyTo: { email: params.senderEmail, name: params.senderName },
    tags: ["contact", params.contactType, params.category],
  });
}

/**
 * Envoyer un accusé de réception à l'utilisateur
 */
export async function sendConfirmationEmail(params: {
  recipientEmail: string;
  recipientName: string;
  subject: string;
  ticketId: number;
  category: string;
}): Promise<SendEmailResult> {
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #BE34D5 0%, #34D5BE 100%); padding: 24px; border-radius: 8px 8px 0 0; text-align: center; }
    .header img { width: 48px; height: 48px; margin-bottom: 8px; }
    .header h1 { color: white; margin: 0; font-size: 20px; }
    .body { background: #f9f9f9; padding: 24px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; }
    .ticket-box { background: white; padding: 20px; border-radius: 8px; border: 1px solid #eee; text-align: center; margin: 16px 0; }
    .ticket-id { font-size: 24px; font-weight: 700; color: #BE34D5; }
    .footer { text-align: center; padding: 16px; color: #999; font-size: 12px; }
    a { color: #34D5BE; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Votre demande a bien été reçue</h1>
    </div>
    <div class="body">
      <p>Bonjour ${params.recipientName},</p>
      <p>Nous avons bien reçu votre message concernant : <strong>${params.subject}</strong></p>
      <div class="ticket-box">
        <p style="margin: 0 0 4px; color: #666; font-size: 13px;">Numéro de ticket</p>
        <p class="ticket-id">#${params.ticketId}</p>
      </div>
      <p>Notre équipe traitera votre demande dans les meilleurs délais. Vous recevrez une réponse directement sur cette adresse email.</p>
      <p>Si vous avez des informations complémentaires à ajouter, vous pouvez répondre directement à cet email.</p>
      <p style="margin-top: 24px;">Cordialement,<br><strong>L'équipe Transcribe Express</strong></p>
    </div>
    <div class="footer">
      <p>Transcribe Express — Transcription Audio/Vidéo par IA</p>
      <p><a href="https://transcribeexpress.manus.space">transcribeexpress.manus.space</a></p>
    </div>
  </div>
</body>
</html>`;

  const textContent = `Bonjour ${params.recipientName},\n\nNous avons bien reçu votre message concernant : ${params.subject}\n\nNuméro de ticket : #${params.ticketId}\n\nNotre équipe traitera votre demande dans les meilleurs délais.\n\nCordialement,\nL'équipe Transcribe Express`;

  return sendEmail({
    to: [{ email: params.recipientEmail, name: params.recipientName }],
    subject: `[Transcribe Express] Confirmation — Ticket #${params.ticketId}`,
    htmlContent,
    textContent,
    tags: ["confirmation", params.category],
  });
}
