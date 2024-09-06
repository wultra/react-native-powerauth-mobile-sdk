const http = require('http');
const { exit } = require('process');

const port = 8083
const maxDurationSeconds = 150

console.log(`Starting test listener @ localhost ${port}`)
console.log(`If the test wont finish in ${maxDurationSeconds} seconds, this script will exit with error exit code`)

setTimeout(() => {
    console.log("Tick time, time for test run out, exiting with 1");
    exit(1);
}, maxDurationSeconds * 1000);

http.createServer(function (req, res) {

    const isStatusReport = req.url.endsWith("reportStatus");
    
    let body = '';
    req.on('data', (chunk) => {
        body += chunk;
    });
    req.on('end', () => {
        console.log(body);

        if (isStatusReport) {
            const report = JSON.parse(body);
            if (report.total == report.progress) { // all tests finished
                if (report.failed == 0) {
                    console.log("Finished with success - exit")
                    exit(0)
                } else {
                    console.log("Finished with success - error exit")
                    exit(1)
                }
            }
        }

        res.write('OK'); 
        res.end(); 
    });
  }).listen(port);