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
                    trackPoints = trackPoints['Track'][0]['Trackpoint'];

                    latLongs = [];
                    var maxLat = -1000;
                    var minLat = 1000;
                    var maxLong = -1000;
                    var minLong = 1000;
                    for (trackPoint in trackPoints) {
                        var latLong = generateLatLong(trackPoints[trackPoint]["Position"][0]);
                        latLongs.push(latLong);

                        maxLat = Math.max(maxLat, latLong[1]);
                        minLat = Math.min(minLat, latLong[1]);
                        maxLong = Math.max(maxLong, latLong[0]);
                        minLong = Math.max(minLong, latLong[0]);
                    }
                    var latLongData = {
                        maxLat: maxLat,
                        minLat: minLat,
                        maxLong: maxLong,
                        minLong: minLong,
                        latLongs: latLongs
                    }
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




