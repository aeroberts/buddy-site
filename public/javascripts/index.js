// Fetch fitbit summary data on page load
function LatLong(lat, long) {
    this.lat = lat;
    this.long = long;
}

function Map (map){
    this.map = map;
    this.hasLoaded = false;
    this.coordinates = []
}

var maps = {};
$.get("/fitbit_summary")
.done(function(data) {
    $("#running-container").append(data);

    var mapboxgl = require('mapbox-gl/dist/mapbox-gl.js');
    mapboxgl.accessToken = 'pk.eyJ1IjoiYWVyb2JzIiwiYSI6ImNqM2c5djZ0NzAwMGkyd252N2xrMHVmaTgifQ.frda-iPjhvsWct12vzkA-Q';

    $.each($(".fitbit-map"), function() {
        var id = $(this)[0].id;
        var map = new mapboxgl.Map({
            container: id,
            style: 'mapbox://styles/mapbox/streets-v9',
            center: [-122.446052, 37.78],
            zoom: 11
        });
        maps[id] = new Map(map);
    });
})
.fail(function(err) {
    console.error(err);
});




// Event Handlers
$('#running-container').on('show.bs.collapse', ".activity-collapse", function (e) {
    // Remove rounded edges from bottom
    $(e.target).prev().addClass('act-header-flat-bot');
});

$('#running-container').on('shown.bs.collapse', ".activity-collapse", function (e) {
    var fitbitmap = $(e.target).find(".fitbit-map")[0];
    var fitbitMapData = $(e.target).find(".fitbit-map-data")[0];
    var id = fitbitmap.id;
    $(fitbitmap).removeClass("map-hidden");
    maps[id].map.resize();
    $(fitbitMapData).removeClass("map-hidden");

    // If map has not loaded, overlay

    // Make call for lat/long
    var logId = $(e.target).attr("data-logId");
    $.get("/tcx?logId="+logId)
    .done(function(data) {
        var latLongs = JSON.parse(data);
        console.log(latLongs);
    });
});

$('#running-container').on('hide.bs.collapse', ".activity-collapse", function (e) {
    $($(e.target).find(".fitbit-map")[0]).addClass("map-hidden");
});

$('#running-container').on('hidden.bs.collapse', ".activity-collapse", function (e) {
    $(e.target).prev().removeClass('act-header-flat-bot');
});



