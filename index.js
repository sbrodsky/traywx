// eslint-disable-next-line no-undef
const axios = require('axios');
// eslint-disable-next-line no-undef
const fs = require('fs');
// eslint-disable-next-line no-undef
var xml2js = require('xml2js');
// eslint-disable-next-line no-undef
var Storage = require('node-storage');
//var canvas = require('canvas');
const { exec } = require("child_process");

const dynamic_icon_generation_enabled = 1;
var store = new Storage('assets/node-storage.dat');
var mexicanStatesArray = [];
var provincesArray = [];
var statesArray = [];
var stationsObjArray = [];
var stationIdObj;
var icon_watcher_enabled = 0;
var parser = new xml2js.Parser();

// eslint-disable-next-line
function countryChanged(e) {
  //var ele = document.getElementById('selectCountry');
  console.log('Selected country is ' + e.options[e.selectedIndex].text + ' and ' + e.options[e.selectedIndex].value);
  var selectedCountry = e.options[e.selectedIndex].value;
}

// icon watcher
if (icon_watcher_enabled) {
const filePath = 'c:\\node\\traywx\\assets\\-11.png';
const file = fs.readFileSync(filePath);
fs.watch(filePath, function(eventName, filename) {
  if(filename) {
    console.log('Event : ' + eventName);
    console.log(filename + ' file Changed, changing tray icon');
    tray.icon = filePath;
  }
  else{
    console.log('filename not provided or check file access permissions')
  }
});
}

// get existing stationId if saved
if (store.get('stationId')) {
  getTemp(store.get('stationId'));
  console.log('stationId retrieved from storage => ' + store.get('stationId'));
} else {
  console.log('stationId not found in storage');
  //store.put('stationId','world');
}

// Create a tray icon
// eslint-disable-next-line no-undef
let tray = new nw.Tray({
  title: 'Tray',
  tooltip: 'Tray App is running',
  icon: 'assets/icon.png'
});

// Give it a menu
// eslint-disable-next-line no-undef
let menu = new nw.Menu();
let itemChecked = true;

// Create an array of the items to be placed in the menu
let menuItems = [
  {
    type: 'checkbox',
    label: 'Checkbox',
    checked: itemChecked,
    click: function () {
      itemChecked = !itemChecked;
      console.log(itemChecked);
    }
  },
  {
    type: 'normal',
    label: 'Open Dev Tools',
    click: function () {
      // eslint-disable-next-line no-undef
      nw.Window.get().showDevTools();
    }
  },
  {
    type: 'normal',
    label: 'Show Window',
    click: function () {
      // eslint-disable-next-line no-undef
      nw.Window.get().show();
    }
  },
  {
    type: 'normal',
    label: 'Hide Window',
    click: function () {
      // eslint-disable-next-line no-undef
      nw.Window.get().hide();
    }
  },
  {
    type: 'separator'
  },
  {
    type: 'normal',
    label: 'Exit',
    click: function () {
      // eslint-disable-next-line no-undef
      nw.Window.get().close();
    }
  }
];

// Append all menu items to the menu
menuItems.forEach(function (item) {
  // eslint-disable-next-line no-undef
  menu.append(new nw.MenuItem(item));
});

// Place the menu in the tray
tray.menu = menu;

// show main window and dev tools windows while in development-mode
// eslint-disable-next-line no-undef
nw.Window.get().showDevTools();
// eslint-disable-next-line no-undef
nw.Window.get().show();

// get xml-sourced station listing one-time and put in 'stationsObjArray' array
fs.readFile('assets/stations.xml', function(err, data) {
  parser.parseString(data, function (err, result) {

    // wx_station_index is the root node of stations:
    // <station>
    //   <station_id>CWAV</station_id>
    //   <state>AB</state>
    //   <station_name>Sundre</station_name>
    stationsObjArray = result['wx_station_index']['station'];
    // NLE = Neuvo Leon, MX
    // MDO = Morelia New, MX

    stationsObjArray.sort((a, b) => {
      let fa = a.state[0].toLowerCase() + a.station_name[0].toLowerCase(),
          fb = b.state[0].toLowerCase() + b.station_name[0].toLowerCase();
  
      if (fa < fb) {
          return -1;
      }
      if (fa > fb) {
          return 1;
      }
      return 0;
    });
    
    populateRegionArrays();
    populateStateSelect();
    populateProvinceSelect();
  });
});


function populateRegionArrays() {
  console.log("populateRegionArrays");
  for (const station of stationsObjArray) {
    if (['AB','BC','NB','NU','ON','QC','SK','YT'].includes(station.state[0])) {
      //console.log('Canada:' + station.state[0]);
      if (!provincesArray.includes(station.state[0])) {
        provincesArray.push(station.state[0]);
      }
    } else if (['AGS','BCN','BCS','CDZ','CHH','CHP','CMP','COL','DRN','DTD','JLS','GRR','MDO',
       'MEX','NLE','OAX','QRO','SIN','SLP','SON','TML','VLL','YCT','ZCT'].includes(station.state[0])) {
      //console.log('Mexico:' + station.state[0]);
      if (!mexicanStatesArray.includes(station.state[0])) {
        mexicanStatesArray.push(station.state[0]);
      }
    } else {
      //console.log('US' + station.state[0]);
      if (!statesArray.includes(station.state[0])) {
        statesArray.push(station.state[0]);
      }
    }
  }
}

