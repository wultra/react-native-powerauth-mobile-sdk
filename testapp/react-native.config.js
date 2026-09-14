const layout = require('../scripts/build-layout.cjs');

module.exports = {
  project: {
    ios: {
      automaticPodsInstallation: true,
    },
  },
  dependencies: {
    'react-native-powerauth-mobile-sdk': {
      root: layout.rn.stageDir,
      platforms: {
        // Codegen incorrectly fails without explicit platform entries.
        ios: {},
        android: {},
      },
    },
  },
};
