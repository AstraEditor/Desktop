import zlib from 'zlib';
import fs from 'fs/promises';
import path from 'path';

async function compressFile(inputPath, outputPath) {
  try {
    console.log(`Reading ${inputPath}...`);
    const data = await fs.readFile(inputPath);
    console.log(`File size: ${data.length} bytes`);
    
    console.log(`Compressing to ${outputPath}...`);
    const compressed = await new Promise((resolve, reject) => {
      zlib.brotliCompress(data, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
    
    console.log(`Compressed size: ${compressed.length} bytes`);
    
    await fs.writeFile(outputPath, compressed);
    console.log('Compression successful!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

const inputFile = 'dist-library-files/generated-metadata/extensions-v0.json';
const outputFile = 'dist-library-files/generated-metadata/extensions-v0.json.br';

compressFile(inputFile, outputFile);
