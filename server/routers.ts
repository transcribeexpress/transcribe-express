import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { stripeRouter } from "./stripe/stripeRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getUserTranscriptions, createTranscription, getTranscriptionById, deleteTranscription, updateTranscriptionStatus, updateTranscriptionEdited, checkQuota, getUserPreferences, upsertUserPreferences, getRechargeHistory, createSupportTicket, getSupportTicketsByUser, createGdprRequest, getGdprRequestsByUser, hasPendingGdprRequest, deleteUserAccount, getAllUsers, getUserCount } from "./db";
import { triggerTranscriptionWorker, cancelTranscriptionWorker } from "./workers/transcriptionWorker";
import { storageDelete } from "./storage";
import { generatePresignedUploadUrl, verifyFileExists, generatePresignedDownloadUrl } from "./s3Direct";
import { SUPPORTED_EXTENSIONS } from "./audioProcessor";
import { z } from "zod";

export const appRouter = router({
  system: systemRouter,
  stripe: stripeRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PRÉFÉRENCES UTILISATEUR
  // ═══════════════════════════════════════════════════════════════════════════
  preferences: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const prefs = await getUserPreferences(ctx.user.id);
      // Retourner des valeurs par défaut si pas encore créées
      return prefs ?? {
        defaultLanguage: "fr",
        defaultExportFormat: "txt" as const,
        emailNotifications: 1,
        notifyOnComplete: 1,
        notifyOnLowCredits: 1,
      };
    }),

    update: protectedProcedure
      .input(z.object({
        defaultLanguage: z.string().max(10).optional(),
        defaultExportFormat: z.enum(["txt", "srt", "vtt"]).optional(),
        emailNotifications: z.number().min(0).max(1).optional(),
        notifyOnComplete: z.number().min(0).max(1).optional(),
        notifyOnLowCredits: z.number().min(0).max(1).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await upsertUserPreferences(ctx.user.id, input);
        return { success: true };
      }),
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // HISTORIQUE DES RECHARGES
  // ═══════════════════════════════════════════════════════════════════════════
  rechargeHistory: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).optional() }).optional())
      .query(async ({ ctx, input }) => {
        return await getRechargeHistory(ctx.user.id, input?.limit ?? 20);
      }),
  }),

  // ═════════════════════════════════════════════════════════════════════════
  // SUPPORT TICKETS
  // ═════════════════════════════════════════════════════════════════════════
  support: router({
    create: publicProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        email: z.string().email(),
        subject: z.string().min(1).max(500),
        category: z.enum(["technical", "billing", "account", "feature", "other"]).default("other"),
        message: z.string().min(10).max(5000),
      }))
      .mutation(async ({ ctx, input }) => {
        const ticketId = await createSupportTicket({
          userId: ctx.user?.id ?? null,
          name: input.name,
          email: input.email,
          subject: input.subject,
          category: input.category,
          message: input.message,
        });
        return { success: true, ticketId };
      }),

    list: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(50).optional() }).optional())
      .query(async ({ ctx, input }) => {
        return await getSupportTicketsByUser(ctx.user.id, input?.limit ?? 20);
      }),
  }),

  // ═════════════════════════════════════════════════════════════════════════
  // DEMANDES RGPD
  // ═════════════════════════════════════════════════════════════════════════
  gdpr: router({
    request: protectedProcedure
      .input(z.object({
        requestType: z.enum(["export", "deletion", "rectification", "portability"]),
        reason: z.string().max(2000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Vérifier si une demande en attente existe déjà
        const hasPending = await hasPendingGdprRequest(ctx.user.id, input.requestType);
        if (hasPending) {
          throw new Error("Une demande de ce type est déjà en cours de traitement. Nous vous contacterons dans les 30 jours.");
        }
        const requestId = await createGdprRequest({
          userId: ctx.user.id,
          email: ctx.user.email ?? "",
          requestType: input.requestType,
          reason: input.reason,
          status: "pending",
        });
        return { success: true, requestId };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return await getGdprRequestsByUser(ctx.user.id);
    }),
  }),

  transcriptions: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getUserTranscriptions(ctx.user.openId);
    }),

    /**
     * Étape 1 : Obtenir une URL pré-signée pour upload direct vers S3
     * 
     * Le frontend appelle cette procédure pour obtenir une URL pré-signée,
     * puis upload le fichier directement vers S3 (pas de passage par le serveur).
     * Cela supprime toute limite de taille liée au reverse proxy.
     */
    getUploadUrl: protectedProcedure
      .input(z.object({
        fileName: z.string().min(1),
        contentType: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        // Valider l'extension
        const ext = input.fileName.split('.').pop()?.toLowerCase() || '';
        if (!SUPPORTED_EXTENSIONS.includes(ext)) {
          throw new Error(`Format non supporté: .${ext}. Formats acceptés: ${SUPPORTED_EXTENSIONS.join(', ')}`);
        }

        const { uploadUrl, fileKey, fileUrl } = await generatePresignedUploadUrl(
          ctx.user.openId,
          input.fileName,
          input.contentType
        );

        return { uploadUrl, fileKey, fileUrl };
      }),

    /**
     * Étape 2 : Confirmer l'upload et lancer la transcription
     * 
     * Après que le frontend a uploadé le fichier directement vers S3,
     * il appelle cette procédure pour créer l'entrée en BDD et lancer le worker.
     */
    confirmUpload: protectedProcedure
      .input(z.object({
        fileName: z.string().min(1),
        fileKey: z.string().min(1),
        fileUrl: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        // === VÉRIFICATION DU QUOTA AVANT TRANSCRIPTION ===
        const quota = await checkQuota(ctx.user.openId);
        if (!quota.canTranscribe) {
          if (quota.plan === 'free' && quota.trialExpiresAt && new Date() > new Date(quota.trialExpiresAt)) {
            throw new Error('Votre essai gratuit de 30 jours est expiré. Passez à un plan payant pour continuer à transcrire.');
          }
          throw new Error('Crédits insuffisants. Rechargez vos crédits ou passez à un plan supérieur pour continuer.');
        }

        // Vérifier que le fichier existe bien sur S3
        const exists = await verifyFileExists(input.fileKey);
        if (!exists) {
          throw new Error('Le fichier n\'a pas été trouvé sur S3. L\'upload a peut-être échoué.');
        }

        // Créer l'entrée en BDD
        const result = await createTranscription({
          userId: ctx.user.openId,
          fileName: input.fileName,
          fileUrl: input.fileUrl,
          fileKey: input.fileKey,
          status: 'pending',
        });

        const transcriptionId = (result as any).insertId || (result as any)[0]?.insertId;

        // Déclencher le worker asynchrone
        await triggerTranscriptionWorker(transcriptionId);

        return {
          id: transcriptionId,
          fileName: input.fileName,
          fileUrl: input.fileUrl,
          status: 'pending' as const,
        };
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const transcription = await getTranscriptionById(input.id);
        
        if (!transcription) {
          throw new Error("Transcription not found");
        }
        
        // Vérifier que l'utilisateur est propriétaire
        if (transcription.userId !== ctx.user.openId) {
          throw new Error("Access denied");
        }
        
        return transcription;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const transcription = await getTranscriptionById(input.id);
        
        if (!transcription) {
          throw new Error("Transcription not found");
        }
        
        if (transcription.userId !== ctx.user.openId) {
          throw new Error("Access denied");
        }
        
        // Supprimer le fichier de S3
        if (transcription.fileKey) {
          try {
            await storageDelete(transcription.fileKey);
          } catch (error) {
            console.error("Failed to delete file from S3:", error);
          }
        }
        
        await deleteTranscription(input.id);
        
        return { success: true };
      }),

    /**
     * Annuler une transcription en cours
     */
    cancel: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const transcription = await getTranscriptionById(input.id);
        
        if (!transcription) {
          throw new Error("Transcription not found");
        }
        
        if (transcription.userId !== ctx.user.openId) {
          throw new Error("Access denied");
        }
        
        // Vérifier que la transcription est en cours
        if (transcription.status !== 'pending' && transcription.status !== 'processing') {
          throw new Error("La transcription n'est pas en cours de traitement");
        }

        // Signaler l'annulation au worker
        cancelTranscriptionWorker(input.id);

        // Mettre à jour le statut en BDD
        await updateTranscriptionStatus(input.id, 'cancelled', {
          processingStep: 'cancelled',
          processingProgress: 0,
        });

        return { success: true };
      }),

    /**
     * Mettre à jour le texte édité d'une transcription
     * Préserve le texte original (transcriptText) intact
     * Passer editedText = null pour restaurer l'original
     */
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        editedText: z.string().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        const transcription = await getTranscriptionById(input.id);

        if (!transcription) {
          throw new Error("Transcription not found");
        }

        if (transcription.userId !== ctx.user.openId) {
          throw new Error("Access denied");
        }

        if (transcription.status !== 'completed') {
          throw new Error("Seules les transcriptions terminées peuvent être éditées");
        }

        await updateTranscriptionEdited(input.id, input.editedText);

        return { success: true };
      }),

    /**
     * Obtenir l'URL de lecture du fichier audio depuis S3
     * Utilisé par le mode audio/texte synchronisé dans l'éditeur
     */
    getAudioUrl: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const transcription = await getTranscriptionById(input.id);

        if (!transcription) {
          throw new Error("Transcription not found");
        }

        if (transcription.userId !== ctx.user.openId) {
          throw new Error("Access denied");
        }

        if (!transcription.fileKey) {
          console.warn(`[getAudioUrl] No fileKey for transcription ${input.id}`);
          return { url: null, reason: 'no_file_key' };
        }

        console.log(`[getAudioUrl] Fetching URL for key: ${transcription.fileKey}`);

        try {
          // Utiliser l'AWS SDK directement (même bucket que l'upload pré-signé)
          // URL valide 1 heure pour la lecture audio
          const url = await generatePresignedDownloadUrl(transcription.fileKey, 3600);
          if (!url) {
            console.warn(`[getAudioUrl] generatePresignedDownloadUrl returned empty url for transcription ${input.id}`);
            return { url: null, reason: 'empty_url' };
          }
          console.log(`[getAudioUrl] Success for transcription ${input.id}, url length: ${url.length}`);
          return { url, reason: 'ok' };
        } catch (error) {
          // Le fichier peut avoir été supprimé de S3
          console.warn(`[getAudioUrl] S3 error for transcription ${input.id}:`, error);
          return { url: null, reason: 'storage_error' };
        }
      }),

    stats: protectedProcedure.query(async ({ ctx }) => {
      const transcriptions = await getUserTranscriptions(ctx.user.openId);

      const total = transcriptions.length;
      const completedTranscriptions = transcriptions.filter(t => t.status === "completed");
      const totalDuration = completedTranscriptions.reduce((sum, t) => sum + (t.duration || 0), 0);
      const avgDuration = total > 0 ? totalDuration / total : 0;
      const successRate = total > 0 ? (completedTranscriptions.length / total) * 100 : 0;

      const today = new Date();
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(today);
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split('T')[0];
      });

      const transcriptionsByDay = last7Days.map(date => {
        const count = transcriptions.filter(t => {
          const tDate = new Date(t.createdAt).toISOString().split('T')[0];
          return tDate === date;
        }).length;
        return { date, count };
      });

      const statusCounts = transcriptions.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const transcriptionsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
      }));

      return {
        total,
        totalDuration,
        avgDuration,
        successRate,
        transcriptionsByDay,
        transcriptionsByStatus,
      };
    }),
  }),

  // ============================================================
  // ACCOUNT — Self-delete
  // ============================================================
  account: router({
    deleteMyAccount: protectedProcedure
      .input(z.object({
        confirmation: z.literal("SUPPRIMER"),
      }))
      .mutation(async ({ ctx }) => {
        const result = await deleteUserAccount(ctx.user.id, "self");
        if (result.success) {
          // Clear session cookie
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
        }
        return result;
      }),
  }),

  // ============================================================
  // ADMIN — Gestion des utilisateurs (admin only)
  // ============================================================
  admin: router({
    listUsers: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("Accès refusé — rôle admin requis");
        }
        const limit = input?.limit ?? 50;
        const offset = input?.offset ?? 0;
        const [usersList, totalCount] = await Promise.all([
          getAllUsers(limit, offset),
          getUserCount(),
        ]);
        return { users: usersList, total: totalCount };
      }),

    deleteUser: protectedProcedure
      .input(z.object({
        userId: z.number(),
        confirmation: z.literal("CONFIRMER_SUPPRESSION"),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("Accès refusé — rôle admin requis");
        }
        if (input.userId === ctx.user.id) {
          throw new Error("Impossible de supprimer votre propre compte admin depuis ce panneau");
        }
        const result = await deleteUserAccount(input.userId, "admin");
        return result;
      }),

    stats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Accès refusé — rôle admin requis");
      }
      const totalUsers = await getUserCount();
      return { totalUsers };
    }),
  }),
});

export type AppRouter = typeof appRouter;
