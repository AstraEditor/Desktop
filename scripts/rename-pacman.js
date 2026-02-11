const fs = require('fs');
const path = require('path');

exports.default = function(context) {
    if (context.electronPlatformName === 'linux') {
        const distDir = context.appOutDir;
        const files = fs.readdirSync(distDir);
        files.forEach(file => {
            if (file.endsWith('.pacman')) {
                const newName = file.replace('.pacman', '.pkg.tar.zst');
                fs.renameSync(path.join(distDir, file), path.join(distDir, newName));
            }
        });
    }
};
