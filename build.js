const { execSync } = require('child_process');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function main() {
  const distDir = path.join(__dirname, 'dist');
  fs.mkdirSync(distDir, { recursive: true });

  // 1. Package server.js + bypass.js into a single exe
  console.log('Packaging into .exe (this may take a minute)...');
  execSync(
    'npx @yao-pkg/pkg . --target node20-win-x64 --output dist/link-bypasser.exe',
    { stdio: 'inherit', cwd: __dirname }
  );

  // 2. Copy Chromium next to the exe
  const chromiumExe = puppeteer.executablePath();
  const chromiumSrcDir = path.dirname(chromiumExe);
  const chromiumDestDir = path.join(distDir, 'chromium');
  console.log(`Copying Chromium from ${chromiumSrcDir} ...`);
  if (fs.existsSync(chromiumDestDir)) fs.rmSync(chromiumDestDir, { recursive: true, force: true });
  copyDirSync(chromiumSrcDir, chromiumDestDir);

  // 3. Copy the public folder next to the exe
  const publicSrcDir = path.join(__dirname, 'public');
  const publicDestDir = path.join(distDir, 'public');
  console.log('Copying public/ ...');
  if (fs.existsSync(publicDestDir)) fs.rmSync(publicDestDir, { recursive: true, force: true });
  copyDirSync(publicSrcDir, publicDestDir);

  console.log('\nBuild complete! Contents of dist/:');
  for (const f of fs.readdirSync(distDir)) console.log('  ' + f);
  console.log('\nDistribute the entire dist/ folder as a zip.');
  console.log('Recipients double-click link-bypasser.exe — no Node.js required.');
}

main().catch(err => { console.error(err); process.exit(1); });
