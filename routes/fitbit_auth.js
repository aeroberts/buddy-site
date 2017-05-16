var fs = require('fs');
var request = require('request');
var express = require('express');
var router = express.Router();

var CLIENT_ID = "228HQS";
var CLIENT_SECRET = "2cd339823caf59087c49ebd9b41c4c99";

/* Handles Auth Code response from fitbit */
router.get('/', function(req, res, next) {
    var options = {
        url: 'https://api.fitbit.com/oauth2/token',
        method: 'POST',
        headers: {
            Authorization: 'Basic ' + new Buffer(CLIENT_ID + ":" + CLIENT_SECRET).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        form: {
            clientId: CLIENT_ID,
            redirect_uri: "https://9ff02d0c.ngrok.io/fitbit_auth",
            grant_type: "authorization_code",
            code: req.query.code
        }
    };

    request(options, function(error, response, body) {
        var parsedBody = JSON.parse(body);
        var auth_token = parsedBody.access_token;
        var refresh_token = parsedBody.access_token;

        fs.write("../tokens/auth", auth_token, function(err) {
            console.log("Error writing auth token to file");
            console.error(err);
        });
        fs.write("../tokens/refresh", refresh_token, function(err) {
            console.log("Error writing refresh token to file");
            console.error(err);
        });

        res.redirect("/");
    });


});

module.exports = router;
