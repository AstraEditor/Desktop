import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import * as pathUtil from 'node:path';

/**
 * 通用构建脚本，统一自动构建和手动构建的流程
 */

const REPO_LIST = [
    'scratch-gui',
    'scratch-vm', 
    'scratch-audio',
    'scratch-blocks',
    'scratch-paint',
    'scratch-render'
];

const REPO_PARENT = process.env.REPO_PARENT || pathUtil.resolve(__dirname, '../..');

/**
 * 执行命令并处理错误
 */
const execCommand = (command, cwd, description) => {
    console.log(`执行: ${description}`);
    console.log(`命令: ${command}`);
    console.log(`目录: ${cwd}`);
    
    const result = childProcess.spawnSync(command, {
        cwd,
        shell: true,
        stdio: 'inherit'
    });
    
    if (result.status !== 0) {
        console.error(`错误: ${description} 失败，退出码: ${result.status}`);
        if (process.env.CI) {
            console.error('CI环境中继续执行...');
            return false;
        } else {
            process.exit(result.status);
        }
    }
    
    console.log(`完成: ${description}`);
    return true;
};

/**
 * 克隆仓库（仅在CI环境中使用）
 */
const cloneRepositories = () => {
    if (!process.env.CI) {
        console.log('非CI环境，跳过仓库克隆');
        return;
    }
    
    console.log('开始克隆依赖仓库...');
    
    for (const repoName of REPO_LIST) {
        const repoUrl = `https://github.com/AstraEditor/${repoName}.git`;
        const repoPath = pathUtil.join(REPO_PARENT, repoName);
        
        if (fs.existsSync(repoPath)) {
            console.log(`${repoName} 已存在，跳过克隆`);
            continue;
        }
        
        console.log(`克隆 ${repoName}...`);
        const success = execCommand(
            `git clone --depth 1 --single-branch "${repoUrl}" "${repoPath}"`,
            REPO_PARENT,
            `克隆 ${repoName}`
        );
        
        if (!success) {
            console.error(`克隆 ${repoName} 失败`);
        }
    }
    
    console.log('仓库克隆完成');
};

/**
 * 验证package.json文件
 */
const validatePackageFiles = () => {
    console.log('开始验证package.json文件...');
    
    // 验证Desktop的package.json
    const desktopPackagePath = pathUtil.resolve(__dirname, '../package.json');
    if (fs.existsSync(desktopPackagePath)) {
        execCommand(
            `node "${pathUtil.resolve(__dirname, 'validate-package.js')}" "${desktopPackagePath}"`,
            pathUtil.dirname(desktopPackagePath),
            '验证Desktop package.json'
        );
    }
    
    // 验证依赖仓库的package.json
    for (const repoName of REPO_LIST) {
        const packagePath = pathUtil.join(REPO_PARENT, repoName, 'package.json');
        if (fs.existsSync(packagePath)) {
            execCommand(
                `node "${pathUtil.resolve(__dirname, 'validate-package.js')}" "${packagePath}"`,
                pathUtil.dirname(packagePath),
                `验证 ${repoName} package.json`
            );
        } else {
            console.log(`警告: ${repoName}/package.json 不存在`);
        }
    }
    
    console.log('package.json验证完成');
};

/**
 * 安装和构建scratch-gui
 */
const installAndBuildScratchGui = () => {
    const guiPath = pathUtil.join(REPO_PARENT, 'scratch-gui');
    
    if (!fs.existsSync(guiPath)) {
        console.error('scratch-gui目录不存在');
        return;
    }
    
    console.log('安装scratch-gui依赖...');
    execCommand(
        'npm ci --no-audit --no-fund',
        guiPath,
        '安装scratch-gui依赖'
    );
};

/**
 * 安装和构建scratch-vm
 */
const installAndBuildScratchVm = () => {
    const vmPath = pathUtil.join(REPO_PARENT, 'scratch-vm');
    
    if (!fs.existsSync(vmPath)) {
        console.error('scratch-vm目录不存在');
        return;
    }
    
    console.log('安装scratch-vm依赖...');
    execCommand(
        'npm ci --no-audit --no-fund',
        vmPath,
        '安装scratch-vm依赖'
    );
    
    console.log('构建scratch-vm...');
    execCommand(
        'npm run build',
        vmPath,
        '构建scratch-vm'
    );
    
    console.log('创建scratch-vm的npm link...');
    execCommand(
        'npm link',
        vmPath,
        '创建scratch-vm的npm link'
    );
};

