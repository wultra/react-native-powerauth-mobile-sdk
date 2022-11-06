#!/bin/bash

TOP=$(dirname $0)
source "$TOP/common-functions.sh"
SRC="${TOP}/.."

DO_TSC=1
DO_ANDROID=1
DO_IOS=1

if [ ! -z $1 ]; then
    case $1 in
        android) 
            DO_TSC=0
            DO_ANDROID=1
            DO_IOS=0
            ;;
        ios) 
            DO_TSC=0
            DO_ANDROID=0
            DO_IOS=1
            ;;
        tsc | typescript) 
            DO_TSC=1
            DO_ANDROID=0
            DO_IOS=0
            ;;
        *) 
            FAILURE "Unknown build target $1" ;;
    esac
fi

LOG '------------------------------------------------------------'
LOG 'Installing dependencies'
LOG '------------------------------------------------------------'

export NPM_TOKEN="DUMMY" # dummy variable to silence npm error

# jump to top-project-folder
PUSH_DIR "${SRC}"

# instal npm dependencies
npm i

if [ x$DO_IOS == x1 ]; then
    LOG '------------------------------------------------------------'
    LOG 'Building iOS platform'
    LOG '------------------------------------------------------------'

    npx pod-install

    PUSH_DIR ios

    LOG '------------------------------------------------------------'
    LOG 'Compiling iOS Release'
    LOG '------------------------------------------------------------'

    xcrun xcodebuild \
        -workspace "PowerAuth.xcworkspace" \
        -scheme "PowerAuth" \
        -configuration "Release" \
        -sdk "iphonesimulator" \
        -arch x86_64 \
        build

    LOG '------------------------------------------------------------'
    LOG 'Compiling iOS Debug'
    LOG '------------------------------------------------------------'

    xcrun xcodebuild \
        -workspace "PowerAuth.xcworkspace" \
        -scheme "PowerAuth" \
        -configuration "Debug" \
        -sdk "iphonesimulator" \
        -arch x86_64 \
        build

    POP_DIR

fi # DO_IOS

if [ x$DO_ANDROID == x1 ]; then
    LOG '------------------------------------------------------------'
    LOG 'Building Android platform'
    LOG '------------------------------------------------------------'

    PUSH_DIR android

    ./gradlew clean build
    
    POP_DIR

fi # DO_ANDROID

if [ x$DO_TSC == x1 ]; then
    LOG '------------------------------------------------------------'
    LOG 'Building library'
    LOG '------------------------------------------------------------'

    tsc --build

    PUSH_DIR testapp
    
    LOG '------------------------------------------------------------'
    LOG 'Building testapp'
    LOG '------------------------------------------------------------'

    tsc --build

    POP_DIR

fi # DO_TSC

POP_DIR

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

EXIT_SUCCESS