const path = require('path');

module.exports = {
  project: {
    ios: {
      automaticPodsInstallation: true,
    },
  },
  dependencies: {
    'react-native-powerauth-mobile-sdk': {
      root: path.join(__dirname, '..', 'packages', 'lib-rn', 'build', 'rn'),
      platforms: {
        // Codegen incorrectly fails without explicit platform entries.
        ios: {},
        android: {},
      },
    },
  },
};
