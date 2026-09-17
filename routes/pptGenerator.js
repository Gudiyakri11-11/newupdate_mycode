// Route + config + controller for BlueBolt PPT Generator, mounted at /api/pptgenerator
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { readIdeas } from "../services/pptGenerator/excelService.js";
import { generatePresentation } from "../services/pptGenerator/powerpointService.js";
import { createZip } from "../services/pptGenerator/zipService.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, "..");

function resolveTemplatePath() {
  const candidates = [
    process.env.PPT_TEMPLATE_PATH,
    path.join(backendRoot, "template", "Template_BB.pptx"),
    path.join(backendRoot, "Templates", "Template_BB.pptx"),
  ].filter(Boolean);
  
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0] || "";
}

const MAX_UPLOAD_BYTES = Number(process.env.PPT_MAX_UPLOAD_BYTES || 104857600);
const GENERATED_FOLDER = path.join(backendRoot, "uploads", "generated-ppts");

const router = express.Router();
router.use(authenticateToken);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

router.post("/generate", upload.single("file"), async (req, res) => {
  if (!req.file || !req.file.buffer?.length) {
    return res.status(400).send("Please upload a valid Excel file.");
  }

  // The BlueBolt template is required: each generated deck is a clone of
  // Template_BB.pptx with idea-specific text injected into it.
  const templatePath = resolveTemplatePath();
  if (!templatePath) {
    return res
      .status(500)
      .send("Template_BB.pptx not found. Configure PPT_TEMPLATE_PATH or add Backend/template/Template_BB.pptx.");
  }

  try {
    const ideas = readIdeas(req.file.buffer);

    if (!ideas.length) {
      return res.status(400).send("No valid ideas found in the uploaded Excel file.");
    }

    const generatedFiles = [];
    for (let idx = 0; idx < ideas.length; idx += 1) {
      const generatedFilePath = await generatePresentation(ideas[idx], templatePath, GENERATED_FOLDER, idx);
      generatedFiles.push(generatedFilePath);
    }

    const zipPath = await createZip(generatedFiles, GENERATED_FOLDER);
    const zipFileName = path.basename(zipPath);
    const zipBuffer = await fs.promises.readFile(zipPath);

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipFileName}"`);

    return res.send(zipBuffer);
  } catch (error) {
    return res.status(500).send(error.message || "Failed to generate PPTs.");
  }
});

router.use((err, req, res, next) => {
  if (err && err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).send("Uploaded file is too large.");
  }
  next(err);
});

export default router;
