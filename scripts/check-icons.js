const fs = require('fs');
const path = require('path');

// 检查是否存在logo.png
const logoPath = path.join(__dirname, '..', 'art', 'logo.png');
if (fs.existsSync(logoPath)) {
    console.log('Logo.png exists at:', logoPath);
    
    // 对于electron-builder，PNG文件通常可以被自动转换为ICO
    // 但为了确保兼容性，我们可以添加一个构建脚本来生成ICO文件
    console.log('Electron-builder should automatically convert PNG to ICO for Windows builds');
    console.log('If needed, you can use tools like png2ico or electron-icon-builder');
} else {
    console.error('Logo.png not found at:', logoPath);
}