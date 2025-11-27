const fs = require('fs');

function validatePackageJson(packagePath) {
  if (!fs.existsSync(packagePath)) {
    console.log(`Warning: ${packagePath} not found`);
    return true;
  }
  
  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    if (!pkg.name || !pkg.version) {
      console.error(`Missing name or version in ${packagePath}`);
      return false;
    }
    
    // Validate version format (x.y.z or x.y.z-prerelease etc.)
    const versionRegex = /^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.-]+)?$/;
    if (!versionRegex.test(pkg.version)) {
      console.error(`Invalid version format in ${packagePath}: ${pkg.version}`);
      return false;
    }
    
    console.log(`✓ ${packagePath} is valid`);
    return true;
  } catch (e) {
    console.error(`Error parsing ${packagePath}:`, e.message);
    return false;
  }
}

// Get the package path from command line argument
const packagePath = process.argv[2];
if (!packagePath) {
  console.error('Please provide a package.json path as argument');
  process.exit(1);
}

const isValid = validatePackageJson(packagePath);
process.exit(isValid ? 0 : 1);