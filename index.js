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
const antarctica = ['South Pole'];
const canada = ['AB', 'BC', 'NB', 'NU', 'ON', 'QC', 'SK', 'YT'];
const countryArray = ["Antarctica", "Canada", "Mexico", "USA"];
const mexico = ['AGS', 'BCN', 'BCS', 'CDZ', 'CHH', 'CHP', 'CMP', 'COL', 'DRN', 'DTD', 'JLS', 'GRR', 'MDO',
  'MEX', 'NLE', 'OAX', 'QRO', 'SIN', 'SLP', 'SON', 'TML', 'VLL', 'YCT', 'ZCT'];
const usa = ['AL', 'AK', 'AZ', 'AR', 'AS', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'GU', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS',
  'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'CM', 'OH', 'OK', 'OR',
  'PA', 'PR', 'RI', 'SC', 'SD', 'TN', 'TX', 'TT', 'UT', 'VT', 'VA', 'VI', 'WA', 'WV', 'WI', 'WY'];

// icon watcher
if (icon_watcher_enabled) {
  const filePath = 'c:\\traywx\\assets\\-11.png';
  fs.watch(filePath, function (eventName, filename) {
    if (filename) {
      console.log('Event : ' + eventName);
      console.log(filename + ' file Changed, changing tray icon');
      tray.icon = filePath;
    }
    else {
      console.log('filename not provided or check file access permissions')
    }
  });
}

// get existing user selected params from the store
if (store.get('selectedStationId')) {
  selectedStationId = store.get('selectedStationId');
  getTemp(store.get('selectedStationId'));
  selectedState = store.get('selectedState');
  selectedCountry = store.get('selectedCountry');
  console.log('Saved settings: ' + selectedCountry + ',' + selectedState + ',' + selectedStationId);
  //now populate state select based on whatever the user's country is...
  // probably can't do that yet unless the data has been loaded.
} else {
  getTemp('KBOS');
  console.log('stationId not found in storage, create default settings for USA,Boston,KBOS');
  store.put('selectedCountry', 'USA');
  store.put('selectedState', 'MA');
  store.put('selectedStationId', 'KBOS');
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
  console.log('menu = ' + JSON.stringify(menu));
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
  console.log('reading stations.xml');
  parser.parseString(data, function (err, result) {
    console.log('assign to array');
    stationsObjArray = result['wx_station_index']['station'];
    console.log('len is ' + stationsObjArray.length);
    //getManualStations();
  });
  getManualStations();
  console.log('*** all data loaded main ***');
  // hmm the call to getManualStations() is asynch so the data sort doesn't have time to finish before selects pouplated
  //populateCountrySelect();
  //populateStateSelect();
  //populateStationSelect();
});

