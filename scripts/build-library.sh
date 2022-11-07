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

LOG_LINE
LOG 'Installing dependencies'
LOG_LINE

export NPM_TOKEN="DUMMY" # dummy variable to silence npm error

# jump to top-project-folder
PUSH_DIR "${SRC}"

# instal npm dependencies
npm i

if [ x$DO_IOS == x1 ]; then
    LOG_LINE
    LOG 'Building iOS platform'
    LOG_LINE

    npx pod-install

    PUSH_DIR ios

    LOG_LINE
    LOG 'Compiling iOS Release'
    LOG_LINE

    xcrun xcodebuild \
        -workspace "PowerAuth.xcworkspace" \
        -scheme "PowerAuth" \
        -configuration "Release" \
        -sdk "iphonesimulator" \
        -arch x86_64 \
        build

    LOG_LINE
    LOG 'Compiling iOS Debug'
    LOG_LINE

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
    LOG_LINE
    LOG 'Building Android platform'
    LOG_LINE


    PUSH_DIR android

    ./gradlew clean build
    
    POP_DIR

fi # DO_ANDROID

if [ x$DO_TSC == x1 ]; then
    LOG_LINE
    LOG 'Building library'
    LOG_LINE

    tsc --build

    PUSH_DIR testapp

    LOG_LINE
    LOG 'Updating testapp dependencies'
    LOG_LINE

    "${TOP}/update-apps.sh"

    LOG_LINE
    LOG 'Building testapp'
    LOG_LINE

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