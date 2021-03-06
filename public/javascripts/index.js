// Fetch fitbit summary data on page load
let mapboxgl = require('mapbox-gl/dist/mapbox-gl.js');
let splitData = {};

function Map (map){
    this.map = map;
    this.hasLoaded = false;
    this.coordinates = [];
    this.markers = [];
    this.splitToggle = false;
}

function updateNoTCX(activityContainer) {
    let map = activityContainer.find(".fitbit-map");
    let summary = activityContainer.find(".fitbit-map-data");
    let splits = activityContainer.find(".map-data-splits");

    map.addClass("no-tcx");
    summary.addClass("no-tcx");
    splits.addClass("no-tcx");

    activityContainer.addClass("no-tcx");
    setTimeout(function() {
        activityContainer.empty();
        activityContainer.append("<div class=no-tcx-text>No GPS data available<\div>");
    }, 1000);
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
    if (map.hasLoaded) {
        return;
    }

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

    let sw = new mapboxgl.LngLat(latLongData.bounds.minLong, latLongData.bounds.minLat);
    let ne = new mapboxgl.LngLat(latLongData.bounds.maxLong, latLongData.bounds.maxLat);
    let llb = new mapboxgl.LngLatBounds(sw, ne);

    map.setCenter(llb.getCenter());
    map.fitBounds(llb);
    map.hasLoaded = true;
}

function createHTMLMarker(mile) {
    let el = document.createElement('div');
    el.className = 'marker';
    el.innerHTML = mile;
    return el;
}

function toggleMapMarkers(map, miles, $map) {
    if (map.splitToggle === false) {
        for (let mileit in miles) {
            let marker = new mapboxgl.Marker(createHTMLMarker(parseInt(mileit)+1), {offset: [-9, -9]});
            marker.setLngLat([miles[mileit].long, miles[mileit].lat]);
            marker.addTo(map.map);

            map.markers.push(marker);
        }
        map.splitToggle = true;
    }
    else {
        $map.find(".mapboxgl-marker").remove();
        map.splitToggle = false;
        map.markers = [];
    }
}

function updateActivityDetails(fitbitMapData, latLongData) {
    fitbitMapData.find(".display-distance").html((latLongData.totalDistance + "<span class=\"units\">mi</span>"));
    fitbitMapData.find(".display-time").html(latLongData.totalTime);
    fitbitMapData.find(".display-pace").html(latLongData.avgPace + "<span class=\"units\">/mi</span>");
    fitbitMapData.find(".display-calories").html(latLongData.totalCals);
    fitbitMapData.find(".map-data-splits").html(latLongData['splitTemplate']);
}

//-------------------------------------------//
//                                           //
//              Event Handlers               //
//                                           //
//-------------------------------------------//
let runningContainer = $('#running-container');
runningContainer.on('show.bs.collapse', ".activity-collapse", function (e) {
    // Remove rounded edges from bottom
    $(e.target).prev().addClass('act-header-flat-bot');
});

// e.target = activity-collapse
runningContainer.on('shown.bs.collapse', ".activity-collapse", function (e) {
    let fitbitmap = $(e.target).find(".fitbit-map")[0];
    let fitbitMapData = $(e.target).find(".fitbit-map-data")[0];
    let id = fitbitmap.id;
    $(fitbitmap).removeClass("map-hidden");

    let map = maps[id];

    map.map.resize();
    $(fitbitMapData).removeClass("map-hidden");

    if ($(e.target).hasClass("fetched")) {
        return;
    }

    // Make call for lat/long
    let logId = $(e.target).attr("data-logId");
    $.get("/tcx?logId="+logId)
    .done(function(data) {
        if (typeof(data) === "object" && 'GPS' in data && data['GPS'] === false) {
            updateNoTCX($(e.target).find('.activity-container'));
            splitData[logId] = false;
            return;
        }

        let latLongData = JSON.parse(data);
        addRouteToMap(map.map, latLongData);
        updateActivityDetails($(e.target).find(".fitbit-map-data"), latLongData);
        splitData[logId] = latLongData['miles'];
        $(e.target).addClass("fetched");
    });
});

runningContainer.on('hide.bs.collapse', ".activity-collapse", function (e) {
    $($(e.target).find(".fitbit-map")[0]).addClass("map-hidden");
});

runningContainer.on('hidden.bs.collapse', ".activity-collapse", function (e) {
    $(e.target).prev().removeClass('act-header-flat-bot');
});

runningContainer.on('click', ".marker-toggle", function (e) {
    let $map = $(this).closest(".fitbit-map");
    let logId = $(e.target).closest(".activity-collapse").attr("data-logId");
    toggleMapMarkers(maps[$map.attr('id')], splitData[logId], $map);
});

runningContainer.on('mouseenter', '.split-data', function (e) {
    let markerIndex = $(e.target).attr('data-index')-1;
    let markers = $(this).closest(".activity-container").find('.marker');
    markers.removeClass('hovered');
    let hoverMatchMarker = markers[markerIndex];
    $(hoverMatchMarker).addClass('hovered');
});

runningContainer.on('mouseleave', '.split-data', function (e) {
    let markerIndex = $(e.target).attr('data-index')-1;
    let markers = $(this).closest(".activity-container").find('.marker');
    let hoverMatchMarker = markers[markerIndex];
    $(hoverMatchMarker).removeClass('hovered');
});



