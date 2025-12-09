import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, 'dist');
const manifestPath = path.join(distPath, 'manifest.json');

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file));
    }
  });

  return arrayOfFiles;
}

try {
    if (!fs.existsSync(distPath)) {
        console.error("Dist folder not found!");
        process.exit(1);
    }

    const files = getAllFiles(distPath);
    const manifest = files.map(f => {
        // Create relative path (e.g., "assets/index.js")
        // Fix Windows backslashes
        return f.replace(distPath, '').replace(/^[\/\\]/, '').replace(/\\/g, '/');
    }).filter(f => f !== 'version.json' && f !== 'manifest.json'); // Exclude meta files from the list itself

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`Manifest generated with ${manifest.length} files.`);
} catch (e) {
    console.error("Error generating manifest:", e);
    process.exit(1);
}