const fs = require('fs');
const path = require('path');

const modulePath = path.resolve('node_modules/react-native-maps');

if (fs.existsSync(modulePath)) {
  const webFile = path.join(modulePath, 'lib/index.web.js');
  const libDir = path.dirname(webFile);
  
  // Create lib directory if it doesn't exist
  if (!fs.existsSync(libDir)) {
    fs.mkdirSync(libDir, { recursive: true });
  }
  
  if (!fs.existsSync(webFile)) {
    console.log('🛠  Fixing react-native-maps for Web...');
    fs.writeFileSync(webFile, "module.exports = { default: {} };", 'utf8');
  }
} else {
  // No react-native-maps installed — nothing to do.
  // console.log('react-native-maps not found; skipping fix.');
}
