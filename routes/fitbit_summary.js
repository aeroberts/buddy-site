var fs = require('fs');
var mustache = require('mustache');
var Promise = require('promise');
var moment = require('moment');
var request = require('request');
var express = require('express');
var router = express.Router();

function Activity(duration, name, heartRate, calories, logId, startTime, steps, tcxLink, actNum) {
    this.duration = duration;
    this.name = name;
    this.heartRate = heartRate;
    this.calories = calories;
    this.logId = logId;
    this.startTime = moment(startTime, "YYYY-MM-DDTHH:mm:ss:SSS-ZZ").format("MMMM DD, h:MMa");
    this.steps = steps;
    this.tcxLink = tcxLink;
    this.actNum = actNum;
}

function fetchTCX(tcxLink, logId, ACCESS_TOKEN) {
    return new Promise(function (resolve, reject)  {
        fs.stat('tcx/'+logId+'.tcx', function(err) {
            if(err == null) {
                console.log("File Exists");
                resolve()
            }
        });

        request({
            url: tcxLink,
            method: 'GET',
            headers: {
                Authorization: "Bearer " + ACCESS_TOKEN
            },
            json: true
        }, function(error, response, body) {
            if (error) {
                reject();
            }
            fs.writeFile("tcx/"+logId+".tcx", body, function(err) {
                if (err) {
                    console.error(err);
                }
                resolve();
            });
        });
    });

}


/* Handles Auth Code response from fitbit */
router.get('/', function(req, res, next) {
    var templateFetch = new Promise(function(resolve, reject) {
        fs.readFile("templates/fitbit_summary.mustache", 'utf8', function(err, data) {
            if (err) { reject(err); }
            resolve(data);
        });
    });

    fs.readFile("tokens/auth", 'utf8', function(err, data) {
        if (err) {
            console.error(err);
        }

        var ACCESS_TOKEN = data;
        var lastWeek = moment().subtract(14, 'days');
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
                templateFetch.then(function(source) {
                    var displayActivities = [];
                    var tcxFetches = [];
                    for (actNum in body.activities) {
                        var act = body.activities[actNum];
                        var displayAct = new Activity(
                            act.activeDuration,
                            act.activityName,
                            act.averageHeartRate,
                            act.calories,
                            act.logId,
                            act.startTime,
                            act.steps,
                            act.tcxLink,
                            act.actNum = actNum
                        );
                        displayActivities.push(displayAct);
                        tcxFetches.push(fetchTCX(act.tcxLink, act.logId, ACCESS_TOKEN));
                    }


                    Promise.all(tcxFetches).then(console.log("\n\n========Done=======\n\n"));

                    var html = mustache.render(source, {activities: displayActivities});
                    console.log(html)
                    res.send(html);
                });
            }
        });
    });
});

module.exports = router;




