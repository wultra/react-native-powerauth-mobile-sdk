#!/usr/bin/env bash

# Local development check for validating the packed SDK in a clean RN app.
set -euo pipefail

export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

platform="${1:-}"
if [[ "$platform" != "android" && "$platform" != "ios" && "$platform" != "ios-spm" ]]; then
  echo "Usage: $0 <android|ios|ios-spm>" >&2
  exit 1
fi

root_dir="$(cd "$(dirname "$0")/.." && pwd)"
archives=("$root_dir"/packages/lib-rn/build/react-native-powerauth-mobile-sdk-*.tgz)
if [[ ${#archives[@]} -ne 1 || ! -f "${archives[0]}" ]]; then
  echo "Expected one React Native package archive in packages/lib-rn/build." >&2
  echo "Run 'yarn packReactNative' first." >&2
  exit 1
fi
archive="${archives[0]}"

temp_dir="$(mktemp -d)"
trap 'rm -rf "$temp_dir"' EXIT

pushd "$temp_dir" >/dev/null
npx --yes @react-native-community/cli@20.2.0 init ConsumerApp \
  --version 0.87.0 \
  --pm npm \
  --skip-git-init \
  --skip-install
pushd ConsumerApp >/dev/null
npm install
npm install "$archive"

if [[ "$platform" == "android" ]]; then
  if [[ -z "${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}" ]]; then
    echo "ANDROID_HOME or ANDROID_SDK_ROOT must point to an installed Android SDK." >&2
    exit 1
  fi
  ./android/gradlew -p android :app:assembleDebug
elif [[ "$platform" == "ios" ]]; then
  pushd ios >/dev/null
  pod install
  xcodebuild build \
    -workspace ConsumerApp.xcworkspace \
    -scheme ConsumerApp \
    -configuration Debug \
    -destination 'generic/platform=iOS Simulator' \
    CODE_SIGNING_ALLOWED=NO \
    IPHONEOS_DEPLOYMENT_TARGET=15.1
  popd >/dev/null
else
  npx react-native spm scaffold --deintegrate --yes
  pushd ios >/dev/null
  for configuration in Debug Release; do
    xcodebuild build \
      -project ConsumerApp.xcodeproj \
      -scheme ConsumerApp \
      -configuration "$configuration" \
      -destination 'generic/platform=iOS Simulator' \
      CODE_SIGNING_ALLOWED=NO \
      IPHONEOS_DEPLOYMENT_TARGET=15.1
  done
  popd >/dev/null
fi

popd >/dev/null
popd >/dev/null
