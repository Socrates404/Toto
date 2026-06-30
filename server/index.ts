import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const IS_DEBUG = process.env.APP_MODE === "debug";
const IS_PROD = process.env.APP_MODE === "production";

// Startup env checks
if (IS_PROD) {
  const required = ["SESSION_SECRET", "DATABASE_URL", "RESEND_API_KEY", "APP_URL", "ADMIN_USER_ID"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Missing required env vars for production: ${missing.join(", ")}`);
    process.exit(1);
  }
} else {
  // Debug mode: apply safe defaults
  if (!process.env.SESSION_SECRET) process.env.SESSION_SECRET = "dev-secret-change-in-production";
  if (!process.env.APP_URL) process.env.APP_URL = "http://localhost:5000";
  if (IS_DEBUG) log("Running in DEBUG mode — emails will be printed to console, not sent");
}

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));
app.use(cookieParser());

// Request logger
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
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      if (IS_DEBUG) console.error(err);
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const PORT = Number(process.env.PORT) || 5000;
    server.listen(PORT, "0.0.0.0", () => {
      log(`Server running at http://localhost:${PORT}  [APP_MODE=${process.env.APP_MODE ?? "unset"}]`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
})();
