let fs = require('fs');
let moment = require('moment');
let mustache = require('mustache');
let Promise = require('promise');
let express = require('express');
let xml2js = require('xml2js');
let router = express.Router();

function generateLatLong(trackPoint) {
    let lat = trackPoint["LatitudeDegrees"][0];
    let long = trackPoint["LongitudeDegrees"][0];
    return [long, lat];
}

function getElapsedTime(endTime, startTime) {
    let start = moment(startTime, "YYYY-MM-DDTHH:mm:ss:SSS-ZZ");
    let end = moment(endTime, "YYYY-MM-DDTHH:mm:ss:SSS-ZZ");

    let duration = moment.duration(end.diff(start));
    let hours = duration.hours();
    let minutes = duration.minutes();
    let seconds = duration.seconds();

    if (hours <= 0) {
        return minutes + ":" + pad(seconds);
    }
    return hours + ":" + pad(minutes) + ":" + pad(seconds);
}

function calcSplit(upperSplit, lowerSplit) {
    let usm = moment(upperSplit, "YYYY-MM-DDTHH:mm:ss:SSS-ZZ");
    let lsm = moment(lowerSplit, "YYYY-MM-DDTHH:mm:ss:SSS-ZZ");

    let duration = moment.duration(usm - lsm);
    return moment(duration.asMilliseconds()).format('m:ss');
}

function pad(num) {
    return ("0"+num).slice(-2);
}

function hhmmss(secs) {
    let minutes = Math.floor(secs / 60);
    secs = secs%60;
    let hours = Math.floor(minutes/60);
    minutes = minutes%60;

    if (hours === 0) {
        return pad(minutes)+":"+pad(secs);
    }

    if (hours < 10) {
        return hours+":"+pad(minutes)+":"+pad(secs);

    }
    return pad(hours)+":"+pad(minutes)+":"+pad(secs);
}

/* Handles Auth Code response from fitbit */
router.get('/', function(req, res, next) {
    if (req.query.logId === null) {
        res.status.send(400);
    }

    let logId = req.query.logId;
    fs.stat('tcx/' + logId + ".tcx", function (err) {
        if (err) {
            res.status(400);
            res.send("LogId does not exist");
        }
    });

    let templateFetch = new Promise(function(resolve, reject) {
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
                    let trackPoints = result["TrainingCenterDatabase"]["Activities"][0]['Activity'][0]['Lap'][0];
                    let totalCals = trackPoints["Calories"][0];
                    let totalTime = trackPoints["TotalTimeSeconds"][0];
                    let totalDistance = trackPoints["DistanceMeters"][0];
                    trackPoints = trackPoints['Track'][0]['Trackpoint'];

                    let latLongs = [];

                    let maxLat = -1000;
                    let minLat = 1000;
                    let maxLong = -1000;
                    let minLong = 1000;

                    let miles = [];

                    let startTime = trackPoints[0]["Time"][0];

                    miles.push({
                        lat: trackPoints[0]["Position"][0][1],
                        long: trackPoints[0]["Position"][0][0],
                        distance: trackPoints[0]["DistanceMeters"][0],
                        time: trackPoints[0]["Time"][0]
                    });

                    let curMile = 1;
                    let MilesToMeters = 1609.34/6;

                    for (trackPoint in trackPoints) {
                        let latLong = generateLatLong(trackPoints[trackPoint]["Position"][0]);
                        latLongs.push(latLong);

                        maxLat = Math.max(maxLat, latLong[1]);
                        minLat = Math.min(minLat, latLong[1]);
                        maxLong = Math.max(maxLong, latLong[0]);
                        minLong = Math.min(minLong, latLong[0]);

                        let distance = trackPoints[trackPoint]["DistanceMeters"][0];
                        let curDiff = Math.abs(curMile*MilesToMeters - distance);
                        let bestDiff = Math.abs(curMile*MilesToMeters)-miles[curMile-1].distance;

                        if (curDiff < bestDiff) {
                            miles[curMile-1] = {
                                lat: latLong[1],
                                long: latLong[0],
                                distance: distance,
                                displayDistance: curMile,
                                time: trackPoints[trackPoint]["Time"][0]
                            }
                        }
                        else if (curDiff > bestDiff) {
                            if (miles.length > 1) {
                                let upperSplit = miles[curMile-1]["time"];
                                let lowerSplit = miles[curMile-2]["time"];
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
                                displayDistance: curMile,
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

                    let avgPace = ((totalTime/60)/totalDistance).toFixed(2);
                    let avgPaceMinute = Math.floor(avgPace);
                    let avgPaceSeconds = Math.round((avgPace % 1) * 60);

                    if (!('split' in miles[miles.length-1])) {
                        // Calculate split
                        let upperMile = miles[miles.length-1];
                        let lowerMile = miles[miles.length-2];
                        miles[miles.length-1]["split"] = calcSplit(upperMile['time'], lowerMile['time'])
                    }

                    for (mile in miles) {
                        miles[mile]['elapsedTime'] = getElapsedTime(miles[mile]['time'], startTime)
                    }
                    console.log(miles);


                    let latLongData = {
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
                        latLongData['splitTemplate'] = mustache.render(source, {miles: latLongData['miles']});
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




