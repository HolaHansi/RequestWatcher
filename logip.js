// =========== REQUEST INFRASTRUCTURE =========
// request prototype TODO: extend
function Request(ip) {
  this.ip = ip;
  this.count = 1;
}
// array holding request objects
var requestHistory = [];


var updateHistory = function(details) {
  if (details.ip) {
    var index = requestHistory.findIndex(function(value) {
      return value.ip === details.ip;
    });
    // ip already in array, increment its count.
    if (index >= 0) {
      requestHistory[index].count += 1;
    }
    // ip not in history, add it as obj
    else {
      requestHistory.push(new Request(details.ip));
    }
  }
  console.log(requestHistory);
}
var filterObj = {urls: ["<all_urls>"]};


// delete history
var deleteHistory = function() {
  requestHistory = [];
}

// helper function for updateGeo
var getGeo = function(req){
  var url = "http://freegeoip.net/json/" + req.ip;
  // must finish request before moving on
  // $.ajaxSetup({async: false});
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
    if (!req.hasOwnProperty("city")) {
      getGeo(req);
    }
  }
}

// ========= Listeners and Status ========

// false, when not listening on requests.
var listening = false;

chrome.runtime.onConnect.addListener(function(port) {
  port.onMessage.addListener(function(msg) {
    console.log("message received!");
    // popup loaded and needs listening status
    if (msg.type === "status") {
      port.postMessage({type: "status", status: listening});
    }
    // history requested for generating stats
    else if (msg.type === "getHistory") {
      // sort history and send it to popup
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

      port.postMessage({type: "history", history: requestHistory});
    }

    // btn pressed
    else if (msg.type === "deleteHis") {
      deleteHistory();
    }

    // btn pressed
    else if (msg.type === "updateGeo") {
      updateGeo();
    }

    // start listening btn was pressed
    else if (msg.type === "start") {
      chrome.webRequest.onCompleted.addListener(updateHistory, filterObj);
      listening = true;
    }
    // stop listening btn was pressed
    else if (msg.type === "stop") {
      console.log("STOP REQUESTED!");
      chrome.webRequest.onCompleted.removeListener(updateHistory);
      listening = false;
      }
  });
});

// ip processing
// processing ips
// function getIps(obj) {
//   var listOfIps = [];
//   var newIp = true
//
//   for(var i = 0; i<obj.content.entries.length; i++) {
//     // check if IP not null
//     if (obj.content.entries[i].serverIPAddress) {
//       var ip = obj.content.entries[i].serverIPAddress
//     }
//     // if already in list, increment count
//     for (j = 0; j<listOfIps.length; j++) {
//       if (listOfIps[j].ipAdd === ip) {
//         listOfIps[j].count += 1;
//         newIp = false;
//       }
//     }
//     // if not in list, add it to list with count 1
//     if (newIp) {
//       listOfIps.push({ipAdd: ip, count: 1});
//     }
//   }
//   return listOfIps;
// }
//
// function addLocation(listOfIps) {
//   var finalList = [];
//   for (var k=0; k<listOfIps.length; k++) {
//     var ip = listOfIps[k].ipAdd;
//     var count = listOfIps[k].count;
//     var url = "http://freegeoip.net/json/" + ip;
//
//     // sync ajax requests might not work in all browsers :-(
//     $.ajaxSetup({async: false});
//     $.ajax({
//       url: url,
//       success: function(data) {
//         var element = {
//           ip: ip,
//           count: count,
//           latitude: data.latitude,
//           longitude: data.longitude,
//           city: data.city,
//           country: data.country_name
//         };
//         finalList.push(element);
//       }
//     });
//   }
//   return finalList;
// }
