#!/bin/bash

set -e # stop sript when error occures
set -u # stop when undefined variable is used
#set -x # print all execution (good for debugging)

echo '------------------------------------------------------------'
echo 'Installing dependencies'
echo '------------------------------------------------------------'
export NPM_TOKEN="DUMMY" # dummy variable to silence npm error

TOP=$(dirname $0)

# jump to top-project-folder
pushd "${TOP}/.."

# instal npm dependencies
npm i

echo '------------------------------------------------------------'
echo 'Building iOS platform'
echo '------------------------------------------------------------'

npx pod-install

pushd ios

xcrun xcodebuild \
    -workspace "PowerAuth.xcworkspace" \
    -scheme "PowerAuth" \
    -configuration "Release" \
    -sdk "iphonesimulator" \
    -arch x86_64 \
    build

popd

echo '------------------------------------------------------------'
echo 'Building Android platform'
echo '------------------------------------------------------------'

pushd android

./gradlew clean build

echo '------------------------------------------------------------'
echo 'Building Typescript'
echo '------------------------------------------------------------'
popd
tsc --build

# THIS IS TEMPORARY DISABLED - FOR SOME REASON, GIT STATUS IS DIFFERENT IN PODS THAN IN LOCAL ENV.
# check if the git status is clean (there should be no changs)
# if [ -z "$(git status --porcelain)" ]; then 
#   echo "Git status clean."
# else 
#   echo "ERROR: Git status is not clean."
#   git status
#   git diff
#   exit 1
# fi

echo '------------------------------------------------------------'
echo 'SUCCESS'
echo ''