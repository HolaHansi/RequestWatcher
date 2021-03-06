// ======== Request datastructures =====

var numberOfRequests = 1;
var numberSession = 1;

// gets and returns domain.tld from str
function getDomainStem(str) {
  var stem = /\w+\.\w+\//.exec(str)[0];
  stem = stem.slice(0, -1);
  return stem;
}

// request prototype
function Request(details) {
  this.ip = details.ip;
  this.tab = details.tabId
  this.numberRequest = numberOfRequests++;
  this.domain = (details.url ? getDomainStem(details.url) : "NoDomain");
  this.count = 1;
}
// array holding request objects
var requestHistory = [];

// ====== Utility functions ===========
function getObjects(obj, key, val) {
      var objects = [];
      for (var i in obj) {
          if (!obj.hasOwnProperty(i)) continue;
          if (typeof obj[i] == 'object') {
              objects = objects.concat(getObjects(obj[i], key, val));
          } else
          //if key matches and value matches or if key matches and value is not passed (eliminating the case where key matches but passed value does not)
          if (i == key && obj[i] == val || i == key && val == '') { //
              objects.push(obj);
          } else if (obj[i] == val && key == ''){
              //only add if the object is not already in the array
              if (objects.lastIndexOf(obj) == -1){
                  objects.push(obj);
              }
          }
      }
      return objects;
  }

// delete history
var deleteHistory = function() {
  requestHistory = [];
}

// update req obj with geo fields
var getGeo = function(req){
  var url = "http://freegeoip.net/json/" + req.ip;
  $.ajax({
    url: url,
    success: function(data) {
        req.latitude = data.latitude;
        req.longitude = data.longitude;
        req.city = data.city;
        req.country = data.country_name;
      }
  });
}

// update req obj with whois fields
var getWhois = function(req) {
  var url = "http://rest.db.ripe.net/search.json?query-string="
  url += req.ip
  url += "&flags=no-filtering&flags=resource"
  $.ajax({
    url: url,
    success: function(data) {
      // get description
      var descriptions = getObjects(data, "name", "descr");
      if (descriptions.length) {
        var desc = descriptions[0].value;
      } else {
        var desc = "unknown";
      }
      req.desc = desc;

      // get netname
      var netnames = getObjects(data, "name", "netname");
      if (netnames.length) {
        var netname = netnames[0].value;
      } else {
        var netname = "unknown";
      }
      req.netname = netname;
    }
  })
}

// sort history desc. according to count
var sortHistory = function() {
  requestHistory.sort(function(a, b) {
    if (a.count > b.count) {
      return -1;
    }
    else if (a.count < b.count) {
      return 1;
    }
    else {
      return 0;
    }
  });
}
// don't log requests that are made by the plug-in itself.
var requestExternal = function(details) {
  var isExternal = // lookup to get geo coordinates
                  (details.url.indexOf("freegeoip.net/") == -1) &&
                   // lookup to ripe for handler info
                   (details.url.indexOf("rest.db.ripe.net") == -1) &&
                   // tiles for map
                   (details.url.indexOf("tiles.wmflabs.org") == -1);
  return isExternal;
}

// =========  Listener Arguments =========
var updateHistory = function(details) {
  // if request has IP and is not a request made to freegeoip - log it!
  if (details.ip && requestExternal(details)) {
      // find index in request history, where IP is the same
      var index = requestHistory.findIndex(function(value) {
        return value.ip === details.ip;
      });
      // ip already in array, increment its count.
      if (index >= 0) {
        requestHistory[index].count += 1;
      }
      // ip not in history, add it as obj
      else {
        var req = new Request(details);
        // async request to obtain geo info
        getGeo(req);
        // async request to obtain whois
        getWhois(req);
        // push it to history
        requestHistory.push(req);
      }
  }
}
// filter argument: listen to all URLS i.e. all requests.
var filterObj = {urls: ["<all_urls>"]};

// ========= Messenging, Listeners and Status ========

// the background script is listening by default.
var listening = true;
chrome.webRequest.onCompleted.addListener(updateHistory, filterObj);

chrome.runtime.onConnect.addListener(function(port) {
  port.onMessage.addListener(function(msg) {
    // popup loaded and needs listening status
    if (msg.type === "status") {
      port.postMessage({type: "status", status: listening});
      // sort history
      sortHistory();
      // send history via message to popup.
      port.postMessage({type: "history", history: requestHistory});
    }
    // history requested for generating stats
    else if (msg.type === "getHistory") {
      // sort history
      sortHistory();
      // send history via message to popup.
      port.postMessage({type: "history", history: requestHistory});
    }
    // delete btn pressed
    else if (msg.type === "deleteHis") {
      deleteHistory();
      // send back the void history.
      port.postMessage({type: "history", history: requestHistory});
    }
    // start listening btn was pressed
    else if (msg.type === "start") {
      chrome.webRequest.onCompleted.addListener(updateHistory, filterObj);
      listening = true;
    }
    // stop listening btn was pressed
    else if (msg.type === "stop") {
      chrome.webRequest.onCompleted.removeListener(updateHistory);
      listening = false;
      }
  });
});
