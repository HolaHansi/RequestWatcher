// ====== Initiate Connection to Background =====
// initiate port
var port = chrome.extension.connect({name: "startListening"});
// get status on listening...
port.postMessage({type: "status"});

// GLOBAL var for CHART
// the previous total count.
var oldContentMap;
var oldContentChart;

// ====== automatic refresh functions =======
var intervalID;
var showingMap = true;

function startRefreshing() {
  intervalID = setInterval(function()
          {port.postMessage({type: "getHistory"});
        }, 700);
}

function stopRefreshing() {
  clearInterval(intervalID);
}
// start refreshing
startRefreshing();

// ========= Map =========
// Compute Radius
function computeRadius(count) {
  // this factor is definitely not carved in stone...
  factor = 2500;
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

// group by
function groupByNet(list) {
  var groups = {};
  for (var i = 0; i < list.length; i++) {
    if (list[i].hasOwnProperty("netname")) {
      // amazon check - amazon has many names (TODO: extend with more checks)
      if (list[i].desc.toUpperCase().indexOf("AMAZON") != -1) {
        var group = "AMAZON"
      } else {
      var group = String(list[i].netname);
      }
      if (group in groups) {
        groups[group].push(list[i]);
        groups[group].count += list[i].count;
      } else {
        groups[group] = [list[i]];
        groups[group].name = group;
        groups[group].count = list[i].count;
      }
    }
  }
  var groups = arrayFromObject(groups);
  // return the sorted groups
  groups.sort(function(a, b) {
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
  return groups;
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
  else if (msg.type === "history" && showingMap && oldContentMap != JSON.stringify(msg.history)) {
    oldContent = JSON.stringify(msg.history);
    var content = groupByLocation(msg.history);
    // Remove old circles and table
    mymap.eachLayer(function (layer) {
      // don't remove the tiles
      if (layer._url != "http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png") {
        mymap.removeLayer(layer);
      }
    });
    // if history is not empty, add requests to map.
    if (content.length) {
      // add table
      for (var i=0; i<content.length - 1; i++) {
          var circle = L.circle([content[i][0].latitude, content[i][0].longitude], computeRadius(content[i].count), {
            color: 'red'
          })
          // get location header
          var loc = (content[i][0].city ? String(content[i][0].city) : String(content[i][0].country));
          loc = (loc ? loc : "unknown");

          var popText = "<div class=\"custom-pop\"> <h4>"+ loc +  "</h4>";
          popText += "<table class=\"table table-striped\"><tr><th>IP</th><th>Count</th></tr>";
          for (var j = 0; j<content[i].length; j++) {
            popText += "<tr><td><a class=\"ip-link\" id=\""+content[i][j].ip + "\">";
            popText += content[i][j].ip + "</a></td><td>" + content[i][j].count + "</td></tr>";
          }
          popText += "<tr><td><b>Total</b></td><td>" + String(content[i].count) + "</td></tr>";
          popText += "</table></div>";
          // ======= Add request to map ========
          circle.bindPopup(popText, {"maxHeight": 250, "className": "custom-pop"}).addTo(mymap);
          // ====================================
      }
    }
  }
  else if (msg.type === "history" && !showingMap && oldContentChart != JSON.stringify(msg.history)) {
    // update old content
    oldContentChart = JSON.stringify(msg.history);
    // get top 10 nets (TODO: fix that chart is only ratios of top10s; despite the size of this group)
    var content = groupByNet(msg.history);
    if (content.length > 10) {
      content = content.slice(0,10);
    }
    // get total count
    var totalCount = 0;
    for (var x = 0; x< content.length; x++) {
      totalCount += content[x].count;
    }
    // get ratio for each group
    for (var x = 0; x< content.length; x++) {
      content[x].ratio = ((content[x].count / totalCount).toPrecision(1)) * 100;
    }

    var _values = [];
    var _labels = [];
    for (var x = 0; x< content.length; x++) {
      _values.push(content[x].ratio);
      _labels.push(content[x].name);
    }

    var data = [{
      values: _values,
      labels: _labels,
      type: 'pie'
    }];
    var layout = {
      height: 500,
      width: 700
    };
    var chart = document.getElementById('chart');
    Plotly.newPlot(chart, data, layout);

    }
});

// ====== map-popup style and events =========
mymap.on('popupopen', function() {
  // stop refreshing
  stopRefreshing();
  $(".table").css("margin-bottom", "0px");
  $(".leaflet-popup-content").css("margin", "8px 8px 8px 8px");
})

mymap.on('popupopen', function() {
  $(".ip-link").click(function() {
    var ip = $(this).attr("id");
    var url = "https://apps.db.ripe.net/search/query.html?searchtext="
    url += ip;
    url += "&bflag=true&source=GRS#resultsAnchor#resultsAnchor";
    chrome.tabs.create({url: url});
  });
});

mymap.on('popupclose', function() {
  startRefreshing();
})

// ======= Button Events =======

$(".statsBtn").click(function() {
  if ($("#map").css("display") == "none") {
    $("#map").css("display", "block");
    $("#chart").css("display", "none");
    $(this).html("Show Stats");
    showingMap = true;

  } else {
    $("#map").css("display", "none");
    $("#chart").css("display", "block")
    $(this).html("Show Map");
    showingMap = false;
    // now generate stats
  }
})

$(".deleteBtn").click(function() {
  port.postMessage({type: "deleteHis"});
})

$(".refreshBtn").click(function() {
  chrome.tabs.reload();
})

$(".listenBtn").click(function() {
  if ($(this).html() === "Start Listening") {
    port.postMessage({type: "start"});
    startRefreshing();
    $(this).removeClass("btn-default");
    $(this).addClass("btn-warning");
    $(this).text("Stop Listening");
  }
  else {
    port.postMessage({type: "stop"});
    stopRefreshing();
    $(this).removeClass("btn-warning");
    $(this).addClass("btn-default");
    $(this).text("Start Listening");
  }
});
