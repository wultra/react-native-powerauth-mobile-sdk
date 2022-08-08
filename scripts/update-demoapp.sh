#!/bin/bash
TOP=$(dirname $0)
source "$TOP/common-functions.sh"
SRC="${TOP}/.."

REQUIRE_COMMAND "pod"
REQUIRE_COMMAND "npm"

LIB='react-native-powerauth-mobile-sdk'

function LIB_PACKAGE
{
    LOG_LINE
    LOG 'Building library archive'
    LOG_LINE

    PUSH_DIR "$SRC"

    rm ${LIB}-*.tgz
    tsc -b
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
}

LIB_PACKAGE
UPDATE_DEPENDENCIES demoapp
# UPDATE_DEPENDENCIES testapp

EXIT_SUCCESS