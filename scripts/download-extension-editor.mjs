import * as fs from 'node:fs';
import * as pathUtil from 'node:path';
import AdmZip from 'adm-zip';
import {computeSHA256, persistentFetch} from './lib.mjs';
import extensionEditorInfo from './extension-editor.json' with {type: 'json'};

const outputDirectory = pathUtil.join(import.meta.dirname, '../dist-extension-editor');
const extractedDirectory = pathUtil.join(outputDirectory, 'scratch-extension-editor');
const versionMarkerPath = pathUtil.join(outputDirectory, '.extension-editor-sha256');

const isAlreadyDownloaded = () => {
  try {
    const currentVersion = fs.readFileSync(versionMarkerPath, 'utf-8').trim();
    return currentVersion === extensionEditorInfo.sha256;
  } catch (e) {
    return false;
  }
};

const run = async () => {
  if (!extensionEditorInfo.src || !extensionEditorInfo.sha256) {
    throw new Error('scripts/extension-editor.json is missing src or sha256');
  }

  if (isAlreadyDownloaded()) {
    console.log('Extension editor already updated');
    return;
  }

  console.log(`Downloading ${extensionEditorInfo.src}`);
  console.time('Download extension editor');

  const response = await persistentFetch(extensionEditorInfo.src);
  const buffer = await response.arrayBuffer();
  const sha256 = computeSHA256(buffer);

  if (extensionEditorInfo.sha256 !== sha256) {
    throw new Error(`Hash mismatch: expected ${extensionEditorInfo.sha256} but found ${sha256}`);
  }

  fs.rmSync(outputDirectory, {
    recursive: true,
    force: true
  });
  fs.mkdirSync(extractedDirectory, {
    recursive: true
  });

  const zip = new AdmZip(Buffer.from(buffer));
  zip.extractAllTo(extractedDirectory, true);
  fs.writeFileSync(versionMarkerPath, `${sha256}\n`);

  console.timeEnd('Download extension editor');
};

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
