// eslint-disable-next-line no-undef
const axios = require('axios');
// eslint-disable-next-line no-undef
const fs = require('fs');
// eslint-disable-next-line no-undef
var xml2js = require('xml2js');
// eslint-disable-next-line no-undef
var Storage = require('node-storage');
//var canvas = require('canvas');
// eslint-disable-next-line no-undef
const { exec } = require("child_process");
const { exit } = require('process');

const dynamic_icon_generation_enabled = 1;
var lastFetchSuccessful = true;
var store = new Storage('assets/node-storage.dat');
var mexicanStatesArray = [];
var provincesArray = [];
var selectedState;
var selectedStationId;
var selectedCountry;
var statesArray = [];
var stationsObjArray = [];
var icon_watcher_enabled = 0;
var parser = new xml2js.Parser();
var tempF;
var tempLimit1;
var tempLimit2;

const colorsArray = ["Aqua", "Bisque", "Black", "Blue", "Cyan", "Green", "Orange", "Purple", "Red", "White", "Yellow", "Violet"];
const countryArray = ["Antarctica", "Canada", "Mexico", "USA"];
const arrayAntarcticaStates = ['South Pole'];
const arrayCanadaStates = ['AB', 'BC', 'NB', 'NU', 'ON', 'QC', 'SK', 'YT'];
const arrayMexicoStates = ['AGS', 'BCN', 'BCS', 'CDZ', 'CHH', 'CHP', 'CMP', 'COL', 'DRN', 'DTD', 'JLS', 'GRR', 'MDO',
  'MEX', 'NLE', 'OAX', 'QRO', 'SIN', 'SLP', 'SON', 'TML', 'VLL', 'YCT', 'ZCT'];
const arrayUsaStates = ['AL', 'AK', 'AZ', 'AR', 'AS', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'GU', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS',
  'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'CM', 'OH', 'OK', 'OR',
  'PA', 'PR', 'RI', 'SC', 'SD', 'TN', 'TX', 'TT', 'UT', 'VT', 'VA', 'VI', 'WA', 'WV', 'WI', 'WY'];

// icon watcher
if (icon_watcher_enabled) {
  const filePath = 'c:\\traywx\\assets\\-11.png';
  fs.watch(filePath, function (eventName, filename) {
    if (filename) {
      tray.icon = filePath;
    }
  });
}

// get existing user selected params from the store or default to KBOS station in USA/MA
if (store.get('selectedStationId')) {
  selectedStationId = store.get('selectedStationId');
  getTemp(store.get('selectedStationId'));
  selectedState = store.get('selectedState');
  color1 = store.get('color1');
  color2 = store.get('color2');
  color3 = store.get('color3');
  selectedCountry = store.get('selectedCountry');
  tempLimit1 = store.get('templimit1');
  tempLimit2 = store.get('templimit2');
} else {
  getTemp('KBOS');
  store.put('selectedCountry', 'USA');
  store.put('selectedState', 'MA');
  store.put('selectedStationId', 'KBOS');
  store.put('color1', 'blue');
  store.put('color2', 'white');
  store.put('color3', 'yellow');
  store.put('templimit1', 32);
  store.put('templimit2', 68);
  tempLimit1 = 32;
  tempLimit2 = 68;
}

// eslint-disable-next-line no-undef
let tray = new nw.Tray({
  title: 'TrayWx',
  tooltip: 'TrayWx is running',
  icon: 'assets/icon.png'
});

// Give it a menu
// eslint-disable-next-line no-undef
let menu = new nw.Menu();
let itemChecked = true;

// Create an array of the items to be placed in the menu
let menuItems = [
  {
    type: 'normal',
    label: 'Fetched at ...'
  },
  {
    type: 'normal',
    label: 'Data Fetched at ...'
  },
  {
    type: 'separator'
  },
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
  //console.log('menu = ' + JSON.stringify(menu));
});

// Iterate menu's items
//for (var i = 0; i < menu.items.length; ++i) {
//  console.log(menu.items[i]);
//}
//menu.items[0].label = 'test';


// Place the menu in the tray
tray.menu = menu;

// show main window and dev tools windows while in development-mode
// eslint-disable-next-line no-undef
nw.Window.get().showDevTools();
// eslint-disable-next-line no-undef
nw.Window.get().show();

// get xml-sourced station listing and put in 'stationsObjArray' sorted array
fs.readFile('assets/stations.xml', function (err, data) {
  parser.parseString(data, function (err, result) {
    stationsObjArray = result['wx_station_index']['station'];
  });
  getManualStations();
  console.log('*** all data loaded main ***');
});

