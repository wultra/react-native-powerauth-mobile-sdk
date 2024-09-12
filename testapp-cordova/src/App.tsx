//
// Copyright 2024 Wultra s.r.o.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

// @ts-nocheck

import { TestExecutor } from './TestExecutor'

document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    
  // Cordova is now initialized. Have fun!

  // enable debug
  PowerAuthDebug.isEnabled = true;

  const statusEl = document.getElementById('tests-status');
  const progressEl = document.getElementById('tests-progress');
  const messageEl = document.getElementById("test-message");

  console.log('Running cordova-' + cordova.platformId + '@' + cordova.version);
  document.getElementById('deviceready').classList.add('ready');

  const executor = new TestExecutor(async (_context, message, duration) => {
    messageEl.innerHTML = message;
    await new Promise<void>(resolve => setTimeout(resolve, duration)) 
  }, (progress) => {
    progressEl.innerHTML = `<span style="color: green;">${progress.succeeded} succeeded</span><br><span style="color: red;">${progress.failed} failed</span><br><span style="color: orange;">${progress.skipped} skipped</span><br>out of total  ${progress.total}`;;
  }, (finished) => {
    statusEl.innerHTML = finished ? "Tests running" : "Tests finished";
    messageEl.innerHTML = "";
  })

  document.getElementById('tests-simple').addEventListener('click', (e) => {
    executor.runTests(false)
  })
  document.getElementById('tests-full').addEventListener('click', (e) => {
    executor.runTests(true)
  })
  document.getElementById('tests-stop').addEventListener('click', (e) => {
    executor.cancelTests()
  })
}