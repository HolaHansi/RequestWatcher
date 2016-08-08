var port = chrome.extension.connect({name: "startListening"});

// get status on listening...
port.postMessage({type: "status"});




//////////
function computeRadius(count) {
  max = 10000;
  return max*count;
};



var mymap = L.map('map').setView([51.505, -0.09], 2);
// free tiles
L.tileLayer('http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
	maxZoom: 18,
	attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(mymap);

// L.geoJson(ips).addTo(mymap);
//////////////


port.onMessage.addListener(function(msg) {
  // if already listening, change button to stop
  if (msg.type === "status") {
    if (msg.status) {
    $(".listenBtn").removeClass("btn-default");
    $(".listenBtn").addClass("btn-warning");
    $(".listenBtn").text("Stop Listening");
    }
  }
  else if (msg.type === "history") {
    console.log("HISTORY MSG!");
    console.log(msg.history);
    var content = msg.history;
    // remove all layers
    mymap.eachLayer(function (layer) {
      if (layer._url != "http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png") {
      console.log(layer);
      mymap.removeLayer(layer);
    }
    });
    $("table").remove();
    if (content.length) {
      $("table").remove();
      $("#tablePlace").append("<table> <thead> <th>ip</th> <th>count</th><th>longitude</th><th>latitude</th><th>city</th><th>country</th></thead><tbody>");
      for (var i=0; i<content.length - 1; i++) {
          // add to map
          L.circle([content[i].latitude, content[i].longitude], computeRadius(content[i].count), {
            color: 'red'
          })
          .bindPopup(content[i].city + " - ip: " + content[i].ip)
          .addTo(mymap);

          $("tbody").append("<tr><td>" + content[i].ip
          + "</td><td>" + content[i].count + "</td><td>" + content[i].longitude +
          "</td><td>" + content[i].latitude + "</td><td>" +
          content[i].city + "</td><td>" + content[i].country + "</td></tr>");
      };

      $("tbody").append("<tr><td>" + content[i].ip
      + "</td><td>" + content[content.length - 1].count + "</td><td>" + content[content.length - 1].longitude +
      "</td><td>" + content[content.length - 1].latitude + "</td><td>" +
      content[content.length - 1].city + "</td><td>" + content[content.length - 1].country + "</td></tr> </tbody></table>");

      $("table").addClass("table-responsive table-bordered");
  }
}
});


$(".deleteHis").click(function() {
  port.postMessage({type: "deleteHis"});
})

$(".showStats").click(function() {
  port.postMessage({type: "getHistory"});
})



$(".listenBtn").click(function() {
  if ($(this).html() === "Start Listening") {
    console.log("start pressed");
    port.postMessage({type: "start"});
    $(this).removeClass("btn-default");
    $(this).addClass("btn-warning");
    $(this).text("Stop Listening");
  }
  else {
    console.log("stop pressed");
    port.postMessage({type: "stop"});
    $(this).removeClass("btn-warning");
    $(this).addClass("btn-default");
    $(this).text("Start Listening");
  }
});
