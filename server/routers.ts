import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getUserTranscriptions, createTranscription } from "./db";
import { triggerTranscriptionWorker } from "./workers/transcriptionWorker";
import { storagePut } from "./storage";
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
      return await getUserTranscriptions(ctx.user.id);
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
        const fileKey = `transcriptions/${ctx.user.id}/${timestamp}-${randomId}.${extension}`;
        
        // 2. Upload vers S3
        const { url } = await storagePut(
          fileKey,
          Buffer.from(input.fileBuffer, 'base64'),
          input.mimeType
        );
        
        // 3. Créer l'entrée en BDD
        const result = await createTranscription({
          userId: ctx.user.id,
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
  }),
});

export type AppRouter = typeof appRouter;
