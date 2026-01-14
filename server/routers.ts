import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

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
    // Get all transcriptions for the current user
    list: protectedProcedure.query(async ({ ctx }) => {
      const { getTranscriptionsByUserId } = await import("./db");
      return await getTranscriptionsByUserId(ctx.user.id);
    }),

    // Get a single transcription by ID
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const { getTranscriptionById } = await import("./db");
        const transcription = await getTranscriptionById(input.id);
        
        if (!transcription) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Transcription not found" });
        }
        
        if (transcription.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        
        return transcription;
      }),

    // Create a new transcription job
    create: protectedProcedure
      .input(
        z.object({
          fileName: z.string(),
          fileUrl: z.string().url(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { createTranscription } = await import("./db");
        
        const transcriptionId = await createTranscription({
          userId: ctx.user.id,
          fileName: input.fileName,
          fileUrl: input.fileUrl,
          status: "pending",
        });
        
        return { id: transcriptionId };
      }),

    // Delete a transcription
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { getTranscriptionById, deleteTranscription } = await import("./db");
        const { deleteFromS3, extractFileKeyFromUrl } = await import("./s3");
        
        const transcription = await getTranscriptionById(input.id);
        
        if (!transcription) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Transcription not found" });
        }
        
        if (transcription.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        
        // Delete files from S3
        try {
          await deleteFromS3(extractFileKeyFromUrl(transcription.fileUrl));
          
          if (transcription.resultUrl) {
            const resultKey = extractFileKeyFromUrl(transcription.resultUrl);
            await deleteFromS3(resultKey.replace(".srt", ".srt"));
            await deleteFromS3(resultKey.replace(".srt", ".vtt"));
            await deleteFromS3(resultKey.replace(".srt", ".txt"));
          }
        } catch (error) {
          console.error("Error deleting files from S3:", error);
        }
        
        await deleteTranscription(input.id);
        
        return { success: true };
      }),

    // Generate a presigned URL for uploading a file
    getUploadUrl: protectedProcedure
      .input(
        z.object({
          fileName: z.string(),
          contentType: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { generateUploadUrl } = await import("./s3");
        
        return await generateUploadUrl(ctx.user.id, input.fileName, input.contentType);
      }),
  }),
});

export type AppRouter = typeof appRouter;
