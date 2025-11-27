import pathUtil from 'node:path';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import { promisify } from 'node:util';
import zlib from 'node:zlib';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import os from 'node:os';

console.log('=== Starting prepare-extensions-optimized.mjs ===');
console.log('Current directory:', process.cwd());
console.log('Script directory:', import.meta.dirname);
console.log('Number of CPU cores:', os.cpus().length);

// Brotli compression settings optimized for speed
const brotliOptions = {
  params: {
    [zlib.constants.BROTLI_PARAM_QUALITY]: 4, // Reduced from default 11 for faster compression
    [zlib.constants.BROTLI_PARAM_SIZE_HINT]: 1024, // Hint for small files
  }
};

// Worker function for parallel compression
async function compressWorker(filePath, contents, outputPath) {
  try {
    const brotliCompress = promisify(zlib.brotliCompress);
    const compressed = await brotliCompress(contents, brotliOptions);
    
    const directoryName = pathUtil.dirname(filePath);
    await fsPromises.mkdir(pathUtil.join(outputPath, directoryName), {
      recursive: true
    });

    await fsPromises.writeFile(pathUtil.join(outputPath, `${filePath}.br`), compressed);
    return { success: true, filePath };
  } catch (error) {
    console.error(`Error compressing ${filePath}:`, error);
    return { success: false, filePath, error: error.message };
  }
}

// Main compression function with parallel processing
async function compressFiles(files, outputDirectory) {
  const numWorkers = Math.min(os.cpus().length, 8); // Limit to 8 workers max
  console.log(`Using ${numWorkers} parallel workers for compression`);
  
  const results = [];
  const chunks = [];
  
  // Split files into chunks for workers
  for (let i = 0; i < files.length; i += numWorkers) {
    chunks.push(files.slice(i, i + numWorkers));
  }
  
  let processedCount = 0;
  const totalFiles = files.length;
  
  for (const chunk of chunks) {
    const promises = chunk.map(async ([relativePath, file]) => {
      try {
        const contents = await file.read();
        const result = await compressWorker(relativePath, contents, outputDirectory);
        processedCount++;
        
        if (processedCount % 50 === 0 || processedCount === totalFiles) {
          console.log(`Progress: ${processedCount}/${totalFiles} files (${Math.round(processedCount/totalFiles*100)}%)`);
        }
        
        return result;
      } catch (error) {
        console.error(`Error processing ${relativePath}:`, error);
        return { success: false, filePath: relativePath, error: error.message };
      }
    });
    
    const chunkResults = await Promise.all(promises);
    results.push(...chunkResults);
  }
  
  return results;
}

async function main() {
  try {
    console.log('Importing Builder from @turbowarp/extensions/builder...');
    const Builder = await import('@turbowarp/extensions/builder');
    console.log('Builder imported successfully');
    
    const mode = 'desktop';
    console.log('Creating builder with mode:', mode);
    const builder = new Builder.default(mode);
    console.log('Builder instance created');
    
    console.log('Starting build...');
    const startTime = Date.now();
    const build = await builder.build();
    const buildTime = Date.now() - startTime;
    console.log(`Built extensions (mode: ${mode}) in ${buildTime}ms`);
    console.log('Number of files in build:', Object.keys(build.files).length);

    const outputDirectory = pathUtil.join(import.meta.dirname, '../dist-extensions/');
    fs.rmSync(outputDirectory, {
      recursive: true,
      force: true,
    });

    console.log('Starting optimized compression...');
    const compressionStartTime = Date.now();
    
    const files = Object.entries(build.files);
    const results = await compressFiles(files, outputDirectory);
    
    const compressionTime = Date.now() - compressionStartTime;
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`Compression completed in ${compressionTime}ms`);
    console.log(`Successful: ${successful}, Failed: ${failed}`);
    
    if (failed > 0) {
      console.error('Failed files:');
      results.filter(r => !r.success).forEach(r => console.error(`  - ${r.filePath}: ${r.error}`));
    }
    
    console.log(`Exported to ${outputDirectory}`);
    console.log(`Total files: ${Object.keys(build.files).length}`);
    console.log('=== prepare-extensions-optimized.mjs completed successfully ===');
  } catch (err) {
    console.error('=== prepare-extensions-optimized.mjs failed ===');
    console.error('Error:', err.message);
    console.error('Stack trace:', err.stack);
    process.exit(1);
  }
}

if (isMainThread) {
  main();
}