// Fetch fitbit summary data on page load
let mapboxgl = require('mapbox-gl/dist/mapbox-gl.js');

function Map (map){
    this.map = map;
    this.hasLoaded = false;
    this.coordinates = []
}

let maps = {};
$.get("/fitbit_summary")
.done(function(data) {
    $("#running-container").append(data);

    mapboxgl.accessToken = 'pk.eyJ1IjoiYWVyb2JzIiwiYSI6ImNqM2c5djZ0NzAwMGkyd252N2xrMHVmaTgifQ.frda-iPjhvsWct12vzkA-Q';

    $.each($(".fitbit-map"), function() {
        let id = $(this)[0].id;
        let map = new mapboxgl.Map({
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

function addRouteToMap(map, latLongData) {
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
                    "coordinates": latLongData.latLongs
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

    let sw = new mapboxgl.LngLat(latLongData.minLong, latLongData.minLat);
    let ne = new mapboxgl.LngLat(latLongData.maxLong, latLongData.maxLat);
    let llb = new mapboxgl.LngLatBounds(sw, ne);

    map.setCenter(llb.getCenter());
    map.fitBounds(llb);
}

function updateActivityDetails(fitbitMapData, latLongData) {
    fitbitMapData.find(".display-distance").html((latLongData.totalDistance + "<span class=\"units\">mi</span>"));
    fitbitMapData.find(".display-time").html(latLongData.totalTime);
    fitbitMapData.find(".display-pace").html(latLongData.avgPace);
    fitbitMapData.find(".display-calories").html(latLongData.totalCals);

    fitbitMapData.find(".map-data-splits").html(latLongData['splitTemplate']);
}




// Event Handlers
let runningContainer = $('#running-container');
runningContainer.on('show.bs.collapse', ".activity-collapse", function (e) {
    // Remove rounded edges from bottom
    $(e.target).prev().addClass('act-header-flat-bot');
});

runningContainer.on('shown.bs.collapse', ".activity-collapse", function (e) {
    let fitbitmap = $(e.target).find(".fitbit-map")[0];
    let fitbitMapData = $(e.target).find(".fitbit-map-data")[0];
    let id = fitbitmap.id;
    $(fitbitmap).removeClass("map-hidden");

    let map = maps[id];

    map.map.resize();
    $(fitbitMapData).removeClass("map-hidden");

    // If map has not loaded, overlay

    // Make call for lat/long
    let logId = $(e.target).attr("data-logId");
    $.get("/tcx?logId="+logId)
    .done(function(data) {
        console.log(data);
        let latLongData = JSON.parse(data);
        addRouteToMap(map.map, latLongData);
        updateActivityDetails($(e.target).find(".fitbit-map-data"), latLongData);
    });
});

runningContainer.on('hide.bs.collapse', ".activity-collapse", function (e) {
    $($(e.target).find(".fitbit-map")[0]).addClass("map-hidden");
});

runningContainer.on('hidden.bs.collapse', ".activity-collapse", function (e) {
    $(e.target).prev().removeClass('act-header-flat-bot');
});



