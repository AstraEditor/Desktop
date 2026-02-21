import pathUtil from 'node:path';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import {promisify} from 'node:util';
import zlib from 'node:zlib';

const outputDirectory = pathUtil.join(import.meta.dirname, '../dist-extensions/');
const astraOutputDirectory = pathUtil.join(import.meta.dirname, '../dist-astra-extensions/');
const turboWarpExtensionsBaseURL = (
  process.env.TURBOWARP_EXTENSIONS_BASE_URL || 'https://extensions.turbowarp.org'
).replace(/\/+$/, '');
const astraExtensionsBaseURL = (
  process.env.ASTRA_EXTENSIONS_BASE_URL || 'https://editors.astras.top/extensions'
).replace(/\/+$/, '');

const brotliCompress = promisify(zlib.brotliCompress);
const turboWarpMetadataPath = 'generated-metadata/extensions-v0.json';

const normalizeRelativePath = (relativePath) => {
  const normalized = String(relativePath).replace(/^\/+/, '').replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length === 0 || parts.some(i => i === '..')) {
    throw new Error(`Invalid relative path: ${relativePath}`);
  }
  return parts.join('/');
};

const toRemoteURL = (baseURL, relativePath) => {
  const normalized = normalizeRelativePath(relativePath);
  const encodedPath = normalized
    .split('/')
    .map(i => encodeURIComponent(i))
    .join('/');
  return `${baseURL}/${encodedPath}`;
};

const fetchRemoteFile = async (baseURL, relativePath, required = true) => {
  const url = toRemoteURL(baseURL, relativePath);
  const response = await fetch(url);
  if (!response.ok) {
    if (required) {
      throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
    }
    return null;
  }
  return Buffer.from(await response.arrayBuffer());
};

const fetchTurboWarpFile = async (relativePath, required = true) =>
  fetchRemoteFile(turboWarpExtensionsBaseURL, relativePath, required);

const fetchAstraFile = async (relativePath, required = true) =>
  fetchRemoteFile(astraExtensionsBaseURL, relativePath, required);

const createFetchLogPrefix = (libraryName, type, index = null, total = null) => {
  if (index === null) {
    return `[${libraryName} ${type}]`;
  }
  if (total === null) {
    return `[${libraryName} ${type} ${index}]`;
  }
  return `[${libraryName} ${type} ${index}/${total}]`;
};

const writeCompressed = async (root, relativePath, data) => {
  const normalizedRelativePath = normalizeRelativePath(relativePath);
  const outputPath = pathUtil.join(root, `${normalizedRelativePath}.br`);
  await fsPromises.mkdir(pathUtil.dirname(outputPath), {recursive: true});
  const compressed = await brotliCompress(data);
  await fsPromises.writeFile(outputPath, compressed);
};

const writeRaw = async (root, relativePath, data) => {
  const normalized = normalizeRelativePath(relativePath);
  const outputPath = pathUtil.join(root, normalized);
  await fsPromises.mkdir(pathUtil.dirname(outputPath), {recursive: true});
  await fsPromises.writeFile(outputPath, data);
};

const extractLocalAssetPathsFromHTML = (html) => {
  const result = new Set();
  const matchAttribute = /\b(?:src|href)\s*=\s*["']([^"']+)["']/gi;
  let match;
  while ((match = matchAttribute.exec(html)) !== null) {
    const value = match[1].trim();
    if (!value || value.startsWith('data:') || value.startsWith('#') || value.startsWith('mailto:')) {
      continue;
    }

    let relativePath = null;
    if (value.startsWith('/')) {
      relativePath = value.slice(1);
    } else if (value.startsWith(`${turboWarpExtensionsBaseURL}/`)) {
      relativePath = value.slice(turboWarpExtensionsBaseURL.length + 1);
    } else {
      continue;
    }

    relativePath = relativePath.split('#')[0].split('?')[0];
    if (!relativePath || relativePath.endsWith('/')) {
      continue;
    }
    result.add(normalizeRelativePath(relativePath));
  }
  return result;
};

