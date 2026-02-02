import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getUserTranscriptions, createTranscription, getTranscriptionById, deleteTranscription } from "./db";
import { triggerTranscriptionWorker } from "./workers/transcriptionWorker";
import { storagePut, storageDelete } from "./storage";
import { z } from "zod";
import { randomBytes } from "crypto";

/**
 * Extraire l'extension d'un nom de fichier
 */
function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1] : 'bin';
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
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

  transcriptions: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getUserTranscriptions(ctx.user.openId);
    }),

    create: protectedProcedure
      .input(z.object({
        fileName: z.string(),
        fileSize: z.number(),
        mimeType: z.string(),
        fileBuffer: z.string(), // Base64 encoded
      }))
      .mutation(async ({ ctx, input }) => {
        // 1. Générer une clé S3 unique
        const randomId = randomBytes(8).toString('hex');
        const timestamp = Date.now();
        const extension = getFileExtension(input.fileName);
        const fileKey = `transcriptions/${ctx.user.openId}/${timestamp}-${randomId}.${extension}`;
        
        // 2. Upload vers S3
        const { url } = await storagePut(
          fileKey,
          Buffer.from(input.fileBuffer, 'base64'),
          input.mimeType
        );
        
        // 3. Créer l'entrée en BDD
        const result = await createTranscription({
          userId: ctx.user.openId,
          fileName: input.fileName,
          fileUrl: url,
          fileKey: fileKey,
          status: 'pending',
        });

        // Récupérer l'ID inséré (MySQL renvoie un objet avec insertId)
        const transcriptionId = (result as any).insertId || (result as any)[0]?.insertId;
        
        // 4. Déclencher le worker asynchrone
        await triggerTranscriptionWorker(transcriptionId);
        
        return {
          id: transcriptionId,
          fileName: input.fileName,
          fileUrl: url,
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
        // 1. Récupérer la transcription
        const transcription = await getTranscriptionById(input.id);
        
        if (!transcription) {
          throw new Error("Transcription not found");
        }
        
        // 2. Vérifier que l'utilisateur est propriétaire
        if (transcription.userId !== ctx.user.openId) {
          throw new Error("Access denied");
        }
        
        // 3. Supprimer le fichier de S3 (si fileKey existe)
        if (transcription.fileKey) {
          try {
            await storageDelete(transcription.fileKey);
          } catch (error) {
            console.error("Failed to delete file from S3:", error);
            // Continue quand même pour supprimer de la BDD
          }
        }
        
        // 4. Supprimer l'entrée de la BDD
        await deleteTranscription(input.id);
        
        return { success: true };
      }),

    stats: protectedProcedure.query(async ({ ctx }) => {
      const transcriptions = await getUserTranscriptions(ctx.user.openId);

      // KPIs
      const total = transcriptions.length;
      const completedTranscriptions = transcriptions.filter(t => t.status === "completed");
      const totalDuration = completedTranscriptions.reduce((sum, t) => sum + (t.duration || 0), 0);
      const avgDuration = total > 0 ? totalDuration / total : 0;
      const successRate = total > 0 ? (completedTranscriptions.length / total) * 100 : 0;

      // Transcriptions par jour (7 derniers jours)
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

      // Répartition par statut
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
});

export type AppRouter = typeof appRouter;
