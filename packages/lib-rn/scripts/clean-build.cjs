const fs = require('fs');
const path = require('path');

fs.rmSync(path.join(__dirname, '..', 'lib'), { recursive: true, force: true });
