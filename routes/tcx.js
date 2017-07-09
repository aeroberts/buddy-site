let fs = require('fs');
let moment = require('moment');
let mustache = require('mustache');
let Promise = require('promise');
let express = require('express');
let xml2js = require('xml2js');
let router = express.Router();
let timeHelpers = require('../helpers/timeHelpers');
let latLongHelpers = require('../helpers/LatLongHelpers');


const MilesToMeters = 1609.34/6; // REMOVE /6, JUST FOR TESTING



function MileData(latLong, distance, curMile, time) {
    this.lat = latLong[1];
    this.long = latLong[0];
    this.distance = distance;
    this.curMile = curMile;
    this.time = time;
}

function Bounds() {
    this.maxLat = -1000;
    this.minLat = 1000;
    this.maxLong = -1000;
    this.minLong = 1000;

    this.update = function (latLong) {
        this.maxLat = Math.max(this.maxLat, latLong[1]);
        this.minLat = Math.min(this.minLat, latLong[1]);
        this.maxLong = Math.max(this.maxLong, latLong[0]);
        this.minLong = Math.min(this.minLong, latLong[0]);
    };

    this.adjustOut = function() {
        this.maxLat += .0012;
        this.minLat -= .0012;
        this.maxLong += .0012;
        this.minLong -= .0012;
    }
}

// Converts meters to miles with rounded decimal
function convertToDisplayMiles(distance) {
    distance = distance*0.000621371;
    if (distance < 10) {
        return distance.toFixed(2);
    }
    else {
        return distance.toFixed(1);
    }
}

function calcAvgPace(avgPace) {
    let avgPaceMinute = Math.floor(avgPace);
    let avgPaceSeconds = Math.round((avgPace % 1) * 60);
    return avgPaceMinute + ":" + avgPaceSeconds
}

function handleTrackPoints(trackPoints, latLongs, miles, bounds) {
    let curMile = 1;

    for (let trackPoint in trackPoints) {
        let latLong = latLongHelpers.generateLatLong(trackPoints[trackPoint]["Position"][0]);
        latLongs.push(latLong);
        bounds.update(latLong);

        let distance = trackPoints[trackPoint]["DistanceMeters"][0];
        let curDiff = Math.abs(curMile*MilesToMeters - distance);
        let bestDiff = Math.abs(curMile*MilesToMeters)-miles[curMile-1].distance;

        if (curDiff < bestDiff) {
            miles[curMile-1] = new MileData(latLong, distance, curMile, trackPoints[trackPoint]["Time"][0]);
        }
        else if (curDiff > bestDiff) {
            if (miles.length > 1) {
                let upperSplit = miles[curMile-1]["time"];
                let lowerSplit = miles[curMile-2]["time"];
                miles[curMile-1]["split"] = timeHelpers.calcSplit(upperSplit, lowerSplit);
            }
            else {
                miles[0]["split"] = moment(miles[0]["time"], "YYYY-MM-DDTHH:mm:ss:SSS-ZZ").format("mm:ss");
            }

            curMile += 1;
            miles.push(new MileData(latLong, distance, curMile, trackPoints[trackPoint]["Time"][0]));
        }
    }
}

router.get('/', (req, res) => {
    if (req.query.logId === null) {
        res.status.send(400);
        res.send("No logId sent");
    }

    let logId = req.query.logId;
    fs.stat('tcx/' + logId + ".tcx", err => {
        if (err) {
            res.status(400);
            res.send("LogId does not exist");
        }
    });

    let templateFetch = new Promise((resolve, reject) => {
        fs.readFile("templates/mile_splits.mustache", 'utf8', (err, data) => {
            if (err) { reject(err); }
            resolve(data);
        });
    });

    let parser = new xml2js.Parser();
    fs.readFile('tcx/' + logId + '.tcx', (err, data) => {
        parser.parseString(data, (err, result) => {
            try {
                let activity = result["TrainingCenterDatabase"]["Activities"][0]['Activity'][0];
                if (!('Lap' in activity)) {
                    res.send({"GPS":false});
                    return;
                }


                let trackPoints = activity['Lap'][0];

                let totalCals = trackPoints["Calories"][0];
                let totalTime = trackPoints["TotalTimeSeconds"][0];
                let totalDistance = trackPoints["DistanceMeters"][0];
                trackPoints = trackPoints['Track'][0]['Trackpoint'];
                let startTime = trackPoints[0]["Time"][0];

                let latLongs = [];
                let miles = [];
                let bounds = new Bounds();

                let initLatLong = latLongHelpers.generateLatLong(trackPoints[0]["Position"][0]);
                miles.push(new MileData(initLatLong, 0, 0, startTime));

                handleTrackPoints(trackPoints, latLongs, miles, bounds);
                totalDistance = convertToDisplayMiles(totalDistance);

                // For last mile, if it does not come cleanly to a mile, calculate the elapsed time for that distance
                if (!('split' in miles[miles.length-1])) {
                    let upperMile = miles[miles.length-1];
                    let lowerMile = miles[miles.length-2];
                    miles[miles.length-1]["split"] = timeHelpers.calcSplit(upperMile['time'], lowerMile['time'])
                }

                miles.forEach(mile => {
                    mile['elapsedTime'] = timeHelpers.getElapsedTime(mile['time'], startTime);
                });

                bounds.adjustOut();
                let latLongData = {
                    bounds: bounds,
                    latLongs: latLongs,
                    miles: miles,
                    totalDistance: totalDistance,
                    totalTime: timeHelpers.hhmmss(totalTime),
                    totalCals: totalCals,
                    avgPace: calcAvgPace(((totalTime/60)/totalDistance).toFixed(2)),
                };

                templateFetch.then((source) => {
                    latLongData['splitTemplate'] = mustache.render(source, {miles: latLongData['miles']});
                    res.send(JSON.stringify(latLongData));
                });

            }
            catch (err) {
                console.error(err);
                res.send({"GPS":false});
            }
        });
    });
});

module.exports = router;




