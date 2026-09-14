/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS tooling. */
const fs = require('node:fs');
const path = require('node:path');

// RN 0.87 hardcodes iOS 15.0 in its generated aggregate, below the SDK's 15.1.
// Normalize only this disposable consumer manifest, after setup and every sync.
function normalizePlatform() {
  const manifestPath = path.resolve(
    __dirname,
    '../ios-spm/build/generated/autolinking/Package.swift',
  );
  const content = fs.readFileSync(manifestPath, 'utf8');
  const expected = 'platforms: [.iOS(.v15)],';
  const corrected = 'platforms: [.iOS("15.1")],';
  if (content.includes(corrected)) {
    return;
  }
  if (!content.includes(expected)) {
    throw new Error(
      'RN generated SwiftPM platform changed; review the iOS 15.1 consumer workaround.',
    );
  }
  fs.writeFileSync(manifestPath, content.replace(expected, corrected));
}

module.exports = { normalizePlatform };
if (require.main === module) {
  normalizePlatform();
}
