// using imagemagick, create icons from text strings of numbers
// ex: -45 (negative 45 degrees F) to 135 degrees F
const util = require('util');
const exec = util.promisify(require('child_process').exec);

async function runCommand(command) {
  const { stdout, stderr, error } = await exec(command);
  if(stderr){console.error('stderr:', stderr);}
  if(error){console.error('error:', error);}
  return stdout;
}


async function myFunction (i) {
    const command = 'printf "'+i+'"|convert -font Arial -pointsize 12 label:@- '+i+'.png';
    const result = await runCommand(command);
    console.log("_result", result);
    // your code here processing the result ...
}

// just calling myFunction() here so it runs when the file is loaded
for(var i=-46; i<135; i++) { 
  myFunction(i);
}
myFunction('E');

