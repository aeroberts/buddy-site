var fs = require('fs');
var Promise = require('promise');
var express = require('express');
var xml2js = require('xml2js');
var router = express.Router();

function LatLong(trackPoint) {
    this.lat = trackPoint["LatitudeDegrees"][0];
    this.long = trackPoint["LongitudeDegrees"][0];
}

/* Handles Auth Code response from fitbit */
router.get('/', function(req, res, next) {
    if (req.query.logId == null) {
        res.status.send(400);
    }

    var logId = req.query.logId;
    fs.stat('tcx/' + logId + ".tcx", function (err) {
        if (err) {
            res.status.send(400);
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

                    latLongs = []
                    for (trackPoint in trackPoints) {
                        latLongs.push(new LatLong(trackPoints[trackPoint]["Position"][0]));
                    }
                    res.send(JSON.stringify(latLongs));
                }
                catch (err) {
                    console.log("ERRROR");
                }
            });
        });
    });
});
//[{"LatitudeDegrees":["42.27929210662842"],"LongitudeDegrees":["-83.74139869213104"]},{"LatitudeDegrees":["42.27929210662842"],"LongitudeDegrees":["-83.74139869213104"]},{"LatitudeDegrees":["42.27932417392731"],"LongitudeDegrees":["-83.7414619922638"]},{"LatitudeDegrees":["42.27933394908905"],"LongitudeDegrees":["-83.74141204357147"]},{"LatitudeDegrees":["42.27934467792511"],"LongitudeDegrees":["-83.74142444133759"]},{"LatitudeDegrees":["42.27934646606445"],"LongitudeDegrees":["-83.7414186000824"]},{"LatitudeDegrees":["42.27933609485626"],"Lo

module.exports = router;




