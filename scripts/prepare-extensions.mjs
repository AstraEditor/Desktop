import pathUtil from 'node:path';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import { promisify } from 'node:util';
import zlib from 'node:zlib';

console.log('=== Starting prepare-extensions.mjs ===');
console.log('Current directory:', process.cwd());
console.log('Script directory:', import.meta.dirname);

try {
  console.log('Importing Builder from @astra-editor/extensions/builder...');
  const Builder = await import('@astra-editor/extensions/builder');
  console.log('Builder imported successfully');
  
  const mode = 'desktop';
  console.log('Creating builder with mode:', mode);
  const builder = new Builder.default(mode);
  console.log('Builder instance created');
  
  console.log('Starting build...');
  const build = await builder.build();
  console.log(`Built extensions (mode: ${mode})`);
  console.log('Number of files in build:', Object.keys(build.files).length);

const outputDirectory = pathUtil.join(import.meta.dirname, '../dist-extensions/');
fs.rmSync(outputDirectory, {
  recursive: true,
  force: true,
});

const brotliCompress = promisify(zlib.brotliCompress);

const exportFile = async (relativePath, file) => {
  // This part is unfortunately still synchronous
  const contents = await file.read();
  console.log(`Generated ${relativePath}`);

  const compressed = await brotliCompress(contents);

  const directoryName = pathUtil.dirname(relativePath);
  await fsPromises.mkdir(pathUtil.join(outputDirectory, directoryName), {
    recursive: true
  });

  await fsPromises.writeFile(pathUtil.join(outputDirectory, `${relativePath}.br`), compressed)

  console.log(`Compressed ${relativePath}`);
};

const promises = Object.entries(build.files).map(([relativePath, file]) => exportFile(relativePath, file));
try {
  await Promise.all(promises);
  console.log(`Exported to ${outputDirectory}`);
  console.log(`Total files: ${Object.keys(build.files).length}`);
  console.log('=== prepare-extensions.mjs completed successfully ===');
} catch (err) {
  console.error('Error exporting files:', err);
  process.exit(1);
}
} catch (err) {
  console.error('=== prepare-extensions.mjs failed ===');
  console.error('Error:', err.message);
  console.error('Stack trace:', err.stack);
  process.exit(1);
}