function populateProvinceSelect() {
  var ele = document.getElementById('selectProvinceFromXML');
  for (const province of provincesArray) {
    ele.innerHTML = ele.innerHTML +
      '<option value="' + province + '">' + province + '</option>';
  } 
}

function populateStateSelect() {
  var ele = document.getElementById('selectStateFromXML');
  for (const state of statesArray) {
    ele.innerHTML = ele.innerHTML +
      '<option value="' + state + '">' + state + '</option>';
  } 
}

// hide tray window
//var win = nw.Window.get();
//win.hide();
//win.on('minimize', function () {
//    win.hide();
//})


// get Temperature every 30 min
// note: 1000ms = 1 sec, * 60 makes it one min, * 30 makes it 30 min
async function intervalFunc() {
  console.log('intervalfn calling getTemp with param ' + stationIdObj);
  getTemp(stationIdObj);
  //console.log('intervalFunc');
  //var tempC = await getTemp();
  //console.log('tempC=' + tempC);
  //var tempF = Math.round(tempC * 9/5) + 32;
  //console.log ('tempF=' + tempF); 
  //    tray.icon = "assets/" + tempF + ".png" 
  //    var moment = require('moment');
  //    tray.tooltip = "updated " + moment().format('MMMM Do YYYY, h:mm a');
  //    console.log(tray.tooltip);
}
setInterval(intervalFunc,1000*60*30);


// Remove tray icon on page leave
window.onunload = () => {
  tray.remove();
  tray = null;
};

function getTemp(stationIdObj) {
  console.log('in getTemp, stationIdObj = ' + stationIdObj);
  let url = `https://api.weather.gov/stations/${stationIdObj}/observations/latest?require_qc=true`;
  // line above this was stationIdObj.value but changed it to stationIdObj instead
  console.log(url);
  axios.get(url) 
  .then(response => { 
    console.log('response.title = ' + response.title);
      var tempC = response.data.properties.temperature.value;
      var tempF = Math.round(tempC * 9/5) + 32;
      console.log ('tempF=' + tempF); 
      tray.icon = "assets/" + tempF + ".png";
      
      // causes NW not to launch, prob cuz module is a native one
      if (dynamic_icon_generation_enabled) {
        tray.icon = "assets/icon.png";
        var color = '#7cfc00';
        color = '#ffffff';
        var cmd = `node createicon ${tempF} ${color}`;
        console.log('calling ' + cmd);
        exec(cmd, function(error, stdout, stderr) {
          if (error) {
            console.log(error);
              return;
          }
          if (stderr) {
            console.log(stderr);
              return;
          }
        })
      }
      tray.icon = "assets/" + tempF + ".png";
      var moment = require('moment');
      tray.tooltip = tempF + " updated " + moment().format('MMMM Do YYYY, h:mm a');
      console.log(tray.tooltip);
    })
  .catch(function (error) {
      if (error.response) {
        // Request made and server responded
        console.log('error.response.data =' + error.response.data);
        console.log('error.response.status = ' + error.response.status);
        console.log('error.response.headers = ' + error.response.headers);
        tray.tooltip = 'Unable to access weather for this locale';
        tray.icon = "assets/E.png";
      } else if (error.request) {
        // The request was made but no response was received
        tray.tooltip = 'Unable to access weather for this locale';
        console.log('error.request=' + error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.log('Unk Error', error.message);
        tray.tooltip = 'Unable to access weather for this locale';
      }
    })
}


// based on user selection, populate station select
function populateStationSelect(s) {
  console.log('populateStationSelectFromStationsXML()');
  //var s = document.getElementById('selectStateFromXML');
  console.log('Selected state is ' + s.options[s.selectedIndex].text + ' and ' + s.options[s.selectedIndex].value);
  var selectedStateAbbrev = s.options[s.selectedIndex].value;

  var ele = document.getElementById('selectStationFromXML');
  ele.innerHTML = '';

  for (const station of stationsObjArray) {
      var station_id = station.station_id[0];
      var state = station.state[0];
      var station_name = station.station_name[0];
      //console.log(state + '\t' + station_name + '\t' + station_id);
      if (state === selectedStateAbbrev) {
          ele.innerHTML = ele.innerHTML +
          '<option value="' + station_id + '">' + state + ' - ' + station_name + '</option>';
      }
  }
}

function stationChange(selectObject) {
  var station = selectObject.value;
  console.log(station);
  store.put('stationId',station);
  console.log('calling getTemp(' + station + ')');
  getTemp(station);
}


