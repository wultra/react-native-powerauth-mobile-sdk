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
      break
    fi
    sleep 10
  done
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
wait_for_completed 1

# Cordova (iOS)
yarn workspace com.wultra.pwatest freshIos || true
wait_for_completed 2

set +e
wait "${COLLECTOR_PID}"
COLLECTOR_EXIT=$?
set -e

kill "${METRO_PID}" || true

xcrun simctl spawn booted log show --style syslog --last 10m > artifacts/e2e/ios-simulator.log || true

exit "${COLLECTOR_EXIT}"
