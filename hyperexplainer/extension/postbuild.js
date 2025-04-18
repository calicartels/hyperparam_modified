const fs = require('fs');
const path = require('path');

console.log('Running post-build script...');

// Copy the index.html file to popup.html
try {
  // The file might be at different locations depending on how Vite built it
  const possibleSourcePaths = [
    path.resolve(__dirname, 'dist/index.html'),
    path.resolve(__dirname, 'dist/popup.html'),
    path.resolve(__dirname, 'dist/src/popup/index.html')
  ];
  
  // Find which source file exists
  let sourcePath = null;
  for (const p of possibleSourcePaths) {
    if (fs.existsSync(p)) {
      sourcePath = p;
      break;
    }
  }
  
  if (!sourcePath) {
    throw new Error('Could not find source HTML file');
  }
  
  const targetPath = path.resolve(__dirname, 'dist/popup.html');
  
  // Don't copy if source and target are the same
  if (sourcePath !== targetPath) {
    fs.copyFileSync(sourcePath, targetPath);
    console.log(`✅ Successfully copied from ${sourcePath} to ${targetPath}`);
  } else {
    console.log(`✅ popup.html already exists at the correct location`);
  }
} catch (error) {
  console.error('❌ Error during post-build processing:', error);
  process.exit(1);
}