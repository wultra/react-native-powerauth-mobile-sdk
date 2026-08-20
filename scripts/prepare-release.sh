#!/bin/bash

set -e # stop script when error occurs
set -u # stop when undefined variable is used
set -o pipefail # stop when a command in a pipeline fails
#set -x # print all execution (good for debugging)

######### USAGE #########
#
# To prepare or verify release metadata of the library (setting the proper version, updating changelog, etc.)
# - this script runs the JavaScript script from Wultra infrastructure repository
# - it uses data defined in `.prepare-release.json` file in the root of the repository
# - it passes all parameters to the JavaScript script
#
# Usage: sh scripts/prepare-release.sh [-v X.Y.Z] [options]
#
# 1. With a version (-v X.Y.Z) argument:
#  - it will prepare the release with the specified version
#  - use it when you're preparing a new release pull-request
#  - Example: sh scripts/prepare-release.sh -v 1.0.0
#
# 2. With a version and --verify:
#  - it will verify that the given release version is prepared.
#  - use it to make sure that the release pull-request is properly prepared (also used on CI)
#  - Example: sh scripts/prepare-release.sh -v 1.0.0 --verify
#
# 3. With --prepare-dev:
#  - it will verify the current release and prepare files for development.
#  - Example: sh scripts/prepare-release.sh --prepare-dev
#
# Without -v, the current version is read and only verified.
#
# Options:
# - --ignore-git-clean: skip the initial and final Git cleanliness checks
# - --enforce-git-clean: fail instead of asking when the repository is initially dirty
# - -h, --help: show help
#
#########################

# path to the script folder
SCRIPT_FOLDER=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
PROJECT_ROOT="${SCRIPT_FOLDER}/.."

# URL of the JavaScript prepare-release script in Wultra infrastructure repository
URL="https://raw.githubusercontent.com/wultra/wultra-infrastructure/refs/heads/mobile/mobile/release/prepare/prepare-release.js"

# Execute the remote node and pass all parameters to it + add path parameter to the root of the repository.
curl -fsSL "${URL}" -H 'Cache-Control: no-cache' -H 'Pragma: no-cache' | node - -p "${PROJECT_ROOT}" "${@}"