function getManualStations() {
  // get 2nd xml-sourced station listing and put in 'stationsObjArray' sorted array
  fs.readFile('assets/manual_stations.xml', function (err, data) {
    console.log('reading manual-stations.xml');
    parser.parseString(data, function (err, result) {
      let stationsObjArray2 = result['wx_station_index']['station'];
      stationsObjArray.push.apply(stationsObjArray, stationsObjArray2);

      var noErrsFound = 1;
      stationsObjArray.sort((a, b) => {
        if (typeof a.state === 'undefined' && noErrsFound) {
          alert('"state" not defined in assets/manual_stations.xml');
          noErrsFound = 0;
          return 0;
        }
        if (typeof a.station_name === 'undefined' && noErrsFound) {
          alert('"station_name" not defined in assets/manual_stations.xml');
          noErrsFound = 0;
          return 0;
        }

        var fa = a.state[0].toLowerCase() + a.station_name[0].toLowerCase(),
          fb = b.state[0].toLowerCase() + b.station_name[0].toLowerCase();
        if (fa < fb) {
          return -1;
        }
        if (fa > fb) {
          return 1;
        }
        return 0;
      });

      console.log('*** all data loaded ***');
      populateColorSelect('color1');
      populateColorSelect('color2');
      populateColorSelect('color3');
      populateCountrySelect();
      populateStateSelect();
      document.getElementById('templimit1').value = tempLimit1;
      console.log('just set view templimit1 to ' + tempLimit1);
      document.getElementById('templimit2').value = tempLimit2;
    });
  });
}

