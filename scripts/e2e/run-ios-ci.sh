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
require_env_key "SDK_CONFIG"
require_env_key "TEST_COLLECTOR_URL"

node packages/mobile-test-runner/dist/cli.js collect --host 127.0.0.1 --port 8137 --out artifacts/e2e --expected-runs "${EXPECTED_RUNS}" --timeout 45m &
COLLECTOR_PID=$!

yarn workspace testapp start --reset-cache &
METRO_PID=$!

wait_for_completed() {
  expected="$1"
  start_time="$(date +%s)"
  while true; do
    completed="$(node -e "fetch('http://127.0.0.1:8137/health').then(r=>r.json()).then(j=>process.stdout.write(String(j.completed ?? ''))).catch(()=>{})" 2>/dev/null || true)"
    if [ -n "${completed}" ]; then
      if [ "${completed}" -ge "${expected}" ] 2>/dev/null; then
        echo "[e2e] collector completed runs=${completed}"
        break
      fi
    fi
    now="$(date +%s)"
    if [ "$((now - start_time))" -gt 2700 ]; then
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
  start_time="$(date +%s)"
  while true; do
    runs="$(node -e "fetch('http://127.0.0.1:8137/health').then(r=>r.json()).then(j=>process.stdout.write(String(j.runs ?? ''))).catch(()=>{})" 2>/dev/null || true)"
    if [ -n "${runs}" ]; then
      if [ "${runs}" -ge "${expected}" ] 2>/dev/null; then
        echo "[e2e] collector runs=${runs}"
        break
      fi
    fi
    now="$(date +%s)"
    if [ "$((now - start_time))" -gt "${timeout_sec}" ]; then
      echo "[e2e] WARNING: Timeout waiting for collector runs >= ${expected}"
      return 1
    fi
    sleep 10
  done
  return 0
}

abort_with_logs() {
  echo "[e2e] Aborting due to missing collector completion."
  kill "${COLLECTOR_PID}" || true
  echo "[e2e] Stopping Metro..."
  kill "${METRO_PID}" || true
  xcrun simctl spawn booted log show --style syslog --last 10m > artifacts/e2e/ios-simulator.log || true
  exit 1
}

xcrun simctl list devices available
SIM_ID="$(xcrun simctl list devices available | grep 'iPhone' | head -n 1 | grep -oE '[A-F0-9-]{36}' || true)"
if [ -n "${SIM_ID}" ]; then
  echo "[e2e] Booting iOS simulator id=${SIM_ID}"
  open -a Simulator || true
  xcrun simctl boot "${SIM_ID}" || true
  xcrun simctl bootstatus "${SIM_ID}" -b || true
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
  echo "[e2e] WARNING: No available iPhone simulator found."
fi

# React Native (iOS)
if [ -n "${SIM_ID}" ]; then
  yarn workspace testapp ios -- --no-packager --udid "${SIM_ID}" || true
else
  yarn workspace testapp ios -- --no-packager || true
fi
if ! wait_for_runs 1 300; then
  abort_with_logs
fi
if ! wait_for_completed 1; then
  abort_with_logs
fi

# Cordova (iOS)
yarn workspace com.wultra.pwatest freshIos || true
if ! wait_for_runs 2 300; then
  abort_with_logs
fi
if ! wait_for_completed 2; then
  abort_with_logs
fi

set +e
wait "${COLLECTOR_PID}"
COLLECTOR_EXIT=$?
set -e

kill "${METRO_PID}" || true

xcrun simctl spawn booted log show --style syslog --last 10m > artifacts/e2e/ios-simulator.log || true

exit "${COLLECTOR_EXIT}"
