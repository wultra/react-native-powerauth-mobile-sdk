#!/usr/bin/env bash
#
# Copyright 2026 Wultra s.r.o.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

set -euo pipefail

corepack enable
corepack prepare yarn@4.3.1 --activate

mkdir -p artifacts/e2e

require_env_key() {
  key="$1"
  if ! grep -E "^${key}=.+$" testapp/.env >/dev/null 2>&1; then
    echo "[e2e] Missing or empty ${key} in testapp/.env"
    exit 1
  fi
}

if [ ! -s testapp/.env ]; then
  echo "[e2e] Missing testapp/.env"
  exit 1
fi

require_env_key "POWERAUTH_CLOUD_URL"
require_env_key "POWERAUTH_CLOUD_USERNAME"
require_env_key "POWERAUTH_CLOUD_PASSWORD"
require_env_key "POWERAUTH_CLOUD_APP_ID"
require_env_key "ENROLLMENT_SERVER_URL"
require_env_key "TEST_COLLECTOR_URL"

MODE="${E2E_MODE:-full}"
case "${MODE}" in
  rn|cordova|full)
    ;;
  *)
    echo "[e2e] Invalid E2E_MODE '${MODE}'."
    exit 1
    ;;
esac
if [ "${MODE}" = "full" ]; then
  derived_expected=2
else
  derived_expected=1
fi
EXPECTED_RUNS_VALUE="${EXPECTED_RUNS:-$derived_expected}"
if [ -n "${EXPECTED_RUNS:-}" ] && [ "${EXPECTED_RUNS_VALUE}" -ne "${derived_expected}" ] 2>/dev/null; then
  EXPECTED_RUNS_VALUE="${derived_expected}"
fi
RUN_START_TIMEOUT_SEC="${E2E_RUN_START_TIMEOUT_SEC:-3600}"
RUN_COMPLETE_TIMEOUT_SEC="${E2E_COMPLETE_TIMEOUT_SEC:-3600}"
LAUNCH_GRACE_TIMEOUT_SEC="${E2E_LAUNCH_GRACE_TIMEOUT_SEC:-120}"
SIM_BOOT_TIMEOUT_SEC="${E2E_SIM_BOOT_TIMEOUT_SEC:-900}"
RN_LAUNCH_ATTEMPTS="${E2E_RN_LAUNCH_ATTEMPTS:-3}"
COLLECTOR_TIMEOUT="${E2E_COLLECTOR_TIMEOUT:-90m}"

node packages/mobile-test-runner/dist/cli.js collect --host 127.0.0.1 --port 8137 --out artifacts/e2e --expected-runs "${EXPECTED_RUNS_VALUE}" --timeout "${COLLECTOR_TIMEOUT}" &
COLLECTOR_PID=$!

METRO_PID=""
CDV_PID=""

wait_for_completed() {
  expected="$1"
  start_time="$(date +%s)"
  while true; do
    # This is kinda a hacky way to check if the collector has completed all runs and exit early.
    completed="$(node -e "fetch('http://127.0.0.1:8137/health').then(r=>r.json()).then(j=>process.stdout.write(String(j.completed ?? ''))).catch(()=>{})" 2>/dev/null || true)"
    if [ -n "${completed}" ]; then
      if [ "${completed}" -ge "${expected}" ] 2>/dev/null; then
        echo "[e2e] collector completed runs=${completed}"
        break
      fi
    else
      if ! kill -0 "${COLLECTOR_PID}" 2>/dev/null; then
        completed="$(node -e "const fs=require('fs');const p='artifacts/e2e/summary.json';if(fs.existsSync(p)){const s=JSON.parse(fs.readFileSync(p,'utf8'));process.stdout.write(String(s.receivedRuns ?? ''));}" 2>/dev/null || true)"
        if [ -n "${completed}" ]; then
          if [ "${completed}" -ge "${expected}" ] 2>/dev/null; then
            echo "[e2e] collector completed runs=${completed} (summary)"
            break
          fi
        fi
        return 1
      fi
    fi
    now="$(date +%s)"
    if [ "$((now - start_time))" -gt "${RUN_COMPLETE_TIMEOUT_SEC}" ]; then
      echo "[e2e] WARNING: Timeout waiting for collector completion count >= ${expected}"
      return 1
    fi
    sleep 10
  done
  return 0
}

