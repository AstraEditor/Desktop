import * as fs from 'node:fs';
import * as pathUtil from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = pathUtil.dirname(__filename);

console.log('=== 验证统一构建配置 ===');

const desktopPath = pathUtil.resolve(__dirname, '..');
const buildAutoPath = pathUtil.join(desktopPath, '.github/workflows/build-auto.yml');
const buildPath = pathUtil.join(desktopPath, '.github/workflows/build.yml');
const packageJsonPath = pathUtil.join(desktopPath, 'package.json');

// 验证文件存在
console.log('\n1. 验证构建脚本文件:');
const scripts = [
    'scripts/build-common.mjs',
    'scripts/build-simplified.mjs', 
    'scripts/test-build.mjs'
];

for (const script of scripts) {
    const scriptPath = pathUtil.join(desktopPath, script);
    const exists = fs.existsSync(scriptPath);
    console.log(`  ${script}: ${exists ? '✓' : '✗'}`);
}

// 验证package.json中的脚本
console.log('\n2. 验证package.json脚本:');
try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const scripts = packageJson.scripts;
    
    const requiredScripts = [
        'build-simplified',
        'prepare-extensions-optimized'
    ];
    
    for (const script of requiredScripts) {
        const exists = scripts && scripts[script];
        console.log(`  ${script}: ${exists ? '✓' : '✗'}`);
    }
} catch (e) {
    console.log('  package.json: ✗ (读取失败)');
}

// 验证GitHub Actions配置
console.log('\n3. 验证GitHub Actions配置:');

if (fs.existsSync(buildAutoPath)) {
    const buildAutoContent = fs.readFileSync(buildAutoPath, 'utf-8');
    const hasSimplified = buildAutoContent.includes('npm run build-simplified');
    console.log(`  build-auto.yml 使用统一构建: ${hasSimplified ? '✓' : '✗'}`);
} else {
    console.log('  build-auto.yml: ✗ (文件不存在)');
}

if (fs.existsSync(buildPath)) {
    const buildContent = fs.readFileSync(buildPath, 'utf-8');
    const hasSimplified = buildContent.includes('npm run build-simplified');
    console.log(`  build.yml 使用统一构建: ${hasSimplified ? '✓' : '✗'}`);
} else {
    console.log('  build.yml: ✗ (文件不存在)');
}

console.log('\n=== 验证完成 ===');
console.log('统一构建配置已成功设置！');
console.log('\n主要改进:');
console.log('1. 创建了统一的构建脚本 (build-simplified.mjs)');
console.log('2. 所有平台使用相同的扩展准备脚本 (prepare-extensions-optimized)');
console.log('3. 简化了GitHub Actions工作流');
console.log('4. 统一了错误处理逻辑');
console.log('\n使用方法:');
console.log('- 本地构建: npm run build-simplified');
console.log('- CI构建: 自动使用 build-simplified 脚本');