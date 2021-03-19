#!/bin/bash

set -e # stop sript when error occures
set -u # stop when undefined variable is used
#set -x # print all execution (good for debugging)

export NPM_TOKEN="DUMMY" # dummy variable to silence npm error

TOP=$(dirname $0)

# jump to top-project-folder
pushd "${TOP}/.."

# instal npm dependencies
npm i

# install pods
npx pod-install

# build ios
pushd ios

xcrun xcodebuild \
    -workspace "PowerAuth.xcworkspace" \
    -scheme "PowerAuth" \
    -configuration "Release" \
    -sdk "iphonesimulator" \
    build

popd

# build android
pushd android

gradle clean build -PincludeAndroidToolsVersion=true

# build Typescript
popd
tsc --build

# check if the git status is clean (there should be no changs)
if [ -z "$(git status --porcelain)" ]; then 
  echo "Git status clean."
else 
  echo "ERROR: Git status is not clean."
  git status
  git diff
  exit 1
fi