import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Statische Dateien aus dem 'dist' Ordner bedienen (wo Vite hinbaut)
app.use(express.static(path.join(__dirname, 'dist')));

// Alle anderen Anfragen an index.html leiten (für React Router / SPA Verhalten)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});