const buildTurboWarpOfflineFiles = async () => {
  console.log(`[TurboWarp] Preparing extension cache from ${turboWarpExtensionsBaseURL}`);

  fs.rmSync(outputDirectory, {
    recursive: true,
    force: true
  });
  console.log('[TurboWarp] Cleared output directory');

  console.log(
    `${createFetchLogPrefix('TurboWarp', 'required', 1, 1)} Fetching ${turboWarpMetadataPath}`
  );
  const metadataBuffer = await fetchTurboWarpFile(turboWarpMetadataPath, true);
  const metadata = JSON.parse(metadataBuffer.toString('utf-8'));
  console.log('[TurboWarp] Parsed metadata');

  const requiredFiles = new Set([
    turboWarpMetadataPath,
    'index.html',
    'docs-internal/scratchblocks.js',
    'turbowarp.svg',
    'images/unknown.svg'
  ]);
  const optionalFiles = new Set([
    'sitemap.xml',
    'extensions.json'
  ]);

  for (const extension of metadata.extensions || []) {
    if (!extension || typeof extension !== 'object') {
      continue;
    }
    if (typeof extension.slug === 'string' && extension.slug) {
      requiredFiles.add(`${extension.slug}.js`);
      if (extension.docs) {
        requiredFiles.add(`${extension.slug}.html`);
      }
    }
    if (typeof extension.image === 'string' && extension.image) {
      requiredFiles.add(extension.image);
    }
    if (Array.isArray(extension.samples)) {
      for (const sample of extension.samples) {
        if (typeof sample === 'string' && sample) {
          requiredFiles.add(`samples/${sample}.sb3`);
        }
      }
    }
  }

  let requiredCount = 0;
  let optionalCount = 0;
  const requiredTotal = requiredFiles.size;

  let requiredIndex = 0;
  for (const file of requiredFiles) {
    requiredIndex++;
    console.log(
      `${createFetchLogPrefix('TurboWarp', 'required', requiredIndex, requiredTotal)} Fetching ${file}`
    );
    const data = await fetchTurboWarpFile(file, true);
    await writeCompressed(outputDirectory, file, data);
    requiredCount++;

    if (file.endsWith('.html')) {
      const html = data.toString('utf-8');
      for (const discoveredPath of extractLocalAssetPathsFromHTML(html)) {
        if (!requiredFiles.has(discoveredPath)) {
          optionalFiles.add(discoveredPath);
        }
      }
    }
  }

  const downloadedOptionalFiles = new Set();
  let optionalIndex = 0;
  while (optionalFiles.size > 0) {
    const iterator = optionalFiles.values().next();
    if (iterator.done) {
      break;
    }
    const file = iterator.value;
    optionalFiles.delete(file);

    if (requiredFiles.has(file) || downloadedOptionalFiles.has(file)) {
      continue;
    }

    optionalIndex++;
    console.log(`${createFetchLogPrefix('TurboWarp', 'optional', optionalIndex)} Fetching ${file}`);
    const data = await fetchTurboWarpFile(file, false);
    if (!data) {
      console.log(`${createFetchLogPrefix('TurboWarp', 'optional', optionalIndex)} Missing ${file}`);
      continue;
    }

    await writeCompressed(outputDirectory, file, data);
    downloadedOptionalFiles.add(file);
    optionalCount++;

    if (file.endsWith('.html')) {
      const html = data.toString('utf-8');
      for (const discoveredPath of extractLocalAssetPathsFromHTML(html)) {
        if (!requiredFiles.has(discoveredPath) && !downloadedOptionalFiles.has(discoveredPath)) {
          optionalFiles.add(discoveredPath);
        }
      }
    }
  }

  console.log(
    `Fetched TurboWarp extensions to ${outputDirectory} (required: ${requiredCount}, optional: ${optionalCount})`
  );
};

const buildAstraOfflineFiles = async () => {
  console.log(`[Astra] Preparing extension cache from ${astraExtensionsBaseURL}`);

  fs.rmSync(astraOutputDirectory, {
    recursive: true,
    force: true
  });
  console.log('[Astra] Cleared output directory');

  const metadataPath = 'generated-metadata/extensions-v0.json';
  console.log(`${createFetchLogPrefix('Astra', 'required', 1, 1)} Fetching ${metadataPath}`);
  const metadataBuffer = await fetchAstraFile(metadataPath, true);
  const metadata = JSON.parse(metadataBuffer.toString('utf-8'));
  console.log('[Astra] Parsed metadata');

  const requiredFiles = new Set([metadataPath]);
  const optionalFiles = new Set([
    'index.html',
    'sitemap.xml',
    'docs-internal/scratchblocks.js'
  ]);

  for (const extension of metadata.extensions || []) {
    if (!extension || typeof extension !== 'object') {
      continue;
    }
    if (typeof extension.slug === 'string' && extension.slug) {
      requiredFiles.add(`${extension.slug}.js`);
      if (extension.docs) {
        optionalFiles.add(`${extension.slug}.html`);
      }
    }
    if (typeof extension.image === 'string' && extension.image) {
      requiredFiles.add(extension.image);
    }
    if (Array.isArray(extension.samples)) {
      for (const sample of extension.samples) {
        if (typeof sample === 'string' && sample) {
          optionalFiles.add(`samples/${sample}.sb3`);
        }
      }
    }
  }

  await writeRaw(astraOutputDirectory, metadataPath, metadataBuffer);

  let requiredCount = 1;
  let optionalCount = 0;
  const requiredTotal = requiredFiles.size;
  let requiredIndex = 1;
  for (const file of requiredFiles) {
    if (file === metadataPath) {
      continue;
    }
    requiredIndex++;
    console.log(
      `${createFetchLogPrefix('Astra', 'required', requiredIndex, requiredTotal)} Fetching ${file}`
    );
    const data = await fetchAstraFile(file, true);
    await writeRaw(astraOutputDirectory, file, data);
    requiredCount++;
  }

  let optionalIndex = 0;
  for (const file of optionalFiles) {
    optionalIndex++;
    console.log(`${createFetchLogPrefix('Astra', 'optional', optionalIndex)} Fetching ${file}`);
    const data = await fetchAstraFile(file, false);
    if (!data) {
      console.log(`${createFetchLogPrefix('Astra', 'optional', optionalIndex)} Missing ${file}`);
      continue;
    }
    await writeRaw(astraOutputDirectory, file, data);
    optionalCount++;
  }

  console.log(
    `Fetched Astra extensions to ${astraOutputDirectory} (required: ${requiredCount}, optional: ${optionalCount})`
  );
};

try {
  await buildTurboWarpOfflineFiles();
  await buildAstraOfflineFiles();
} catch (error) {
  console.error(error);
  process.exit(1);
}
