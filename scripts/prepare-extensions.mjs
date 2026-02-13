import pathUtil from 'node:path';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import {promisify} from 'node:util';
import zlib from 'node:zlib';
import AdmZip from 'adm-zip';

const outputDirectory = pathUtil.join(import.meta.dirname, '../dist-extensions/');
const astraOutputDirectory = pathUtil.join(import.meta.dirname, '../dist-astra-extensions/');
const astraExtensionsBaseURL =
  (process.env.ASTRA_EXTENSIONS_BASE_URL || 'https://editor.astras.top/extensions').replace(/\/+$/, '');

const turboWarpRepoRoot = pathUtil.resolve(import.meta.dirname, '../../TW/extensions/');
const turboWarpExtensionsRoot = pathUtil.join(turboWarpRepoRoot, 'extensions');
const turboWarpImagesRoot = pathUtil.join(turboWarpRepoRoot, 'images');
const turboWarpSamplesRoot = pathUtil.join(turboWarpRepoRoot, 'samples');
const turboWarpFeaturedListPath = pathUtil.join(turboWarpExtensionsRoot, 'extensions.json');
const turboWarpMetadataTranslationsPath = pathUtil.join(
  turboWarpRepoRoot,
  'translations/extension-metadata.json'
);

const brotliCompress = promisify(zlib.brotliCompress);

const splitFirst = (string, split) => {
  const index = string.indexOf(split);
  if (index === -1) {
    return [string];
  }
  return [string.substring(0, index), string.substring(index + split.length)];
};

const parsePerson = (value) => {
  const parts = splitFirst(value, '<');
  if (parts.length === 1) {
    return {
      name: value,
      link: null
    };
  }
  return {
    name: parts[0].trim(),
    link: parts[1].replace('>', '')
  };
};

const parseExtensionMetadata = (code) => {
  const metadata = {
    id: '',
    name: '',
    description: '',
    by: [],
    original: [],
    scratchCompatible: false
  };

  for (const line of code.split('\n')) {
    if (!line.startsWith('//')) {
      break;
    }

    const withoutComment = line.substring(2).trim();
    const parts = splitFirst(withoutComment, ':');
    if (parts.length === 1) {
      continue;
    }

    const key = parts[0].toLowerCase().trim();
    const value = parts[1].trim();

    switch (key) {
      case 'id':
        metadata.id = value;
        break;
      case 'name':
        metadata.name = value;
        break;
      case 'description':
        metadata.description = value;
        break;
      case 'by':
        metadata.by.push(parsePerson(value));
        break;
      case 'original':
        metadata.original.push(parsePerson(value));
        break;
      case 'scratch-compatible':
        metadata.scratchCompatible = value === 'true';
        break;
      default:
        break;
    }
  }

  return metadata;
};

const parseJsonWithLineComments = (text) => {
  const parsed = new Function(`return (${text});`)();
  if (!Array.isArray(parsed)) {
    throw new Error('Expected extensions.json to be an array');
  }
  return parsed;
};

const getTranslationMapForId = (allTranslations, id) => {
  const result = {};
  for (const [locale, translations] of Object.entries(allTranslations)) {
    if (translations && typeof translations === 'object' && translations[id]) {
      result[locale] = translations[id];
    }
  }
  return Object.keys(result).length > 0 ? result : null;
};

const recursiveListFiles = async (root) => {
  const result = [];
  const walk = async (directory) => {
    const entries = await fsPromises.readdir(directory, {withFileTypes: true});
    for (const entry of entries) {
      const fullPath = pathUtil.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        result.push(fullPath);
      }
    }
  };
  await walk(root);
  return result;
};

const writeCompressed = async (root, relativePath, data) => {
  const normalizedRelativePath = relativePath.replace(/^\/+/, '').replace(/\\/g, '/');
  const outputPath = pathUtil.join(root, `${normalizedRelativePath}.br`);
  await fsPromises.mkdir(pathUtil.dirname(outputPath), {recursive: true});
  const compressed = await brotliCompress(data);
  await fsPromises.writeFile(outputPath, compressed);
};

const normalizeRelativePath = (relativePath) => {
  const normalized = String(relativePath).replace(/^\/+/, '').replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length === 0 || parts.some(i => i === '..')) {
    throw new Error(`Invalid relative path: ${relativePath}`);
  }
  return parts.join('/');
};

const toAstraRemoteURL = (relativePath) => {
  const normalized = normalizeRelativePath(relativePath);
  const encodedPath = normalized
    .split('/')
    .map(i => encodeURIComponent(i))
    .join('/');
  return `${astraExtensionsBaseURL}/${encodedPath}`;
};

const fetchAstraFile = async (relativePath, required = true) => {
  const url = toAstraRemoteURL(relativePath);
  const response = await fetch(url);
  if (!response.ok) {
    if (required) {
      throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
    }
    return null;
  }
  return Buffer.from(await response.arrayBuffer());
};

const writeRaw = async (root, relativePath, data) => {
  const normalized = normalizeRelativePath(relativePath);
  const outputPath = pathUtil.join(root, normalized);
  await fsPromises.mkdir(pathUtil.dirname(outputPath), {recursive: true});
  await fsPromises.writeFile(outputPath, data);
};

