import fs from "fs";
import path from "path";

const LOG_DIR = path.join(process.cwd(), "logs");

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// ✅ Define which endpoints should NEVER be truncated
const FULL_LOG_ENDPOINTS = [
  "/api/gpi", 
  "/api/efforts"
];

export const fileAuditLogger = (req, res, next) => {
  // Wait for the request to finish before logging (so we can get the final statusCode)
  res.on("finish", () => {
    try {
      const endpoint = req.originalUrl;
      
      if (!endpoint.startsWith("/api/")) return;

      // Check if this endpoint is in our "Full Log" list
      const isFullLog = FULL_LOG_ENDPOINTS.some(path => endpoint.startsWith(path));

      const dateObj = new Date();
      const istTime = dateObj.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });

      const fileDateStr = dateObj.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

      const employeeId = req.user?.employeeId || "UNAUTH";
      let clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.ip || "Unknown";
      if (clientIp.includes(",")) clientIp = clientIp.split(",")[0].trim();

      const method = req.method;
      const statusCode = res.statusCode;

      // Process and Sanitize Request Body
      let finalRequestData = null;
      if (req.body && Object.keys(req.body).length > 0) {
        // Deep clone to avoid modifying the actual incoming request
        const reqClone = JSON.parse(JSON.stringify(req.body));
        
        // 🔒 SECURITY: Never log passwords in plain text!
        if (reqClone.password) reqClone.password = "***REDACTED***";
        if (reqClone.newPassword) reqClone.newPassword = "***REDACTED***";
        if (reqClone.tempPassword) reqClone.tempPassword = "***REDACTED***";

        const reqString = JSON.stringify(reqClone);
        
        // Truncate request if it's not on the VIP list
        if (!isFullLog && reqString.length > 150) {
          finalRequestData = reqString.substring(0, 150) + "... [TRUNCATED]";
        } else {
          // Keep as a structured JSON object for better log indexing
          finalRequestData = reqClone; 
        }
      }

      // Build the final JSON log object
      const logEntry = {
        timestamp: istTime,
        employeeId: employeeId,
        clientIp: clientIp,
        method: method,
        statusCode: statusCode,
        endpoint: endpoint,
        request: finalRequestData
      };

      // Change file extension to .jsonl to represent JSON Lines format
      const logFilePath = path.join(LOG_DIR, `audit-${fileDateStr}.jsonl`);

      // Stringify the object and append with a newline
      fs.appendFile(logFilePath, JSON.stringify(logEntry) + "\n", (err) => {
        if (err) console.error("Failed to write to JSON log:", err);
      });

    } catch (err) {
      console.error("Logger crashed:", err.message);
    }
  });

  next();
};