import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourceDir = path.resolve(__dirname, '../../extensions/build');
const destDir = path.resolve(__dirname, '../dist-extensions');

console.log('=== 复制扩展文件 ===');
console.log('源目录:', sourceDir);
console.log('目标目录:', destDir);

// 删除目标目录如果存在
if (fs.existsSync(destDir)) {
  console.log('删除已存在的目标目录...');
  fs.rmSync(destDir, { recursive: true, force: true });
}

// 创建目标目录
fs.mkdirSync(destDir, { recursive: true });

// 递归复制函数
async function copyDir(src, dest) {
  const entries = await fsPromises.readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      await copyDir(srcPath, destPath);
    } else {
      await fsPromises.copyFile(srcPath, destPath);
    }
  }
}

// 执行复制
try {
  await copyDir(sourceDir, destDir);
  console.log('=== 复制成功！ ===');
  
  // 统计文件数量
  const countFiles = (dir) => {
    let count = 0;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        count += countFiles(path.join(dir, entry.name));
      } else {
        count++;
      }
    }
    return count;
  };
  
  const fileCount = countFiles(destDir);
  console.log(`总共复制了 ${fileCount} 个文件`);
} catch (error) {
  console.error('复制失败:', error);
  process.exit(1);
}
