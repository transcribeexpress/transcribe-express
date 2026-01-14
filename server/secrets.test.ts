import { describe, expect, it } from "vitest";
import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";
import axios from "axios";

describe("Secrets Validation", () => {
  it("validates AWS S3 credentials and bucket access", async () => {
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    try {
      // Test access to the specific bucket instead of listing all buckets
      const command = new HeadBucketCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
      });
      
      await s3Client.send(command);
      
      // If we reach here, the bucket exists and we have access
      expect(true).toBe(true);
    } catch (error: any) {
      if (error.name === "NotFound") {
        throw new Error(`Bucket ${process.env.AWS_S3_BUCKET_NAME} does not exist`);
      } else if (error.name === "Forbidden") {
        throw new Error(`Access denied to bucket ${process.env.AWS_S3_BUCKET_NAME}`);
      }
      throw new Error(`AWS S3 validation failed: ${error.message}`);
    }
  }, 10000);

  it("validates Groq API key", async () => {
    try {
      const response = await axios.get("https://api.groq.com/openai/v1/models", {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 8000,
      });

      expect(response.status).toBe(200);
      expect(response.data.data).toBeDefined();
      expect(Array.isArray(response.data.data)).toBe(true);
      
      // Verify Whisper model is available
      const whisperModel = response.data.data.find(
        (model: any) => model.id.includes("whisper")
      );
      
      if (!whisperModel) {
        console.warn("Whisper model not found. Available models:", 
          response.data.data.map((m: any) => m.id));
      }
      
      expect(whisperModel).toBeDefined();
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error("Groq API key is invalid or unauthorized");
      } else if (error.code === "ECONNABORTED") {
        throw new Error("Groq API request timed out - check network or API key");
      }
      throw new Error(`Groq API validation failed: ${error.message}`);
    }
  }, 10000);
});
