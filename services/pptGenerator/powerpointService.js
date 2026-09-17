// Generates a single PowerPoint deck for one "idea" by cloning the BlueBolt
// Template_BB.pptx and injecting text directly into its known shape IDs:
//   - Shape id="417" -> Title placeholder            -> "{Idea ID}-{Idea Title}"
//   - Shape id="404" -> "USE CASE & DESCRIPTION" body -> Idea Description
//   - Shape id="408" -> "SOLUTION APPROACH" body      -> Solution
import fs from "fs";
import path from "path";
import JSZip from "jszip";

const SLIDE_PATH = "ppt/slides/slide1.xml";

// Shape IDs inside Template_BB.pptx (discovered via inspect-template.cjs)
const SHAPE_IDS = {
  title: "417",
  description: "404",
  solution: "408",
};

function sanitizeFileName(name) {
  return String(name || "Untitled_Idea")
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 80);
}

function escapeXml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Builds one <a:p> paragraph containing a single text run, reusing a
// consistent run style so injected text blends with the template's design.
function buildParagraph(text, { fontSize, bold = false, color = null, fontFamily = "Arial" }) {
  const rPrAttrs = [
    'lang="en-IN"',
    `sz="${fontSize}"`,
    `b="${bold ? "1" : "0"}"`,
    'i="0"',
    'u="none"',
    'strike="noStrike"',
    'cap="none"',
  ].join(" ");

  const fillXml = color
    ? `<a:solidFill><a:srgbClr val="${color}"/></a:solidFill>`
    : `<a:solidFill><a:schemeClr val="lt1"/></a:solidFill>`;

  const fontXml = `<a:latin typeface="${fontFamily}"/><a:ea typeface="${fontFamily}"/><a:cs typeface="${fontFamily}"/><a:sym typeface="${fontFamily}"/>`;

  return (
    `<a:p><a:pPr marL="57150" marR="0" lvl="1" indent="-57150" algn="l" rtl="0">` +
    `<a:lnSpc><a:spcPct val="90000"/></a:lnSpc><a:spcBef><a:spcPts val="165"/></a:spcBef>` +
    `<a:spcAft><a:spcPts val="0"/></a:spcAft><a:buNone/></a:pPr>` +
    `<a:r><a:rPr ${rPrAttrs}>${fillXml}${fontXml}</a:rPr><a:t>${escapeXml(text)}</a:t></a:r></a:p>`
  );
}

// Builds the replacement txBody for a body/content shape (description or solution).
// Splits on newlines so multi-line Excel cells become separate paragraphs.
function buildBodyTxBody(text, runStyle) {
  const lines = String(text || "").split(/\r?\n/).filter((line) => line.trim() !== "");
  const paragraphs = (lines.length ? lines : [""]).map((line) => buildParagraph(line, runStyle)).join("");

  return (
    `<p:txBody><a:bodyPr spcFirstLastPara="1" wrap="square" lIns="58650" tIns="58650" rIns="78225" bIns="88000" anchor="t" anchorCtr="0"><a:noAutofit/></a:bodyPr>` +
    `<a:lstStyle/>${paragraphs}</p:txBody>`
  );
}

// Builds the replacement txBody for the title shape (single line, larger font).
function buildTitleTxBody(text) {
  const rPrAttrs = 'lang="en-IN" sz="2800"';
  const paragraph =
    `<a:p><a:pPr marL="0" lvl="0" indent="0" algn="l"><a:lnSpc><a:spcPct val="90000"/></a:lnSpc>` +
    `<a:spcBef><a:spcPts val="0"/></a:spcBef><a:spcAft><a:spcPts val="0"/></a:spcAft><a:buNone/></a:pPr>` +
    `<a:r><a:rPr ${rPrAttrs}/><a:t>${escapeXml(text)}</a:t></a:r><a:endParaRPr lang="en-US"/></a:p>`;

  return (
    `<p:txBody><a:bodyPr spcFirstLastPara="1" wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" anchor="ctr" anchorCtr="0"><a:spAutoFit/></a:bodyPr>` +
    `<a:lstStyle/>${paragraph}</p:txBody>`
  );
}

