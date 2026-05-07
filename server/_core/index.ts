import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerClerkSyncRoutes } from "./clerkSync";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { uploadRouter } from "../uploadRoute";
import { chunkedUploadRouter } from "../chunkedUploadRoute";
import { sdk } from "./sdk";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser for JSON (tRPC) — pas besoin de 700mb maintenant
  // Les fichiers volumineux passent par la route multipart /api/upload
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Clerk sync routes for Clerk → Manus OAuth session bridging
  registerClerkSyncRoutes(app);

  // Middleware auth pour les routes d'upload (standard + chunked)
  app.use("/api", async (req, res, next) => {
    const uploadPostPaths = ['/upload', '/upload-chunk', '/upload-chunk-complete'];
    const uploadGetPaths = ['/upload-chunk-status'];
    const isUploadRoute = (uploadPostPaths.includes(req.path) && req.method === 'POST') ||
      (uploadGetPaths.includes(req.path) && req.method === 'GET');
    if (isUploadRoute) {
      try {
        const user = await sdk.authenticateRequest(req);
        (req as any).user = user;
      } catch {
        res.status(401).json({ error: 'Non authentifié. Veuillez vous connecter.' });
        return;
      }
    }
    next();
  });
  app.use("/api", uploadRouter);
  app.use("/api", chunkedUploadRouter);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
