// Bundles an array of generated files into a single ZIP archive using archiver.
import fs from "fs";
import path from "path";
import { ZipArchive } from "archiver";

/**
 * Creates a ZIP archive containing the given files.
 * @param {string[]} filePaths - Absolute paths of files to include in the ZIP.
 * @param {string} outputFolder - Directory to save the generated ZIP file.
 * @returns {Promise<string>} Absolute path to the generated ZIP file.
 */
export function createZip(filePaths, outputFolder) {
  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }

  const zipFileName = `Generated_Decks_${Date.now()}.zip`;
  const zipPath = path.join(outputFolder, zipFileName);

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = new ZipArchive({ zlib: { level: 9 } });

    output.on("close", () => resolve(zipPath));
    archive.on("error", (err) => reject(err));

    archive.pipe(output);

    for (const filePath of filePaths) {
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: path.basename(filePath) });
      }
    }

    archive.finalize();
  });
}
