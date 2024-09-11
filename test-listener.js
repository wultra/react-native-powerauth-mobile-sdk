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

// ####################
// #### Test listener is a node.js script that is running a HTTP server that recieves data from test application.
// #### Based on the data, it can either exit with success or error to give a hint that test ended up as a success or a failure.
// ####################

const http = require('http');
const { exit } = require('process');

const port = 8083
const maxDurationSeconds = 240 // Test aer usually taking 60-90 seconds

console.log(`Starting test listener @ localhost:${port}`)
console.log(`If the tests won't finish in ${maxDurationSeconds} seconds, this script will exit with the error exit code.`)

// Fail-safe in case the test won't finish so we don't wait indefinitely
setTimeout(() => {
    console.log(`Tick tock, time for tests run out (${maxDurationSeconds} seconds). Exiting with the error code.`);
    exit(1);
}, maxDurationSeconds * 1000);

http.createServer(function (req, res) {

    // the app is sending the status report in the `reportStatus` endpoint.
    const isStatusReport = req.url.endsWith("reportStatus");
    
    let body = '';
    req.on('data', (chunk) => {
        body += chunk;
    });
    req.on('end', () => {

        console.log(body); // print whatever came from the server

        if (isStatusReport) {
            const report = JSON.parse(body);
            if (report.total == report.progress) { // all tests finished
                if (report.failed == 0) {
                    console.log("Tests went OK - exiting with the success code.")
                    exit(0)
                } else {
                    console.log("Some tests failed - exiting with the error code.")
                    exit(1)
                }
            }
        }

        res.write('OK'); 
        res.end(); 
    });
  }).listen(port);
