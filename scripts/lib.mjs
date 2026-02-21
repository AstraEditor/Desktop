import * as nodeCrypto from 'node:crypto';
process.env.UNDICI_CONNECT_TIMEOUT = '30';

/**
 * @param {ArrayBuffer} buffer
 * @returns {string}
 */
export const computeMD5 = (buffer) => nodeCrypto
  .createHash('md5')
  .update(new Uint8Array(buffer))
  .digest('hex');

/**
 * @param {ArrayBuffer} buffer
 * @returns {string}
 */
export const computeSHA256 = (buffer) => nodeCrypto
  .createHash('sha256')
  .update(new Uint8Array(buffer))
  .digest('hex');

/**
 * @param {string} url
 * @param {RequestInit} [opts]
 * @returns {Promise<Response>}
 */
export const persistentFetch = async (url, opts) => {
  let err;
  for (let i = 0; i < 10; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000); // 120秒超时
      
      const response = await fetch(url, {
        ...opts,
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (response.status !== 200) {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
      return response;
    } catch (e) {
      if (i === 0) err = e;
      console.warn(`Attempt to fetch ${url} failed (attempt ${i + 1}/10), trying again...`);
      // 等待一段时间再重试
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  throw err;
};
