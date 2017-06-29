var fs = require('fs');
var moment = require('moment');
var Promise = require('promise');
var express = require('express');
var xml2js = require('xml2js');
var router = express.Router();

function generateLatLong(trackPoint) {
    var lat = trackPoint["LatitudeDegrees"][0];
    var long = trackPoint["LongitudeDegrees"][0];
    return [long, lat];
}

function calcSplit(upperSplit, lowerSplit) {
    usm = moment(upperSplit, "YYYY-MM-DDTHH:mm:ss:SSS-ZZ");
    lsm = moment(lowerSplit, "YYYY-MM-DDTHH:mm:ss:SSS-ZZ");

    return moment.duration(usm.diff(lsm, 'seconds')).as("mm:ss");
}

function pad(num) {
    return ("0"+num).slice(-2);
}

function hhmmss(secs) {
    var minutes = Math.floor(secs / 60);
    secs = secs%60;
    var hours = Math.floor(minutes/60)
    minutes = minutes%60;

    if (hours == 0) {
        return pad(minutes)+":"+pad(secs);
    }

    return pad(hours)+":"+pad(minutes)+":"+pad(secs);
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

    var templateFetch = new Promise(function(resolve, reject) {
        fs.readFile("templates/mile_splits.mustache", 'utf8', function(err, data) {
            if (err) { reject(err); }
            resolve(data);
        });
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
                    var MilesToMeters = 1609.34/6;

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
                            if (miles.length > 1) {
                                console.log("CurMILE:", curMile);
                                console.log(miles);
                                var upperSplit = miles[curMile-1]["time"];
                                var lowerSplit = miles[curMile-2]["time"];
                                miles[curMile-1]["split"] = calcSplit(upperSplit, lowerSplit);
                            }
                            else {
                                miles[0]["split"] = moment(miles[0]["time"], "YYYY-MM-DDTHH:mm:ss:SSS-ZZ").format("mm:ss");
                            }

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
                        totalDistance = totalDistance.toFixed(2);
                    }
                    else {
                        totalDistance = totalDistance.toFixed(1);
                    }

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
                        totalTime: hhmmss(totalTime),
                        totalCals: totalCals,
                        avgPace: avgPaceMinute + ":" + avgPaceSeconds
                    };

                    templateFetch.then(function(source) {
                        res.send(JSON.stringify(latLongData));
                    });

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




