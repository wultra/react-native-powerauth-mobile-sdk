#!/bin/bash
TOP=$(dirname $0)
source "$TOP/common-functions.sh"
SRC="${TOP}/.."

REQUIRE_COMMAND "pod"
REQUIRE_COMMAND "npm"

LIB='react-native-powerauth-mobile-sdk'

LOG_LINE
LOG 'Building library archive'
LOG_LINE

PUSH_DIR "$SRC"

rm ${LIB}-*.tgz
npm pack
LIB_ARCHIVE=$(ls | grep ${LIB}-*.tgz)
[[ -z "$LIB_ARCHIVE" ]] && FAILURE "npm pack did not produce library archive"

POP_DIR

LOG_LINE
LOG 'Updating dependency in demoapp project'
LOG_LINE

PUSH_DIR "$SRC/demoapp"

npm r $LIB
npm i ../$LIB_ARCHIVE 

POP_DIR

LOG_LINE
LOG 'Updating CocoaPods...'
LOG_LINE

PUSH_DIR "$SRC/demoapp/ios"
pod update
POP_DIR

EXIT_SUCCESS