/**
 * Replaces the <p:txBody>...</p:txBody> of the shape with the given cNvPr id
 * inside the slide XML, preserving everything else about that shape.
 */
function replaceShapeTxBody(slideXml, shapeId, newTxBodyXml) {
  const shapeStartMarker = `<p:cNvPr id="${shapeId}"`;
  const startIdx = slideXml.indexOf(shapeStartMarker);
  if (startIdx === -1) {
    throw new Error(`Template shape with id="${shapeId}" was not found in slide XML.`);
  }

  // Find the enclosing <p:sp> ... </p:sp> boundaries around this marker.
  const spStart = slideXml.lastIndexOf("<p:sp>", startIdx);
  const spEndMarker = "</p:sp>";
  const spEndIdx = slideXml.indexOf(spEndMarker, startIdx) + spEndMarker.length;

  if (spStart === -1 || spEndIdx === -1) {
    throw new Error(`Could not locate shape boundaries for id="${shapeId}".`);
  }

  const shapeXml = slideXml.slice(spStart, spEndIdx);

  const txBodyStart = shapeXml.indexOf("<p:txBody>");
  const txBodyEndMarker = "</p:txBody>";
  const txBodyEnd = shapeXml.indexOf(txBodyEndMarker) + txBodyEndMarker.length;

  if (txBodyStart === -1 || txBodyEnd === -1) {
    throw new Error(`Could not locate <p:txBody> for shape id="${shapeId}".`);
  }

  const newShapeXml =
    shapeXml.slice(0, txBodyStart) + newTxBodyXml + shapeXml.slice(txBodyEnd);

  return slideXml.slice(0, spStart) + newShapeXml + slideXml.slice(spEndIdx);
}

/**
 * Generates a PowerPoint deck for one idea by cloning Template_BB.pptx and
 * injecting the idea's ID/Title, Description, and Solution into the slide.
 * @param {Object} idea - Normalized idea object (see excelService.js).
 * @param {string} templatePath - Path to Template_BB.pptx (required).
 * @param {string} outputFolder - Directory to save the generated .pptx file.
 * @param {number} [fallbackIndex] - Used to build a unique name if ideaId/title are both empty.
 * @returns {Promise<string>} Absolute path to the generated .pptx file.
 */
export async function generatePresentation(idea, templatePath, outputFolder, fallbackIndex = 0) {
  if (!templatePath || !fs.existsSync(templatePath)) {
    throw new Error(
      "Template_BB.pptx not found. Configure PPT_TEMPLATE_PATH or add Backend/template/Template_BB.pptx.",
    );
  }

  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }

  const templateBuffer = await fs.promises.readFile(templatePath);
  const zip = await JSZip.loadAsync(templateBuffer);

  const slideFile = zip.file(SLIDE_PATH);
  if (!slideFile) {
    throw new Error(`Template is missing expected slide at "${SLIDE_PATH}".`);
  }

  let slideXml = await slideFile.async("string");

  const ideaId = String(idea.ideaId || "").trim();
  const ideaTitle = String(idea.title || "").trim();
  const titleText = ideaId && ideaTitle
    ? `${ideaId}-${ideaTitle}`
    : ideaId || ideaTitle || `Idea ${fallbackIndex + 1}`;

  slideXml = replaceShapeTxBody(slideXml, SHAPE_IDS.title, buildTitleTxBody(titleText));
  slideXml = replaceShapeTxBody(
    slideXml,
    SHAPE_IDS.description,
    buildBodyTxBody(idea.description, { fontSize: 1100, fontFamily: "Arial" }),
  );
  slideXml = replaceShapeTxBody(
    slideXml,
    SHAPE_IDS.solution,
    buildBodyTxBody(idea.solution, { fontSize: 1100, fontFamily: "Arial" }),
  );

  zip.file(SLIDE_PATH, slideXml);

  const outputBuffer = await zip.generateAsync({ type: "nodebuffer" });

  const fileBaseName = sanitizeFileName(ideaId || ideaTitle || `Idea_${fallbackIndex + 1}`);
  const outputPath = path.join(outputFolder, `${fileBaseName}.pptx`);

  await fs.promises.writeFile(outputPath, outputBuffer);

  return outputPath;
}
