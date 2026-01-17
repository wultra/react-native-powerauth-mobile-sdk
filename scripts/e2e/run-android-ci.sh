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
RUN_START_TIMEOUT_SEC="${E2E_RUN_START_TIMEOUT_SEC:-1200}"
RUN_COMPLETE_TIMEOUT_SEC="${E2E_COMPLETE_TIMEOUT_SEC:-1200}"
COLLECTOR_TIMEOUT="${E2E_COLLECTOR_TIMEOUT:-45m}"

node packages/mobile-test-runner/dist/cli.js collect --host 127.0.0.1 --port 8137 --out artifacts/e2e --expected-runs "${EXPECTED_RUNS_VALUE}" --timeout "${COLLECTOR_TIMEOUT}" &
COLLECTOR_PID=$!

METRO_PID=""
RN_PID=""
CDV_PID=""

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
  if [ -n "${RN_PID:-}" ]; then
    kill "${RN_PID}" || true
  fi
  if [ -n "${CDV_PID:-}" ]; then
    kill "${CDV_PID}" || true
  fi
  kill "${COLLECTOR_PID}" || true
  if [ -n "${METRO_PID:-}" ]; then
    echo "[e2e] Stopping Metro..."
    kill "${METRO_PID}" || true
  fi
  # echo "[e2e] Capturing Android logcat..."
  # timeout 60s adb logcat -d > artifacts/e2e/android-logcat.txt || true
  exit 1
}

run_count=0

if [ "${MODE}" = "rn" ] || [ "${MODE}" = "full" ]; then
  yarn workspace testapp start &
  METRO_PID=$!
  echo "[e2e] Launching RN Android..."
  yarn workspace testapp android -- --no-packager &
  RN_PID=$!
  run_count=$((run_count + 1))
  if ! wait_for_runs "${run_count}" "${RUN_START_TIMEOUT_SEC}"; then
    abort_with_logs
  fi
  if ! wait_for_completed "${run_count}"; then
    abort_with_logs
  fi
  kill "${RN_PID}" || true
fi

if [ "${MODE}" = "cordova" ] || [ "${MODE}" = "full" ]; then
  echo "[e2e] Launching Cordova Android..."
  yarn workspace com.wultra.pwatest freshAndroid &
  CDV_PID=$!
  run_count=$((run_count + 1))
  if ! wait_for_runs "${run_count}" "${RUN_START_TIMEOUT_SEC}"; then
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
  echo "[e2e] Stopping Metro..."
  kill "${METRO_PID}" || true
fi

echo "[e2e] Android logcat capture disabled (logs can be very large)."
# timeout 60s adb logcat -d > artifacts/e2e/android-logcat.txt || true
echo "[e2e] Android E2E script finished (collector exit=${COLLECTOR_EXIT})."

exit "${COLLECTOR_EXIT}"
