var fs = require('fs');
var Promise = require('promise');
var express = require('express');
var xml2js = require('xml2js');
var router = express.Router();

function generateLatLong(trackPoint) {
    var lat = trackPoint["LatitudeDegrees"][0];
    var long = trackPoint["LongitudeDegrees"][0];
    return [long, lat];
}

/* Handles Auth Code response from fitbit */
router.get('/', function(req, res, next) {
    if (req.query.logId == null) {
        res.status.send(400);
    }

    var logId = req.query.logId;
    fs.stat('tcx/' + logId + ".tcx", function (err) {
        if (err) {
            res.status(400);
            res.send("LogId does not exist");
        }
    });

    fs.readFile("tokens/auth", 'utf8', function (err, data) {
        if (err) {
            console.error(err);
        }

        parser = new xml2js.Parser();
        fs.readFile('tcx/' + logId + '.tcx', function (err, data) {
            parser.parseString(data, function (err, result) {
                try {
                    var trackPoints = result["TrainingCenterDatabase"]["Activities"][0]['Activity'][0]['Lap'][0];
                    var totalCals = trackPoints["Calories"][0];
                    var totalTime = trackPoints["TotalTimeSeconds"][0];
                    var totalDistance = trackPoints["DistanceMeters"][0];
                    trackPoints = trackPoints['Track'][0]['Trackpoint'];

                    var latLongs = [];

                    var maxLat = -1000;
                    var minLat = 1000;
                    var maxLong = -1000;
                    var minLong = 1000;

                    var miles = [];

                    miles.push({
                        lat: trackPoints[0]["Position"][0][1],
                        long: trackPoints[0]["Position"][0][0],
                        distance: trackPoints[0]["DistanceMeters"][0],
                        time: trackPoints[0]["Time"][0]
                    });

                    var curMile = 1;
                    var MilesToMeters = 1609.34;

                    for (trackPoint in trackPoints) {
                        var latLong = generateLatLong(trackPoints[trackPoint]["Position"][0]);
                        latLongs.push(latLong);

                        maxLat = Math.max(maxLat, latLong[1]);
                        minLat = Math.min(minLat, latLong[1]);
                        maxLong = Math.max(maxLong, latLong[0]);
                        minLong = Math.min(minLong, latLong[0]);

                        var distance = trackPoints[trackPoint]["DistanceMeters"][0];
                        var curDiff = Math.abs(curMile*MilesToMeters - distance);
                        var bestDiff = Math.abs(curMile*MilesToMeters)-miles[curMile-1].distance;

                        if (curDiff < bestDiff) {
                            miles[curMile-1] = {
                                lat: latLong[1],
                                long: latLong[0],
                                distance: distance,
                                time: trackPoints[trackPoint]["Time"][0]
                            }
                        }
                        else if (curDiff > bestDiff) {
                            curMile += 1;
                            miles.push({
                                lat: latLong[1],
                                long: latLong[0],
                                distance: distance,
                                time: trackPoints[trackPoint]["Time"][0]
                            });
                        }
                    }

                    totalDistance = totalDistance*0.000621371;
                    if (totalDistance < 10) {
                        totalDistance.toFixed(2);
                    }
                    else {
                        totalDistance.toFixed(1);
                    }
                    console.log(totalDistance);

                    var avgPace = ((totalTime/60)/totalDistance).toFixed(2);
                    var avgPaceMinute = Math.floor(avgPace);
                    var avgPaceSeconds = Math.round((avgPace % 1) * 60);

                    var latLongData = {
                        maxLat: maxLat,
                        minLat: minLat,
                        maxLong: maxLong,
                        minLong: minLong,
                        latLongs: latLongs,
                        miles: miles,
                        totalDistance: totalDistance,
                        totalTime: totalTime,
                        totalCals: totalCals,
                        avgPace: avgPaceMinute + ":" + avgPaceSeconds
                    };
                    res.send(JSON.stringify(latLongData));
                }
                catch (err) {
                    console.log("ERRROR");
                    console.log(err);
                    res.send({"GPS":false});
                }
            });
        });
    });
});

module.exports = router;