/**
 * 安装和构建其他scratch依赖
 */
const installAndBuildOtherDependencies = () => {
    const buildCommands = {
        'scratch-audio': 'npm run build',
        'scratch-blocks': 'npm run prepublish',
        'scratch-paint': 'npm run build',
        'scratch-render': 'npm run build'
    };
    
    for (const repoName of Object.keys(buildCommands)) {
        const repoPath = pathUtil.join(REPO_PARENT, repoName);
        
        if (!fs.existsSync(repoPath)) {
            console.log(`${repoName}目录不存在，跳过`);
            continue;
        }
        
        console.log(`安装${repoName}依赖...`);
        execCommand(
            'npm ci --no-audit --no-fund',
            repoPath,
            `安装${repoName}依赖`
        );
        
        console.log(`构建${repoName}...`);
        execCommand(
            buildCommands[repoName],
            repoPath,
            `构建${repoName}`
        );
        
        console.log(`创建${repoName}的npm link...`);
        execCommand(
            'npm link',
            repoPath,
            `创建${repoName}的npm link`
        );
    }
};

/**
 * 将scratch模块链接到scratch-gui
 */
const linkModulesToGui = () => {
    const guiPath = pathUtil.join(REPO_PARENT, 'scratch-gui');
    
    if (!fs.existsSync(guiPath)) {
        console.error('scratch-gui目录不存在');
        return;
    }
    
    const modules = ['scratch-audio', 'scratch-blocks', 'scratch-paint', 'scratch-render', 'scratch-vm'];
    console.log('将scratch模块链接到scratch-gui...');
    execCommand(
        `npm link ${modules.join(' ')}`,
        guiPath,
        '链接scratch模块到scratch-gui'
    );
};

/**
 * 安装Desktop依赖
 */
const installDesktopDependencies = () => {
    const desktopPath = pathUtil.resolve(__dirname, '..');
    
    console.log('安装Desktop依赖...');
    const npmCommand = process.platform === 'win32' && process.env.CI 
        ? 'npm ci --no-audit --no-fund --cache D:\\npm-cache'
        : 'npm ci --no-audit --no-fund';
    
    execCommand(
        npmCommand,
        desktopPath,
        '安装Desktop依赖'
    );
};

/**
 * 准备扩展（使用优化版本）
 */
const prepareExtensions = () => {
    const desktopPath = pathUtil.resolve(__dirname, '..');
    
    console.log('准备扩展...');
    // 在Windows平台上使用优化版本
    const scriptName = process.platform === 'win32' ? 'prepare-extensions-optimized' : 'prepare-extensions-optimized';
    
    execCommand(
        `npm run ${scriptName}`,
        desktopPath,
        '准备扩展'
    );
};

/**
 * 获取库文件
 */
const fetchLibraryFiles = () => {
    const desktopPath = pathUtil.resolve(__dirname, '..');
    
    console.log('获取库文件...');
    execCommand(
        'npm run fetch',
        desktopPath,
        '获取库文件'
    );
};

/**
 * 编译项目
 */
const compileProject = () => {
    const desktopPath = pathUtil.resolve(__dirname, '..');
    
    console.log('开始webpack编译...');
    execCommand(
        'npm run webpack:prod',
        desktopPath,
        'webpack编译'
    );
};

/**
 * 主构建流程
 */
const main = async () => {
    console.log('=== 开始统一构建流程 ===');
    console.log(`环境: ${process.env.CI ? 'CI' : '本地'}`);
    console.log(`平台: ${process.platform}`);
    console.log(`Node.js版本: ${process.version}`);
    
    try {
        cloneRepositories();
        validatePackageFiles();
        installAndBuildScratchGui();
        installAndBuildScratchVm();
        installAndBuildOtherDependencies();
        linkModulesToGui();
        installDesktopDependencies();
        prepareExtensions();
        fetchLibraryFiles();
        compileProject();
        
        console.log('=== 统一构建流程完成 ===');
    } catch (error) {
        console.error('=== 构建流程失败 ===');
        console.error(error);
        process.exit(1);
    }
};

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export {
    main,
    cloneRepositories,
    validatePackageFiles,
    installAndBuildScratchGui,
    installAndBuildScratchVm,
    installAndBuildOtherDependencies,
    linkModulesToGui,
    installDesktopDependencies,
    prepareExtensions,
    fetchLibraryFiles,
    compileProject
};