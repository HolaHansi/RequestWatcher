var port = chrome.extension.connect({name: "startListening"});

// get status on listening...
port.postMessage({type: "status"});

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
    $(".table-responsive").remove();
    $("#tablePlace").append("<table> <thead> <th>ip</th> <th>count</th><th>longitude</th><th>latitude</th><th>city</th><th>country</th></thead><tbody>");
    for (var i=0; i<content.length - 1; i++) {
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

});





$(".deleteHis").click(function() {
  port.postMessage({type: "deleteHis"});
})

$(".updateGeo").click(function() {
  port.postMessage({type: "updateGeo"});
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
