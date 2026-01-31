import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import optimizeRoutes from "./routes/optimizeRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy - Required for VS Code port forwarding, ngrok, Vercel, etc.
app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://maps.googleapis.com",
          "https://maps.gstatic.com",
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://maps.googleapis.com",
          "https://maps.gstatic.com",
          "https://lh3.googleusercontent.com",
          "https://places.googleapis.com",
        ],
        connectSrc: [
          "'self'",
          "https://maps.googleapis.com",
          "https://routes.googleapis.com",
          "https://places.googleapis.com",
          "https://ipapi.co",
          "https://ip-api.com",
        ],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        frameSrc: ["'self'", "https://www.google.com"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests, please try again later." },
});

app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.FRONTEND_URL
        : "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());
app.use("/api", limiter);

app.use("/api", optimizeRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

if (process.env.NODE_ENV === "production") {
  const clientBuildPath = path.join(__dirname, "../client/dist");
  app.use(express.static(clientBuildPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(clientBuildPath, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`
🚀 Pit Stop Server Running
━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV || "development"}
⏰ Started: ${new Date().toLocaleString()}
🔑 Gemini Keys: ${[process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2].filter(Boolean).length}
━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});
