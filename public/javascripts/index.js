// Fetch fitbit summary data on page load
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

function addRouteToMap(map, coords) {
    console.log("Adding layer");
    map.addLayer({
        "id": "route",
        "type": "line",
        "source": {
            "type": "geojson",
            "data": {
                "type": "Feature",
                "properties": {},
                "geometry": {
                    "type": "LineString",
                    "coordinates": coords
                }
            }
        },
        "layout": {
            "line-join": "round",
            "line-cap": "round"
        },
        "paint": {
            "line-color": "#6D98E8",
            "line-width": 5
        }
    });
}




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

    var map = maps[id];

    map.map.resize();
    $(fitbitMapData).removeClass("map-hidden");

    // If map has not loaded, overlay

    // Make call for lat/long
    var logId = $(e.target).attr("data-logId");
    $.get("/tcx?logId="+logId)
    .done(function(data) {
        var coords = JSON.parse(data);
        addRouteToMap(map.map, coords)
    });
});

$('#running-container').on('hide.bs.collapse', ".activity-collapse", function (e) {
    $($(e.target).find(".fitbit-map")[0]).addClass("map-hidden");
});

$('#running-container').on('hidden.bs.collapse', ".activity-collapse", function (e) {
    $(e.target).prev().removeClass('act-header-flat-bot');
});



