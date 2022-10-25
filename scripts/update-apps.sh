#!/bin/bash
TOP=$(dirname $0)
source "$TOP/common-functions.sh"
SRC="${TOP}/.."

REQUIRE_COMMAND "pod"
REQUIRE_COMMAND "npm"

LIB='react-native-powerauth-mobile-sdk'

DO_TEST=1
DO_RUN=0
case $1 in
    test | testapp) 
        DO_TEST=1 ;;
    run | -r)
        DO_RUN=1 ;;
    *) 
        DO_TEST=1 ;;
esac

function LIB_PACKAGE
{

    PUSH_DIR "$SRC"

    LOG_LINE
    LOG 'Compiling typescript'
    LOG_LINE

    tsc -b
    
    LOG_LINE
    LOG 'Building library archive'
    LOG_LINE

    local file=( ${LIB}-*.tgz )
    [[ -f "$file" ]] && $RM ${LIB}-*.tgz

    npm pack
    LIB_ARCHIVE=$(ls | grep ${LIB}-*.tgz)
    [[ -z "$LIB_ARCHIVE" ]] && FAILURE "npm pack did not produce library archive"

    POP_DIR
}

function UPDATE_DEPENDENCIES
{
    local APP_NAME=$1

    LOG_LINE
    LOG "Updating dependency in '${APP_NAME}' project"
    LOG_LINE

    PUSH_DIR "${SRC}/${APP_NAME}"

    npm r $LIB
    npm i ../$LIB_ARCHIVE 

    POP_DIR

    LOG_LINE
    LOG 'Updating CocoaPods...'
    LOG_LINE

    PUSH_DIR "${SRC}/${APP_NAME}/ios"
    pod install
    POP_DIR

    if [ x$DO_RUN == x1 ]; then
        PUSH_DIR "${SRC}/${APP_NAME}"

        LOG_LINE
        LOG 'Starting Android app...'
        LOG_LINE
        npm run android

        LOG_LINE
        LOG 'Starting iOS app...'
        LOG_LINE
        npm run ios

        POP_DIR
    fi
}

LIB_PACKAGE
[[ x$DO_TEST == x1 ]] && UPDATE_DEPENDENCIES testapp
EXIT_SUCCESS