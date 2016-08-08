// ======== Request datastructures =====
// request prototype
function Request(ip) {
  this.ip = ip;
  this.count = 1;
}
// array holding request objects
var requestHistory = [];


// ====== Utility functions ===========
// delete history
var deleteHistory = function() {
  requestHistory = [];
}

// helper function for updateGeo
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

// fetch Geographical fields for each req in requestHistory
var updateGeo = function() {
  console.log("updating geo..");
  for (var i=0; i<requestHistory.length; i++) {
    var req = requestHistory[i];
    // only lookup location, if this has not been done before.
    if (!req.hasOwnProperty("longitude")) {
      getGeo(req);
    }
  }
}

// sort history desc. according to count
var sortHistory = function() {
  requestHistory.sort(function(a, b) {
    if (a.count > b.count) {
      return -1
    }
    else if (a.count < b.count) {
      return 1;
    }
    else {
      return 0
    }
  });
}


// =========  Listener Arguments =========
var updateHistory = function(details) {
  // if request has IP and is not a request made to freegeoip - log it!
  if (details.ip && (details.url.indexOf("freegeoip.net/") == -1)) {
      console.log(details);
      var index = requestHistory.findIndex(function(value) {
        return value.ip === details.ip;
      });
      // ip already in array, increment its count.
      if (index >= 0) {
        requestHistory[index].count += 1;
      }
      // ip not in history, add it as obj
      else {
        var req = new Request(details.ip);
        // async request to obtain geo info
        getGeo(req);
        // push it to history
        requestHistory.push(req);
      }
  }
  console.log(requestHistory);
}
// filter argument: listen to all URLS i.e. all requests.
var filterObj = {urls: ["<all_urls>"]};

// ========= Messenging, Listeners and Status ========

// the background script is listening by default.
var listening = true;
chrome.webRequest.onCompleted.addListener(updateHistory, filterObj);

chrome.runtime.onConnect.addListener(function(port) {
  port.onMessage.addListener(function(msg) {
    console.log("message received!");
    console.log(msg.type);
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
      console.log("deleting history");
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