wait_for_runs() {
  expected="$1"
  timeout_sec="$2"
  launch_pid="$3"
  launch_name="$4"
  start_time="$(date +%s)"
  launch_exit_time=""
  while true; do
    runs="$(node -e "fetch('http://127.0.0.1:8137/health').then(r=>r.json()).then(j=>process.stdout.write(String(j.runs ?? ''))).catch(()=>{})" 2>/dev/null || true)"
    if [ -n "${runs}" ]; then
      if [ "${runs}" -ge "${expected}" ] 2>/dev/null; then
        echo "[e2e] collector runs=${runs}"
        break
      fi
    fi
    if [ -n "${launch_pid}" ] && ! kill -0 "${launch_pid}" 2>/dev/null; then
      if wait "${launch_pid}"; then
        launch_exit_time="$(date +%s)"
        launch_pid=""
      else
        launch_status=$?
        echo "[e2e] ERROR: ${launch_name} exited with status ${launch_status} before starting a test run."
        return 1
      fi
    fi
    now="$(date +%s)"
    if [ -n "${launch_exit_time}" ] && [ "$((now - launch_exit_time))" -gt "${LAUNCH_GRACE_TIMEOUT_SEC}" ]; then
      echo "[e2e] ERROR: ${launch_name} exited before starting a test run."
      return 1
    fi
    if [ "$((now - start_time))" -gt "${timeout_sec}" ]; then
      echo "[e2e] WARNING: Timeout waiting for collector runs >= ${expected}"
      return 1
    fi
    sleep 10
  done
  return 0
}

wait_for_simulator_boot() {
  timeout_sec="$1"
  start_time="$(date +%s)"
  while true; do
    if xcrun simctl list devices booted | grep -q "${SIM_ID}"; then
      return 0
    fi
    now="$(date +%s)"
    if [ "$((now - start_time))" -gt "${timeout_sec}" ]; then
      return 1
    fi
    sleep 5
  done
}

abort_with_logs() {
  echo "[e2e] Aborting due to missing collector completion."
  if [ -n "${CDV_PID:-}" ]; then
    kill "${CDV_PID}" || true
  fi
  kill "${COLLECTOR_PID}" || true
  if [ -n "${METRO_PID:-}" ]; then
    echo "[e2e] Stopping Metro..."
    kill "${METRO_PID}" || true
  fi
  # xcrun simctl spawn booted log show --style syslog --last 10m > artifacts/e2e/ios-simulator.log || true
  exit 1
}

install_rn_pods() {
  echo "[e2e] Installing RN iOS Ruby gems..."
  if ! command -v bundle >/dev/null 2>&1; then
    echo "[e2e] Installing Bundler..."
    gem install bundler -v 2.6.2
  fi

  if ! (cd testapp && bundle check); then
    (cd testapp && bundle install)
  fi

  echo "[e2e] Installing RN iOS CocoaPods..."
  (
    cd testapp/ios
    COCOAPODS_DISABLE_STATS=1 \
      RCT_USE_RN_DEP=1 \
      RCT_USE_PREBUILT_RNCORE=1 \
      bundle exec pod install --repo-update --verbose
  )
}

