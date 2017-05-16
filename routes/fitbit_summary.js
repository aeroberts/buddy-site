var fs = require('fs');
var moment = require('moment');
var request = require('request');
var express = require('express');
var router = express.Router();


/* Handles Auth Code response from fitbit */
router.get('/', function(req, res, next) {
    fs.readFile("tokens/auth", 'utf8', function(err, data) {
        if (err) {
            console.error(err);
        }

        var ACCESS_TOKEN = data;
        var lastWeek = moment().subtract(7, 'days');
        var lastWeekStr = lastWeek.format("YYYY-MM-DD");

        request({
            url: "https://api.fitbit.com/1/user/-/activities/list.json?afterDate="+lastWeekStr+"&sort=desc&offset=0&limit=5",
            method: 'GET',
            headers: {
                Authorization: 'Bearer ' + ACCESS_TOKEN
            },
            json: true
        }, function(error, response, body) {
            if (error) {
                console.log("Error: " + error);
            }
            else {
                console.log(body);
                res.send(body);
            }
        });
    });
});

module.exports = router;
