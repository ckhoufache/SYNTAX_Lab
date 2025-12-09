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
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

try {
    if (!fs.existsSync(distPath)) {
        console.error("Dist folder not found! Run 'npm run build' first.");
        process.exit(1);
    }

    const files = getAllFiles(distPath);
    
    const manifest = files.map(f => {
        // Use path.relative to get the path relative to 'dist'
        const relativePath = path.relative(distPath, f);
        // Force forward slashes (standard for web URLs) regardless of OS
        return relativePath.split(path.sep).join('/');
    }).filter(f => f !== 'version.json' && f !== 'manifest.json'); // Exclude meta files

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`Manifest generated with ${manifest.length} files (POSIX paths).`);
} catch (e) {
    console.error("Error generating manifest:", e);
    process.exit(1);
}