// Build script for TOTO application
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Building application for deployment...');

// Create required directories
const distPath = path.join(__dirname, 'dist');
const publicDistPath = path.join(distPath, 'public');
const assetsDistPath = path.join(publicDistPath, 'assets');

// Ensure directories exist
fs.mkdirSync(distPath, { recursive: true });
fs.mkdirSync(publicDistPath, { recursive: true });
fs.mkdirSync(assetsDistPath, { recursive: true });


// Build client first
console.log('Building client...');
try {
  process.chdir(path.join(__dirname, 'client'));
  execSync('npm install', { stdio: 'inherit' });
  execSync('npm run build', { stdio: 'inherit' });
  process.chdir(__dirname);
} catch (error) {
  console.error('Client build failed:', error);
  process.exit(1);
}

// Build server
console.log('Building server...');
try {
  process.chdir(path.join(__dirname, 'server'));
  execSync('npm install', { stdio: 'inherit' });
  execSync('tsc --project ../tsconfig.json --outDir ../dist/server', { stdio: 'inherit' });
  process.chdir(__dirname);
} catch (error) {
  console.error('Server build failed:', error);
  process.exit(1);
}

// Copy client build files to dist/public
try {
  // Copy index.html
  fs.copyFileSync(
    path.join(__dirname, 'client', 'dist', 'index.html'),
    path.join(publicDistPath, 'index.html')
  );

  // Copy assets directory
  execSync(`cp -r ${path.join(__dirname, 'client', 'dist', 'assets')}/* ${assetsDistPath}/`);

  console.log('Successfully copied client files to dist/public');
} catch (error) {
  console.error('Error copying client files:', error);
  process.exit(1);
}

console.log('Build complete! ✓');