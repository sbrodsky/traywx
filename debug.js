// Run nwjs
const childProcess = require("child_process");
const proc = childProcess.exec("nw .");

// Keeps this wrapper process running
let keepAlive;
let quit = false;
function keepAliveCallback() {
  if(!quit) keepAlive = setTimeout(keepAliveCallback, 1000);
}
keepAliveCallback();

// Relay stdout and stderr from process until it exits
proc.stdout.on("data", function(data) {
  process.stdout.write(data);
});
proc.stderr.on("data", function(data) {
  process.stderr.write(data);
});
proc.on("exit", function() {
  quit = true;
});