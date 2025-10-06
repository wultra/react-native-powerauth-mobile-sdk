const fs = require('fs');
const path = require('path');

const pkg = require('../package.json');

const outDir = path.join(__dirname, '..', 'src', 'internal');
const outFile = path.join(outDir, 'SDKVersion.ts');

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, `// AUTO-GENERATED\nexport const SDK_VERSION = '${pkg.version}';\n`);
console.log(`Wrote ${outFile}`);



