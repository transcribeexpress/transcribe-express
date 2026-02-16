/**
 * Clerk Sync - Synchronisation Clerk → Manus OAuth
 * 
 * Ce module crée un endpoint qui permet de synchroniser l'authentification
 * Clerk (frontend) avec la session Manus OAuth (backend).
 * 
 * Flux :
 * 1. L'utilisateur se connecte via Clerk (GitHub/Google)
 * 2. Le frontend appelle POST /api/clerk/sync avec le token Clerk
 * 3. Le serveur vérifie le token via l'API Clerk
 * 4. Le serveur crée/met à jour l'utilisateur dans la BDD
 * 5. Le serveur génère un cookie app_session_id (Manus)
 * 6. Les requêtes tRPC protectedProcedure fonctionnent désormais
 */

import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import { createClerkClient } from "@clerk/express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

// Créer le client Clerk avec la clé secrète
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY || "",
});

export function registerClerkSyncRoutes(app: Express) {
  /**
   * POST /api/clerk/sync
   * 
   * Synchronise la session Clerk avec la session Manus OAuth.
   * Le frontend envoie le userId Clerk, le serveur vérifie et crée le cookie.
   */
  app.post("/api/clerk/sync", async (req: Request, res: Response) => {
    try {
      const { clerkUserId } = req.body;

      if (!clerkUserId || typeof clerkUserId !== "string") {
        res.status(400).json({ error: "clerkUserId is required" });
        return;
      }

      // Vérifier l'utilisateur via l'API Clerk
      let clerkUser;
      try {
        clerkUser = await clerkClient.users.getUser(clerkUserId);
      } catch (error) {
        console.error("[ClerkSync] Failed to verify Clerk user:", error);
        res.status(401).json({ error: "Invalid Clerk user" });
        return;
      }

      if (!clerkUser || !clerkUser.id) {
        res.status(401).json({ error: "Clerk user not found" });
        return;
      }

      // Extraire les informations utilisateur de Clerk
      const email = clerkUser.emailAddresses?.[0]?.emailAddress ?? null;
      const name = [clerkUser.firstName, clerkUser.lastName]
        .filter(Boolean)
        .join(" ") || clerkUser.username || email || "Utilisateur";
      
      // Déterminer la méthode de connexion
      const loginMethod = clerkUser.externalAccounts?.[0]?.provider || "clerk";

      // Utiliser le Clerk userId comme openId pour la BDD Manus
      const openId = `clerk_${clerkUser.id}`;

      // Créer/mettre à jour l'utilisateur dans la BDD
      await db.upsertUser({
        openId,
        name,
        email,
        loginMethod,
        lastSignedIn: new Date(),
      });

      // Générer le token de session Manus
      const sessionToken = await sdk.createSessionToken(openId, {
        name: name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      // Poser le cookie app_session_id
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      console.log(`[ClerkSync] Session created for user ${openId} (${email})`);

      res.json({
        success: true,
        user: {
          openId,
          name,
          email,
        },
      });
    } catch (error) {
      console.error("[ClerkSync] Sync failed:", error);
      res.status(500).json({ error: "Clerk sync failed" });
    }
  });

  /**
   * POST /api/clerk/logout
   * 
   * Nettoie le cookie Manus lors de la déconnexion Clerk.
   */
  app.post("/api/clerk/logout", async (req: Request, res: Response) => {
    try {
      const cookieOptions = getSessionCookieOptions(req);
      res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      res.json({ success: true });
    } catch (error) {
      console.error("[ClerkSync] Logout failed:", error);
      res.status(500).json({ error: "Logout failed" });
    }
  });
}
