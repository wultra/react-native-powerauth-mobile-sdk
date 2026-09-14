const layout = require('../scripts/build-layout.cjs');
const useSpm = process.env.POWERAUTH_TESTAPP_IOS_SPM === '1';

module.exports = {
  project: {
    ios: {
      sourceDir: useSpm ? './ios-spm' : './ios',
      automaticPodsInstallation: !useSpm,
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
