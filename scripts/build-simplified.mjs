import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import * as pathUtil from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = pathUtil.dirname(__filename);

/**
 * 简化的统一构建脚本
 * 适用于所有平台（Linux、macOS、Windows）
 */

const isCI = process.env.CI === 'true';
const isWindows = process.platform === 'win32';

console.log(`=== 简化构建流程 ===`);
console.log(`环境: ${isCI ? 'CI' : '本地'}`);
console.log(`平台: ${process.platform}`);
console.log(`是否Windows: ${isWindows}`);

/**
 * 执行命令
 */
const runCommand = (command, cwd, description) => {
    console.log(`\n> ${description}`);
    console.log(`命令: ${command}`);
    
    const result = childProcess.spawnSync(command, {
        cwd,
        shell: true,
        stdio: 'inherit'
    });
    
    if (result.status !== 0) {
        console.error(`错误: ${description} 失败，退出码: ${result.status}`);
        if (!isCI) {
            process.exit(result.status);
        }
        console.error('CI环境中继续执行...');
        return false;
    }
    
    console.log(`完成: ${description}`);
    return true;
};

/**
 * 主构建流程
 */
const main = () => {
    try {
        const desktopPath = pathUtil.resolve(__dirname, '..');
        
        // 1. 克隆仓库（仅在CI中）
        if (isCI) {
            console.log('\n=== 步骤1: 克隆依赖仓库 ===');
            runCommand('npm run fetch', desktopPath, '获取依赖和库文件');
        } else {
            console.log('\n=== 步骤1: 本地环境，跳过克隆 ===');
        }
        
        // 2. 准备扩展（使用优化版本）
        console.log('\n=== 步骤2: 准备扩展 ===');
        const extScript = isWindows ? 'prepare-extensions-optimized' : 'prepare-extensions-optimized';
        runCommand(`npm run ${extScript}`, desktopPath, '准备扩展');
        
        // 3. 编译项目
        console.log('\n=== 步骤3: 编译项目 ===');
        runCommand('npm run webpack:prod', desktopPath, 'Webpack编译');
        
        console.log('\n=== 构建完成 ===');
        console.log('输出目录: dist/');
        
    } catch (error) {
        console.error('\n=== 构建失败 ===');
        console.error(error);
        process.exit(1);
    }
};

// 运行主流程
main();