function getTemp(stationIdObj) {
  let url = `https://api.weather.gov/stations/${stationIdObj}/observations/latest?require_qc=true`;
  // South Pole override 
  if (selectedStationId == 'ASPS') {
    url = 'https://www.usap.gov/components/webcams.cfc?method=outputWeatherDataByStation&cameraLocation=South%20Pole&_=1646448579378';
  }
  // line above this was stationIdObj.value but changed it to stationIdObj instead
  console.log('getTemp() getting ' + url);
  axios.get(url)
    .then(response => {
      if (selectedStationId == 'ASPS') {
        var responseData = response.data;
        let tmp_match = responseData.match(/-*\d+&deg;\sF/);
        tempF = tmp_match.toString().match(/-*\d+/);
      } else {
        menu.items[1].label = 'Data: ' + response.data.properties.timestamp;
        var tempC = response.data.properties.temperature.value;
        tempF = Math.round(tempC * 9 / 5) + 32;
      }

      if (tempF < tempLimit1) {
        doIcon(tempF, color1);
      } else if (tempF > tempLimit2) {
        doIcon(tempF, color3);
      } else {
        doIcon(tempF, color2);
      }
      var moment = require('moment');
      tray.tooltip = tempF + " updated " + moment().format('MMMM Do YYYY, h:mm a');
      menu.items[0].label = "Fetched: " + moment().format('MMMM Do YYYY, h:mm a');

    })
    .catch(function (error) {
      if (error.response) {
        // Request made and server responded
        console.log('error.response.data =' + error.response.data);
        console.log('error.response.status = ' + error.response.status);
        console.log('error.response.headers = ' + error.response.headers);
        tray.tooltip = 'Unable to access most recent weather for this locale';
        // if this is the first failed GET, just use most recent temperature
        // we will have to incorporate the color logic here though!
        if (lastFetchSuccessful) {
          doIcon(tempF, "white");
          lsatFetchSuccessful = false;
        }
      } else if (error.request) {
        // The request was made but no response was received
        tray.tooltip = 'Unable to access weather for this locale';
        console.log('error.request=' + error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.log('Unk Error', error.message);
        tray.tooltip = 'Unable to access weather for this locale';
      }
      tray.icon = "assets/E.png";
    })
}

function doIcon(tempF, foregroundColor) {
  var cmd = `node createicon ${tempF} ${foregroundColor}`;
  console.log('calling ' + cmd);
  exec(cmd, function (error, stdout, stderr) {
    if (error) {
      console.log(error);
      tray.icon = `assets/E.png`;
      tray.tooltip = 'Could not create assets/${tempF}.png';
    }
    if (stderr) {
      console.log(stderr);
      tray.icon = `assets/E.png`;
      tray.tooltip = 'Could not create assets/${tempF}.png';
    }
    tray.icon = `assets/${tempF}.png`;
  })
}

function elementExists(e) { 
  if(typeof(document.getElementById(e)) != 'undefined' && document.getElementById(e) != null) {
    alert('Element exists!');
  } else{
    alert('Element does not exist!');
  }
}

function populateCountrySelect() {
  var ele = document.getElementById('selectCountry');
  for (const country of countryArray) {
    ele.innerHTML = ele.innerHTML +
      '<option ' + selected(selectedCountry, country) + ' value="' + country + '">' + country + '</option>';
  }
}

// populateColorSelect.
// parm selectlist is used 2 ways: 1. pointer to html select and 2. to reference one of 3 color vars
// and its not working
function populateColorSelect(selectList) {
  var ele = document.getElementById(selectList);
  for (const color of colorsArray) {
    if (selectList === 'color1') {
      ele.innerHTML = ele.innerHTML +
        '<option ' + selected(color1, color) + ' value="' + color + '">' + color + '</option>';
    } else if (selectList === 'color2') {
      ele.innerHTML = ele.innerHTML +
        '<option ' + selected(color2, color) + ' value="' + color + '">' + color + '</option>';
    } else {
      ele.innerHTML = ele.innerHTML +
        '<option ' + selected(color3, color) + ' value="' + color + '">' + color + '</option>';
    }
  }
}

//???
function populateStateArray() {
  console.log('populate state array');
  for (const station of stationObjArray) {
    if (!statesArray.includes(station.state[0])) {
      statesArray.push(station.state[0]);
    }
  }
}

function populateStateSelect() {
  var selectedCountry = document.getElementById('selectCountry').value;
  var ele = document.getElementById('selectstateprovinceregion');
  ele.innerHTML = '';
  // set ary to point to the hardcdoded arrays of states per country
  var ary;
  if (selectedCountry == 'Antarctica') {
    ary = arrayAntarcticaStates;
  } else if (selectedCountry == 'Canada') {
    ary = arrayCanadaStates;
  } else if (selectedCountry == 'Mexico') {
    ary = arrayMexicoStates;
  } else {
    ary = arrayUsaStates;
  }

  for (const state of ary) {
    ele.innerHTML = ele.innerHTML +
      '<option ' + selected(selectedState, state) + ' value="' + state + '">' + state + '</option>';
  }
}

function populateStationSelect() {
  var selectedState = document.getElementById('selectstateprovinceregion').value;
  var ele = document.getElementById('selectStation');

  ele.innerHTML = '';
  for (const station of stationsObjArray) {
    var station_id = station.station_id[0];
    var station_name = station.station_name[0];
    var station_state = station.state[0];
    if (station_state === selectedState) {
      ele.innerHTML = ele.innerHTML +
        '<option ' + selected(selectedStationId, station_id) + ' value="' + station_id + '">' + station_state + ' - ' + station_name + '</option>';
    }
  }

  // determine what is selected
  selectedStationId = document.getElementById('selectStation').value;

  store.put('selectedStationId', selectedStationId);
  // we dont want to call gettemp if the user hasn't selected a station yet.
  // for antarctica, there is only one station, 
  getTemp(selectedStationId);
}

function selected(s1, s2) {
  //console.log('selected() ' + s1 + ' vs. ' + s2);
  if (s1 == s2) {
    return 'selected';
  } else {
    return '';
  }
}

// hide tray window
//var win = nw.Window.get();
//win.hide();
//win.on('minimize', function () {
//    win.hide();
//})

// get Temperature every 30 min via timer
async function intervalFunc() {
  getTemp(selectedStationId);
}
setInterval(intervalFunc, 1000 * 60 * 30);

// Remove tray icon on shutdown
window.onunload = () => {
  tray.remove();
  tray = null;
};

window.onload = () => {
  updateTemperatureRange();
}

function temperatureLimitsChange(ele) {
  var id = ele.id;
  var limit = ele.value;
  console.group();
  console.log('temperatureLimitsChange()');
  validateTemperature(limit);
  store.put(id, limit);
  if (id === 'templimit1') {
    tempLimit1 = limit;
  } else {
    tempLimit2 = limit;
  }
  updateTemperatureRange();
  console.groupEnd();
}

function updateTemperatureRange() {
    console.log("utr:tempLimit1 = " + tempLimit1);
    console.log("utr:tempLimit2 = " + tempLimit2);
    elementExists('templimit1upper');
    document.getElementById('templimit1upper').innerHTML = (parseInt(tempLimit1) + 1).toString();
    document.getElementById('templimit2lower').innerHTML = (parseInt(tempLimit2) - 1).toString();
}

function validateTemperature(x) {
  var numericExpression = /^\-*[0-9]+$/;
  //if (x.value.match(numbericExpression)) {
  if (/^\-*[0-9]*$/.test(x)) {
    return true;
  } else {
    alert('Please enter a numeric value');
    return false;
  }
}

function colorOnChange(selectObject) {
  var color = selectObject.value;
  store.put(selectObject.id, color);
  doIcon(tempF, color);
}

// eslint-disable-next-line
function uiCountryOnChange() {
  var e = document.getElementById('selectCountry');
  var selectedCountry = e.options[e.selectedIndex].value;
  store.put('selectedCountry', selectedCountry);
  populateStateSelect();
  populateStationSelect();
}

// eslint-disable-next-line
function uiStateOnChange() {
  var e = document.getElementById('selectstateprovinceregion');
  var selectedState = e.options[e.selectedIndex].value;
  store.put('selectedState', selectedState);
  populateStationSelect(selectedState);
}

function uiStationChange(selectObject) {
  var stationId = selectObject.value;
  store.put('selectedStationId', stationId);
  selectedStationId = stationId;
  getTemp(stationId);
}