install_and_launch_rn_app() {
  app_path="$1"
  bundle_id="$2"
  attempt=1

  while [ "${attempt}" -le "${RN_LAUNCH_ATTEMPTS}" ]; do
    echo "[e2e] Installing and launching RN iOS app (attempt ${attempt}/${RN_LAUNCH_ATTEMPTS})..."
    xcrun simctl terminate "${SIM_ID}" "${bundle_id}" >/dev/null 2>&1 || true
    xcrun simctl uninstall "${SIM_ID}" "${bundle_id}" >/dev/null 2>&1 || true

    if xcrun simctl install "${SIM_ID}" "${app_path}" &&
      xcrun simctl launch "${SIM_ID}" "${bundle_id}"; then
      return 0
    fi

    if [ "${attempt}" -lt "${RN_LAUNCH_ATTEMPTS}" ]; then
      echo "[e2e] WARNING: RN iOS launch failed; rebooting simulator before retry."
      xcrun simctl shutdown "${SIM_ID}" >/dev/null 2>&1 || true
      open -a Simulator --args -CurrentDeviceUDID "${SIM_ID}" || true
      xcrun simctl boot "${SIM_ID}" || true
      xcrun simctl bootstatus "${SIM_ID}" -b || true
    fi

    attempt=$((attempt + 1))
  done

  echo "[e2e] ERROR: Failed to install and launch RN iOS app."
  return 1
}

SIM_ID=""
SIM_LINE=""
CORDOVA_SIM_TARGET=""

pick_simulator_from_list() {
  local list="$1"
  local line
  line="$(printf '%s\n' "${list}" | grep -E 'iPhone' | head -n 1)"
  if [ -z "${line}" ]; then
    line="$(printf '%s\n' "${list}" | grep -E 'iPad' | head -n 1)"
  fi
  if [ -z "${line}" ]; then
    return 1
  fi
  SIM_LINE="${line}"
  SIM_ID="$(printf '%s\n' "${line}" | grep -oE '[A-F0-9-]{36}')"
  [ -n "${SIM_ID}" ]
}

resolve_cordova_sim_target() {
  if [ -n "${E2E_IOS_SIMULATOR_TARGET:-}" ]; then
    CORDOVA_SIM_TARGET="${E2E_IOS_SIMULATOR_TARGET}"
    return 0
  fi

  local sdk_version runtime_id
  sdk_version="$(xcrun --sdk iphonesimulator --show-sdk-version)"
  runtime_id="com.apple.CoreSimulator.SimRuntime.iOS-${sdk_version//./-}"

  if ! CORDOVA_SIM_TARGET="$(
    xcrun simctl list devices available --json |
      RUNTIME_ID="${runtime_id}" node -e '
        const devices = JSON.parse(require("node:fs").readFileSync(0)).devices[process.env.RUNTIME_ID] || [];
        const device = devices.find(d => d.deviceTypeIdentifier.includes(".iPhone-")) ||
          devices.find(d => d.deviceTypeIdentifier.includes(".iPad-"));
        if (!device) process.exit(1);
        process.stdout.write(device.deviceTypeIdentifier.split(".").pop());
      '
  )"; then
    echo "[e2e] ERROR: No simulator matches the active iOS ${sdk_version} SDK."
    return 1
  fi
}

if [ "${MODE}" = "rn" ] || [ "${MODE}" = "full" ]; then
  booted_list="$(xcrun simctl list devices booted)"
  if pick_simulator_from_list "${booted_list}"; then
    echo "[e2e] Using booted simulator: ${SIM_LINE}"
  else
    available_list="$(xcrun simctl list devices available)"
    if pick_simulator_from_list "${available_list}"; then
      echo "[e2e] Booting iOS simulator: ${SIM_LINE}"
      open -a Simulator || true
      xcrun simctl boot "${SIM_ID}" || true
      if wait_for_simulator_boot "${SIM_BOOT_TIMEOUT_SEC}"; then
        if xcrun simctl help 2>&1 | grep -q "biometric"; then
          xcrun simctl biometric enroll "${SIM_ID}" face || true
          xcrun simctl biometric enroll "${SIM_ID}" finger || true
        else
          echo "[e2e] simctl biometric is not available on this runner."
          # Fallback for older Xcode: toggle enrollment via notifyutil inside the simulator runtime.
          xcrun simctl spawn "${SIM_ID}" notifyutil -s com.apple.BiometricKit.enrollmentChanged "1" || true
          xcrun simctl spawn "${SIM_ID}" notifyutil -p com.apple.BiometricKit.enrollmentChanged || true
        fi
      else
        echo "[e2e] WARNING: Timeout waiting for simulator boot."
      fi
    else
      echo "[e2e] WARNING: No available iOS simulator found."
    fi
  fi
  if [ -z "${SIM_ID}" ]; then
    echo "[e2e] ERROR: No iOS simulator UDID available for RN run."
    exit 1
  fi
