import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getUserTranscriptions, createTranscription, getTranscriptionById, deleteTranscription, updateTranscriptionStatus } from "./db";
import { triggerTranscriptionWorker, cancelTranscriptionWorker } from "./workers/transcriptionWorker";
import { storageDelete } from "./storage";
import { generatePresignedUploadUrl, verifyFileExists } from "./s3Direct";
import { SUPPORTED_EXTENSIONS } from "./audioProcessor";
import { z } from "zod";

export const appRouter = router({
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
});

export type AppRouter = typeof appRouter;
