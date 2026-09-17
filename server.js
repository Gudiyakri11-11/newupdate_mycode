import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { doubleCsrf } from "csrf-csrf"; // ✅ Replaced csurf with modern alternative

// Routes
import analyzeRoutes from "./routes/analyze.js";
import onboardingRoutes from "./routes/onboarding.js";
import userRoutes from "./routes/user.js";
import botRoutes from "./routes/bot.js";
import useCaseRoutes from "./routes/usecases.js";
import neuroitRoutes from "./routes/neuroit.js";
import efforts from "./routes/efforts.js";
import gpi from "../Backend/routes/gpi.js";
import optimizationRoutes from "../Backend/routes/mip.js";
import AddProject from "../Backend/routes/addproject.js";
import allocation from "../Backend/routes/allocation.js";
import panel from "../Backend/routes/panelNomination.js";
import jira from "../Backend/routes/jira.js";
import pptGeneratorRoutes from "./routes/pptGenerator.js";
import { fileAuditLogger } from "./middleware/fileAuditLogger.js";
import { authenticateToken, catchIdentityTheft } from "./middleware/authMiddleware.js";
import copilotInsightsRoutes from "../Backend/routes/copilotInsights.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3030;

// ✅ CRITICAL FOR IIS REVERSE PROXY IN PRODUCTION
app.set("trust proxy", 1);

// 1. Security & Core Middleware
app.use(helmet());
app.use(
  cors({
    origin: ["https://genaibuddy.cts.com", "http://localhost:5173"],
    credentials: true, // Required for CSRF and Auth cookies
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: "Too many requests from this IP." },
});
app.use("/api", apiLimiter);

// 2. CSRF Configuration (Modern Double Submit Cookie)
// 2. CSRF Configuration (Modern Double Submit Cookie)
const {
  invalidCsrfTokenError,
  generateCsrfToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || "fallback-secret-do-not-use-in-prod",
  cookieName: "x-csrf-token", 
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  },
  size: 64, 
  ignoredMethods: ["GET", "HEAD", "OPTIONS"], 
  getTokenFromRequest: (req) => req.headers["x-csrf-token"], 
  
  // ✅ THE FIX: Tell the library to tie the CSRF token to the user's JWT cookie!
  getSessionIdentifier: (req) => req.cookies?.token || "anonymous",
});

// 3. ENFORCE CSRF CONDITIONALLY
const enforceConditionalCSRF = (req, res, next) => {
  const exemptRoutes = [
    "/api/auth/login", 
    "/api/auth/register", 
    "/api/auth/reset-password"
  ];
  
  if (exemptRoutes.includes(req.path)) {
    return next(); // Skip CSRF for open auth routes
  }
  
  // Apply modern CSRF protection to all other state-changing routes
  return doubleCsrfProtection(req, res, next);
};

app.use(enforceConditionalCSRF);

// 4. SECURED Token Generation Endpoint
app.get("/api/init", authenticateToken, (req, res) => {
  // ✅ FIX 2: Call the correctly named function
  // generateCsrfToken creates the token AND sets the secure signature cookie automatically
  const csrfToken = generateCsrfToken(req, res);
  res.json({ csrfToken });
});

// 5. Attach the File Logger
app.use(fileAuditLogger);

// 6. Routes
app.use("/api/auth", userRoutes); 

// Keep these protected globally
app.use("/api", authenticateToken, analyzeRoutes);
app.use("/api/onboard", authenticateToken, catchIdentityTheft, onboardingRoutes);
app.use("/api/bots", authenticateToken, catchIdentityTheft, botRoutes);
app.use("/api/usecases", authenticateToken, catchIdentityTheft, useCaseRoutes);
app.use("/api/neuroit", authenticateToken, neuroitRoutes);
app.use("/api/efforts", authenticateToken, catchIdentityTheft, efforts);
app.use("/api/gpi", authenticateToken, catchIdentityTheft, gpi);
app.use("/api/optimization", authenticateToken, catchIdentityTheft, optimizationRoutes);
app.use("/api/addproject", authenticateToken, catchIdentityTheft, AddProject);
app.use("/api/allocation", authenticateToken, catchIdentityTheft, allocation);
app.use("/api/panel", authenticateToken, panel);
app.use("/api/jira", authenticateToken, catchIdentityTheft, jira);
app.use("/api/copilot-insights", authenticateToken, catchIdentityTheft, copilotInsightsRoutes);
app.use("/api/pptgenerator", pptGeneratorRoutes);

app.get("/api/health", async (req, res) => {
  try {
    return res.status(200).json({ status: "healthy", maintenance: false });
  } catch (err) {
    return res.status(500).json({ status: "unhealthy", maintenance: false });
  }
});

// 7. CSRF Error Handler
app.use((err, req, res, next) => {
  // Check against the specific error thrown by csrf-csrf
  if (err === invalidCsrfTokenError) {
    return res.status(403).json({ error: "Forbidden: Invalid or missing CSRF token." });
  }
  next(err);
});

app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
});

export default app;