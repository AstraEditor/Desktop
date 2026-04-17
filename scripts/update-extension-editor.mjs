import * as fs from 'node:fs';
import * as pathUtil from 'node:path';
import {computeSHA256, persistentFetch} from './lib.mjs';

const RELEASES_URL = 'https://api.github.com/repos/AstraEditor/scratch-extension-editor/releases';

const run = async () => {
  const releases = await (await persistentFetch(RELEASES_URL)).json();
  const latestRelease = releases[0];

  if (!latestRelease) {
    throw new Error('No extension editor releases found');
  }

  const asset = latestRelease.assets.find((candidate) => candidate.name === 'extension-editor.zip') ||
    latestRelease.assets.find((candidate) => candidate.name.endsWith('.zip'));

  if (!asset) {
    throw new Error(`No zip asset found in release ${latestRelease.tag_name || latestRelease.name || 'unknown'}`);
  }

  console.log(`Source: ${asset.browser_download_url}`);
  const archiveBuffer = await (await persistentFetch(asset.browser_download_url)).arrayBuffer();
  const sha256 = computeSHA256(archiveBuffer);
  console.log(`SHA-256: ${sha256}`);

  fs.writeFileSync(pathUtil.join(import.meta.dirname, 'extension-editor.json'), JSON.stringify({
    src: asset.browser_download_url,
    sha256
  }, null, 2));
  console.log('This has only updated metadata; you still need to actually download the archive with download-extension-editor.mjs');
};

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
