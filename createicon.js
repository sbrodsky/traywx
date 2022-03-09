// create text icon up to 3 characters, for the system tray
// arg0 = 3chars-string
// arg1 = color ex: "#7cfc00"
// example call: node createicon.js "-11" #7cfc00
var args = process.argv.slice(2);
const fs = require('fs')
const path = require('path')
const Canvas = require('canvas')
const canvas = Canvas.createCanvas(400, 400)
const ctx = canvas.getContext('2d')

var myString = args[0];
var myColor = args[1];
ctx.fillStyle = myColor;
if (myString.length == 3) {
  ctx.font = 'normal normal 232px Verdana';
  ctx.fillText(myString, 0, 320)       // 10-99   place at 0,320
} else if (myString.length == 2) {
  ctx.font = 'normal normal 328px Verdana';
  ctx.fillText(myString, 0, 320)       // 10-99   place at 0,320
} else if (myString.length == 1) {
  ctx.font = 'normal normal 328px Verdana';
  ctx.fillText(myString, 90, 320)       // 10-99   place at 0,320
}
canvas.createPNGStream().pipe(fs.createWriteStream(path.join('c:/node/traywx/assets', myString+'.png')));
console.log('created ' + myString + '.png');

//temp = 'E';
//ctx.font = 'normal normal 328px Verdana';
//ctx.fillText(temp, 90, 320)       // 10-99   place at 0,320
//canvas.createPNGStream().pipe(fs.createWriteStream(path.join('c:/node/traywx/assets', temp+'.png')))
//console.log('created ' + temp + '.png');
