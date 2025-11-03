#!/usr/bin/env node

/**
 * Copy VAD (Voice Activity Detection) model files to public directory
 * This script runs automatically after npm install via postinstall hook
 */

const fs = require('fs');
const path = require('path');

const FILES_TO_COPY = [
  // VAD models
  {
    from: 'node_modules/@ricky0123/vad-web/dist/silero_vad_v5.onnx',
    to: 'public/silero_vad_v5.onnx'
  },
  {
    from: 'node_modules/@ricky0123/vad-web/dist/silero_vad_legacy.onnx',
    to: 'public/silero_vad_legacy.onnx'
  },
  {
    from: 'node_modules/@ricky0123/vad-web/dist/vad.worklet.bundle.min.js',
    to: 'public/vad.worklet.bundle.min.js'
  },
  // ONNX Runtime WASM files
  {
    from: 'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm',
    to: 'public/ort-wasm-simd-threaded.wasm'
  },
  {
    from: 'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs',
    to: 'public/ort-wasm-simd-threaded.mjs'
  },
  {
    from: 'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.wasm',
    to: 'public/ort-wasm-simd-threaded.jsep.wasm'
  },
  {
    from: 'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.mjs',
    to: 'public/ort-wasm-simd-threaded.jsep.mjs'
  }
];

function copyFile(from, to) {
  try {
    const fromPath = path.resolve(__dirname, '..', from);
    const toPath = path.resolve(__dirname, '..', to);

    // Check if source file exists
    if (!fs.existsSync(fromPath)) {
      console.warn(`⚠️  Source file not found: ${from}`);
      return false;
    }

    // Create destination directory if it doesn't exist
    const toDir = path.dirname(toPath);
    if (!fs.existsSync(toDir)) {
      fs.mkdirSync(toDir, { recursive: true });
    }

    // Copy file
    fs.copyFileSync(fromPath, toPath);

    // Get file size for logging
    const stats = fs.statSync(toPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`✅ Copied ${path.basename(to)} (${sizeMB} MB)`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to copy ${from}:`, error.message);
    return false;
  }
}

function main() {
  console.log('📦 Copying VAD model files to public directory...\n');

  let successCount = 0;
  let failCount = 0;

  for (const file of FILES_TO_COPY) {
    const success = copyFile(file.from, file.to);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log(`\n✨ Done! Copied ${successCount}/${FILES_TO_COPY.length} files`);

  if (failCount > 0) {
    console.warn(`⚠️  ${failCount} file(s) failed to copy`);
  }
}

main();
