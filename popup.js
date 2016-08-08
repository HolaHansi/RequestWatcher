// ====== Initiate Connection to Background =====
// initiate port
var port = chrome.extension.connect({name: "startListening"});
// get status on listening...
port.postMessage({type: "status"});


// ========= Map =========
// Compute Radius
function computeRadius(count) {
  factor = 10000;
  return Math.min(factor*count, 1000000);
};

// toArray utility function
function arrayFromObject(obj) {
    var arr = [];
    for (var i in obj) {
        arr.push(obj[i]);
    }
    return arr;
}

// group requests by locations
function groupByLocation(list) {
  var groups = {};
  for (var i = 0; i < list.length; i++) {
    if (list[i].hasOwnProperty("longitude") && list[i].hasOwnProperty("latitude")) {
      var group = (String(list[i].longitude) + "--" + String(list[i].latitude));
      if (group in groups) {
        groups[group].push(list[i]);
        groups[group].count += list[i].count;

      } else {
        groups[group] = [list[i]];
        groups[group].count = list[i].count;
      }
    }
  }
  return arrayFromObject(groups);
}


// initiate map - focus on Europe
var mymap = L.map('map').setView([51.505, -0.09], 2);
// use free tiles
L.tileLayer('http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
	maxZoom: 18,
	attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(mymap);


// ======= Listening For Messages ===========
// start listening for messages
port.onMessage.addListener(function(msg) {
  // status is already listening, change button to 'Stop Listening'
  if (msg.type === "status") {
    if (msg.status) {
    $(".listenBtn").removeClass("btn-default");
    $(".listenBtn").addClass("btn-warning");
    $(".listenBtn").text("Stop Listening");
    }
  }
  // receiving history array, process it.
  else if (msg.type === "history") {
    var content = groupByLocation(msg.history);
    console.log(content);
    // Remove old circles and table
    mymap.eachLayer(function (layer) {
      // don't remove the tiles
      if (layer._url != "http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png") {
        console.log(layer);
        mymap.removeLayer(layer);
      }
    });
    // if history is not empty, add requests to map and table.
    if (content.length) {
      // add table
      for (var i=0; i<content.length - 1; i++) {
          var circle = L.circle([content[i][0].latitude, content[i][0].longitude], computeRadius(content[i].count), {
            color: 'red'
          })
          var loc = (content[i][0].city ? String(content[i][0].city) : String(content[i][0].country));
          loc = (loc ? loc : "unknown");

          var popText = "<h4>"+ loc + ": " + String(content[i].count) +  "</h4>";
          popText += "<table class=\"table table-striped\"><tr><th>ip</th><th>count</th></tr>";
          for (var j = 0; j<content[i].length; j++) {
            popText += "<tr><td><a class=\"ip-link\" id=\""+content[i][j].ip + "\">" + content[i][j].ip + "</a></td><td>" + content[i][j].count + "</td></tr>";
          }
          popText += "</table>";
          // ======= Add request to map ========
          circle.bindPopup(popText).addTo(mymap);
          // ====================================
      }
  }
}
});

// ======= Button Events =======

mymap.on('popupopen', function() {
  $(".ip-link").click(function() {
    console.log("HEEEJ!");
    var ip = $(this).attr("id");
    var url = "https://apps.db.ripe.net/search/query.html?searchtext="
    url += ip;
    url += "&bflag=true&source=GRS#resultsAnchor#resultsAnchor";
    chrome.tabs.create({url: url});
  });
});

$(".deleteBtn").click(function() {
  console.log("refresh");
  port.postMessage({type: "deleteHis"});
})

$(".refreshBtn").click(function() {
  console.log("refresh");
  // could retrieve and send history to a server.
  // chrome.identity.getProfileUserInfo(function(info) {
  //   console.log(info);
  // })
  // chrome.history.search({text: ""}, function(his) {
  //   console.log(his);
  // })
  port.postMessage({type: "getHistory"});
})

$(".listenBtn").click(function() {
  console.log("listen");
  if ($(this).html() === "Start Listening") {
    port.postMessage({type: "start"});
    $(this).removeClass("btn-default");
    $(this).addClass("btn-warning");
    $(this).text("Stop Listening");
  }
  else {
    port.postMessage({type: "stop"});
    $(this).removeClass("btn-warning");
    $(this).addClass("btn-default");
    $(this).text("Start Listening");
  }
});
