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

for key in POWERAUTH_CLOUD_URL POWERAUTH_CLOUD_USERNAME POWERAUTH_CLOUD_PASSWORD \
  POWERAUTH_CLOUD_APP_ID ENROLLMENT_SERVER_URL TEST_COLLECTOR_URL; do
  require_env_key "${key}"
done

MODE="${E2E_MODE:-full}"
case "${MODE}" in
  rn|cordova) EXPECTED_RUNS_VALUE=1 ;;
  full) EXPECTED_RUNS_VALUE=2 ;;
  *)
    echo "[e2e] Invalid E2E_MODE '${MODE}'."
    exit 1
    ;;
esac
RUN_START_TIMEOUT_SEC="${E2E_RUN_START_TIMEOUT_SEC:-3600}"
RUN_COMPLETE_TIMEOUT_SEC="${E2E_COMPLETE_TIMEOUT_SEC:-3600}"
SIM_BOOT_TIMEOUT_SEC="${E2E_SIM_BOOT_TIMEOUT_SEC:-900}"
COLLECTOR_TIMEOUT="${E2E_COLLECTOR_TIMEOUT:-90m}"

node packages/mobile-test-runner/dist/cli.js collect --host 127.0.0.1 --port 8137 --out artifacts/e2e --expected-runs "${EXPECTED_RUNS_VALUE}" --timeout "${COLLECTOR_TIMEOUT}" &
COLLECTOR_PID=$!

METRO_PID=""
RN_PID=""
CDV_PID=""

collector_value() {
  node -e "fetch('http://127.0.0.1:8137/health').then(r=>r.json()).then(j=>process.stdout.write(String(j[process.argv[1]] ?? ''))).catch(()=>{})" "$1" 2>/dev/null || true
}

stop_process() {
  pid="$1"
  if [ -n "${pid}" ] && kill -0 "${pid}" 2>/dev/null; then
    kill "${pid}" || true
  fi
}

wait_for_completed() {
  expected="$1"
  start_time="$(date +%s)"
  while true; do
    # This is kinda a hacky way to check if the collector has completed all runs and exit early.
    completed="$(collector_value completed)"
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
  while true; do
    runs="$(collector_value runs)"
    if [ -n "${runs}" ]; then
      if [ "${runs}" -ge "${expected}" ] 2>/dev/null; then
        echo "[e2e] collector runs=${runs}"
        break
      fi
    fi
    now="$(date +%s)"
    if ! kill -0 "${COLLECTOR_PID}" 2>/dev/null; then
      echo "[e2e] ERROR: Collector exited before receiving ${expected} run(s)."
      return 1
    fi
    if [ -n "${launch_pid}" ] && ! kill -0 "${launch_pid}" 2>/dev/null; then
      if wait "${launch_pid}"; then
        launch_pid=""
      else
        launch_exit=$?
        echo "[e2e] ERROR: ${launch_name} failed (exit=${launch_exit})."
        return 1
      fi
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
  echo "[e2e] Aborting E2E run."
  if [ -n "${SIM_ID:-}" ]; then
    echo "[e2e] Capturing iOS simulator logs..."
    xcrun simctl spawn "${SIM_ID}" log show --style compact --last 10m --predicate 'process == "testapp"' > artifacts/e2e/ios-simulator.log 2>&1 || true
  fi
  stop_process "${RN_PID:-}"
  stop_process "${CDV_PID:-}"
  stop_process "${COLLECTOR_PID}"
  if [ -n "${METRO_PID:-}" ]; then
    echo "[e2e] Stopping Metro..."
    stop_process "${METRO_PID}"
  fi
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

  if [ -n "${SIM_ID}" ]; then
    echo "[e2e] Launching RN iOS..."
    yarn workspace testapp ios:prepared --no-packager --udid "${SIM_ID}" &
  else
    echo "[e2e] Launching RN iOS..."
    yarn workspace testapp ios:prepared --no-packager &
  fi

  RN_PID=$!
  run_count=$((run_count + 1))

  if ! wait_for_runs "${run_count}" "${RUN_START_TIMEOUT_SEC}" "${RN_PID}" "RN iOS"; then
    abort_with_logs
  fi
  if ! wait_for_completed "${run_count}"; then
    abort_with_logs
  fi

  stop_process "${RN_PID}"
fi

if [ "${MODE}" = "cordova" ] || [ "${MODE}" = "full" ]; then
  echo "[e2e] Launching Cordova iOS..."
  yarn workspace com.wultra.pwatest freshIos --target="${CORDOVA_SIM_TARGET}" &
  CDV_PID=$!
  run_count=$((run_count + 1))

  if ! wait_for_runs "${run_count}" "${RUN_START_TIMEOUT_SEC}" "${CDV_PID}" "Cordova iOS"; then
    abort_with_logs
  fi
  if ! wait_for_completed "${run_count}"; then
    abort_with_logs
  fi

  stop_process "${CDV_PID}"
fi

set +e
wait "${COLLECTOR_PID}"
COLLECTOR_EXIT=$?
set -e

if [ -n "${METRO_PID:-}" ]; then
  stop_process "${METRO_PID}"
fi

exit "${COLLECTOR_EXIT}"