function getManualStations() {
  // get 2nd xml-sourced station listing and put in 'stationsObjArray' sorted array
  fs.readFile('assets/manual_stations.xml', function (err, data) {
    console.log('reading manual-stations.xml');
    parser.parseString(data, function (err, result) {
      let stationsObjArray2 = result['wx_station_index']['station'];
      console.log('manual stations len is ' + stationsObjArray.length);
      stationsObjArray.push.apply(stationsObjArray, stationsObjArray2);
      console.log('after push len = ' + stationsObjArray.length);

      console.log('start sort');
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
      console.log('end sort');

      console.log('*** all data loaded ***');
      populateCountrySelect();
      populateStateSelect();
      populateStationSelect();
    });
  });
}
function getTemp(stationIdObj) {
  console.log('in getTemp, stationIdObj = ' + stationIdObj);
  let url = `https://api.weather.gov/stations/${stationIdObj}/observations/latest?require_qc=true`;
  // South Pole override 
  if (selectedStationId == 'ASPS') {
    url = 'https://www.usap.gov/components/webcams.cfc?method=outputWeatherDataByStation&cameraLocation=South%20Pole&_=1646448579378';
  }
  // line above this was stationIdObj.value but changed it to stationIdObj instead
  console.log(url);
  axios.get(url)
    .then(response => {
      var tempF;
      if (selectedStationId == 'ASPS') {
        var responseData = response.data;
        let tmp_match = responseData.match(/-*\d+&deg;\sF/);
        tempF = tmp_match.toString().match(/-*\d+/);
      } else {
        menu.items[1].label = 'Data: ' + response.data.properties.timestamp;
        var tempC = response.data.properties.temperature.value;
        tempF = Math.round(tempC * 9 / 5) + 32;
      }

      doIcon(tempF);
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
        tray.tooltip = 'Unable to access weather for this locale';
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

function doIcon(tempF) {
  console.log('doIcon: tempF = ' + tempF);
  if (fs.existsSync(`assets/${tempF}.png`)) {
    console.log(`assets/${tempF} exists`);
    tray.icon = `assets/${tempF}.png`;
  } else {
    if (dynamic_icon_generation_enabled) {
      tray.icon = "assets/icon.png";
      var color = '#7cfc00';
      color = '#ffffff';
      var cmd = `node createicon ${tempF} ${color}`;
      console.log('calling ' + cmd);
      // on mon 3/21, my 48.png icon did not get created and the tray.icon didnot get set to E.png!
      exec(cmd, function (error, stdout, stderr) {
        if (error) {
          console.log(error);
          tray.icon = `assets/E.png`;
          tray.tooltip = 'Could not create assets/${tempF}.png';
          return;
        }
        if (stderr) {
          console.log(stderr);
          tray.icon = `assets/E.png`;
          tray.tooltip = 'Could not create assets/${tempF}.png';
          return;
        }
        tray.icon = `assets/${tempF}.png`;
      })
    }
  }
}

function populateCountrySelect() {
  var ele = document.getElementById('selectCountry');
  for (const country of countryArray) {
    ele.innerHTML = ele.innerHTML +
      '<option ' + selected(selectedCountry, country) + ' value="' + country + '">' + country + '</option>';
  }
}

// old
function populateRegionArrays() {
  console.log("populateRegionArrays");
  for (const station of stationsObjArray) {
    if (['AB', 'BC', 'NB', 'NU', 'ON', 'QC', 'SK', 'YT'].includes(station.state[0])) {
      //console.log('Canada:' + station.state[0]);
      if (!provincesArray.includes(station.state[0])) {
        provincesArray.push(station.state[0]);
      }
    } else if (['AGS', 'BCN', 'BCS', 'CDZ', 'CHH', 'CHP', 'CMP', 'COL', 'DRN', 'DTD', 'JLS', 'GRR', 'MDO',
      'MEX', 'NLE', 'OAX', 'QRO', 'SIN', 'SLP', 'SON', 'TML', 'VLL', 'YCT', 'ZCT'].includes(station.state[0])) {
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
  console.log('populateStateSelect():selected country = ' + selectedCountry);
  var ele = document.getElementById('selectstateprovinceregion');
  ele.innerHTML = '';
  // set ary to point to the hardcdoded arrays of states per country
  var ary;
  if (selectedCountry == 'Antarctica') {
    ary = antarctica;
  } else if (selectedCountry == 'Canada') {
    console.log('user selected country is Canada');
    console.log('canada const array is ' + canada);
    ary = canada;
  } else if (selectedCountry == 'Mexico') {
    ary = mexico;
  } else {
    ary = usa;
  }

  for (const state of ary) {
    ele.innerHTML = ele.innerHTML +
      '<option ' + selected(selectedState, state) + ' value="' + state + '">' + state + '</option>';
  }
}

function populateStationSelect() {
  console.log('in populateStationSelect()');
  console.log('selectedStationId = ' + selectedStationId);
  var selectedState = document.getElementById('selectstateprovinceregion').value;
  console.log('pss:selectedState = ' + selectedState);
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
  console.log('pss:selectedStationId = ' + selectedStationId);

  store.put('selectedStationId', selectedStationId);
  console.log('selectedStationId()... calling getTemp(' + selectedStationId + ')');
  // we dont want to call gettemp if the user hasn't selected a station yet.
  // for antarctica, there is only one station, 
  getTemp(selectedStationId);
  console.log('after call to gettemp, selectedStationId is ' + selectedStationId);
}

function selected(s1, s2) {
  //console.log('selected ' + s1 + ' vs. ' + s2);
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


// get Temperature every 30 min
// note: 1000ms = 1 sec, * 60 makes it one min, * 30 makes it 30 min
async function intervalFunc() {
  getTemp(selectedStationId);
}
setInterval(intervalFunc, 1000 * 60 * 30);


// Remove tray icon on page leave
window.onunload = () => {
  tray.remove();
  tray = null;
};

// eslint-disable-next-line
function uiCountryOnChange() {
  var e = document.getElementById('selectCountry');
  console.log('Selected country is, text = ' + e.options[e.selectedIndex].text + ' / val = ' + e.options[e.selectedIndex].value);
  var selectedCountry = e.options[e.selectedIndex].value;
  store.put('selectedCountry', selectedCountry);
  console.log('uiCountryChange() calling populateStateSelect()');
  populateStateSelect();
  populateStationSelect();
  //if (selectedCountry == 'Antarctica') {
  //  document.getElementById("state").style.visibility = "hidden";
  //  document.getElementById("province").style.visibility = "hidden";
  //}
}

// eslint-disable-next-line
function uiStateOnChange() {
  var e = document.getElementById('selectstateprovinceregion');
  console.log('usoc:Selected state is, text = ' + e.options[e.selectedIndex].text + ' / val = ' + e.options[e.selectedIndex].value);
  var selectedState = e.options[e.selectedIndex].value;
  console.log('usoc:selectedState is now ' + selectedState);
  store.put('selectedState', selectedState);
  console.log('usoc:calling popultatestationselect with a parm of -> ' + selectedState);
  populateStationSelect(selectedState);
  //if (selectedCountry == 'Antarctica') {
  //  document.getElementById("state").style.visibility = "hidden";
  //  document.getElementById("province").style.visibility = "hidden";
  //}
}

function uiStationChange(selectObject) {
  var stationId = selectObject.value;
  console.log('uiStationChange()... stationId is now -> ' + stationId);
  store.put('selectedStationId', stationId);
  console.log('uiStationChange()... calling getTemp(' + stationId + ')');
  selectedStationId = stationId;
  getTemp(stationId);
}


