import dotenv from "dotenv";
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { initializeDb } from "./db";   // ⭐ IMPORTANT
import { initNeo4jDriver, verifyNeo4jConnection, closeNeo4jDriver } from "../neo4j/db";
import { setupNeo4jSchema } from "../neo4j/setup";
import neo4jRoutes from "../neo4j/routes";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  // ⭐ START MONGODB FIRST
  await initializeDb();

  // ⭐ INITIALIZE NEO4J (non-blocking — app still works if Neo4j is down)
  try {
    initNeo4jDriver();
    const connected = await verifyNeo4jConnection();
    if (connected) {
      await setupNeo4jSchema();
      log("Neo4j initialized successfully", "neo4j");
    } else {
      log("Neo4j not available — fraud detection features disabled", "neo4j");
    }
  } catch (error) {
    log(`Neo4j init warning: ${error instanceof Error ? error.message : error}`, "neo4j");
  }

  // THEN register API routes
  await registerRoutes(httpServer, app);

  // Register Neo4j fraud detection routes
  app.use("/api/neo4j", neo4jRoutes);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "127.0.0.1",
    },
    () => {
      log(`serving on port ${port}`);
    },
  );

  // Graceful shutdown — close Neo4j driver
  const shutdown = async () => {
    log("Shutting down...");
    await closeNeo4jDriver();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
})();