else
  echo "[e2e] Skipping simulator boot for Cordova"
  xcrun simctl shutdown booted || true
fi

if [ "${MODE}" = "cordova" ] || [ "${MODE}" = "full" ]; then
  if ! resolve_cordova_sim_target; then
    exit 1
  fi
  echo "[e2e] Using Cordova simulator target: ${CORDOVA_SIM_TARGET}"
fi

run_count=0

if [ "${MODE}" = "rn" ] || [ "${MODE}" = "full" ]; then
  yarn workspace testapp prepare:powerauth
  install_rn_pods

  yarn workspace testapp start:prepared &
  METRO_PID=$!

  open -a Simulator --args -CurrentDeviceUDID "${SIM_ID}" || true
  if ! xcrun simctl bootstatus "${SIM_ID}" -b; then
    echo "[e2e] ERROR: Simulator ${SIM_ID} did not finish booting."
    abort_with_logs
  fi

  RN_DERIVED_DATA_PATH="$(mktemp -d "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/powerauth-rn-ios.XXXXXX")"
  echo "[e2e] Building RN iOS app for simulator ${SIM_ID}..."
  if ! xcodebuild \
    -workspace testapp/ios/testapp.xcworkspace \
    -scheme testapp \
    -configuration Debug \
    -destination "id=${SIM_ID}" \
    -derivedDataPath "${RN_DERIVED_DATA_PATH}" \
    build; then
    echo "[e2e] ERROR: Failed to build the RN iOS app."
    abort_with_logs
  fi

  RN_APP_PATH="${RN_DERIVED_DATA_PATH}/Build/Products/Debug-iphonesimulator/testapp.app"
  if [ ! -d "${RN_APP_PATH}" ]; then
    echo "[e2e] ERROR: RN iOS build did not produce ${RN_APP_PATH}."
    abort_with_logs
  fi

  if ! RN_BUNDLE_ID="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "${RN_APP_PATH}/Info.plist")"; then
    echo "[e2e] ERROR: Failed to read the RN iOS bundle identifier."
    abort_with_logs
  fi

  if ! install_and_launch_rn_app "${RN_APP_PATH}" "${RN_BUNDLE_ID}"; then
    abort_with_logs
  fi

  run_count=$((run_count + 1))
  if ! wait_for_runs "${run_count}" "${LAUNCH_GRACE_TIMEOUT_SEC}" "" "React Native iOS app"; then
    abort_with_logs
  fi
  if ! wait_for_completed "${run_count}"; then
    abort_with_logs
  fi
fi

if [ "${MODE}" = "cordova" ] || [ "${MODE}" = "full" ]; then
  echo "[e2e] Launching Cordova iOS..."
  yarn workspace com.wultra.pwatest freshIos --target="${CORDOVA_SIM_TARGET}" &
  CDV_PID=$!
  run_count=$((run_count + 1))

  if ! wait_for_runs "${run_count}" "${RUN_START_TIMEOUT_SEC}" "${CDV_PID}" "Cordova iOS launcher"; then
    abort_with_logs
  fi
  if ! wait_for_completed "${run_count}"; then
    abort_with_logs
  fi

  kill "${CDV_PID}" || true
fi

set +e
wait "${COLLECTOR_PID}"
COLLECTOR_EXIT=$?
set -e

if [ -n "${METRO_PID:-}" ]; then
  kill "${METRO_PID}" || true
fi

echo "[e2e] iOS simulator log capture disabled (logs can be very large)."
# xcrun simctl spawn booted log show --style syslog --last 10m > artifacts/e2e/ios-simulator.log || true

exit "${COLLECTOR_EXIT}"