const getTurboWarpSampleMap = async () => {
  const files = await recursiveListFiles(turboWarpSamplesRoot);
  const map = new Map();

  for (const file of files) {
    if (!file.endsWith('.sb3')) {
      continue;
    }

    const title = pathUtil.basename(file, '.sb3');
    let project;
    try {
      const zip = new AdmZip(file);
      const projectJsonEntry = zip.getEntry('project.json');
      if (!projectJsonEntry) {
        continue;
      }
      project = JSON.parse(projectJsonEntry.getData().toString('utf-8'));
    } catch (error) {
      console.warn(`Failed to parse sample ${file}`, error);
      continue;
    }

    const extensionURLs = Object.values(project.extensionURLs || {});
    for (const extensionURL of extensionURLs) {
      if (typeof extensionURL !== 'string') {
        continue;
      }
      const match = extensionURL.match(/^https:\/\/extensions\.turbowarp\.org\/(.+)\.js$/);
      if (!match) {
        continue;
      }
      const slug = match[1];
      if (!map.has(slug)) {
        map.set(slug, []);
      }
      const list = map.get(slug);
      if (!list.includes(title)) {
        list.push(title);
      }
    }
  }

  return map;
};

const getTurboWarpImagePath = (slug) => {
  const candidates = ['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp'];
  for (const extension of candidates) {
    const absolutePath = pathUtil.join(turboWarpImagesRoot, `${slug}${extension}`);
    if (fs.existsSync(absolutePath)) {
      return `images/${slug}${extension}`;
    }
  }
  return null;
};

const buildTurboWarpMetadata = async () => {
  const featuredSlugsText = await fsPromises.readFile(turboWarpFeaturedListPath, 'utf-8');
  const featuredSlugs = parseJsonWithLineComments(featuredSlugsText);
  const metadataTranslations = JSON.parse(
    await fsPromises.readFile(turboWarpMetadataTranslationsPath, 'utf-8')
  );
  const sampleMap = await getTurboWarpSampleMap();

  const extensions = [];
  for (const slug of featuredSlugs) {
    const extensionPath = pathUtil.join(turboWarpExtensionsRoot, `${slug}.js`);
    if (!fs.existsSync(extensionPath)) {
      console.warn(`Missing TurboWarp extension file for slug: ${slug}`);
      continue;
    }

    const code = await fsPromises.readFile(extensionPath, 'utf-8');
    const metadata = parseExtensionMetadata(code);
    const extension = {
      slug,
      id: metadata.id,
      name: metadata.name,
      description: metadata.description
    };

    const nameTranslations = getTranslationMapForId(metadataTranslations, `${slug}@name`);
    if (nameTranslations) {
      extension.nameTranslations = nameTranslations;
    }
    const descriptionTranslations = getTranslationMapForId(
      metadataTranslations,
      `${slug}@description`
    );
    if (descriptionTranslations) {
      extension.descriptionTranslations = descriptionTranslations;
    }

    const image = getTurboWarpImagePath(slug);
    if (image) {
      extension.image = image;
    }
    if (metadata.by.length > 0) {
      extension.by = metadata.by;
    }
    if (metadata.original.length > 0) {
      extension.original = metadata.original;
    }
    if (metadata.scratchCompatible) {
      extension.scratchCompatible = true;
    }

    const samples = sampleMap.get(slug);
    if (samples && samples.length > 0) {
      extension.samples = samples;
    }

    extensions.push(extension);
  }

  return {extensions};
};

const buildTurboWarpOfflineFiles = async () => {
  if (!fs.existsSync(turboWarpRepoRoot)) {
    throw new Error(`TurboWarp extensions repository not found: ${turboWarpRepoRoot}`);
  }

  fs.rmSync(outputDirectory, {
    recursive: true,
    force: true
  });

  const metadata = await buildTurboWarpMetadata();
  await writeCompressed(
    outputDirectory,
    '/generated-metadata/extensions-v0.json',
    Buffer.from(JSON.stringify(metadata))
  );

  const extensionFiles = await recursiveListFiles(turboWarpExtensionsRoot);
  for (const file of extensionFiles) {
    const relative = pathUtil.relative(turboWarpExtensionsRoot, file).replace(/\\/g, '/');
    await writeCompressed(outputDirectory, `/${relative}`, await fsPromises.readFile(file));
  }

  const imageFiles = await recursiveListFiles(turboWarpImagesRoot);
  for (const file of imageFiles) {
    const relative = pathUtil.relative(turboWarpImagesRoot, file).replace(/\\/g, '/');
    await writeCompressed(outputDirectory, `/images/${relative}`, await fsPromises.readFile(file));
  }

  const sampleFiles = await recursiveListFiles(turboWarpSamplesRoot);
  for (const file of sampleFiles) {
    if (!file.endsWith('.sb3')) {
      continue;
    }
    const relative = pathUtil.relative(turboWarpSamplesRoot, file).replace(/\\/g, '/');
    await writeCompressed(outputDirectory, `/samples/${relative}`, await fsPromises.readFile(file));
  }

  console.log(`Exported TurboWarp extensions to ${outputDirectory}`);
};

const buildAstraOfflineFiles = async () => {
  fs.rmSync(astraOutputDirectory, {
    recursive: true,
    force: true
  });

  const metadataPath = 'generated-metadata/extensions-v0.json';
  const metadataBuffer = await fetchAstraFile(metadataPath, true);
  const metadata = JSON.parse(metadataBuffer.toString('utf-8'));

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
  for (const file of requiredFiles) {
    if (file === metadataPath) {
      continue;
    }
    const data = await fetchAstraFile(file, true);
    await writeRaw(astraOutputDirectory, file, data);
    requiredCount++;
  }

  for (const file of optionalFiles) {
    const data = await fetchAstraFile(file, false);
    if (!data) {
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
