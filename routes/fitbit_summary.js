let fs = require('fs');
let mustache = require('mustache');
let Promise = require('promise');
let moment = require('moment');
let request = require('request');
let express = require('express');
let timeHelpers = require('../helpers/timeHelpers');
let router = express.Router();

function Activity(duration, name, heartRate, calories, logId, startTime, steps, tcxLink, actNum) {
    this.duration = timeHelpers.hhmmss(parseInt(duration)/1000);
    this.name = name;
    this.averageHeartRate = heartRate;
    this.calories = calories;
    this.logId = logId;
    this.startTime = moment(startTime, "YYYY-MM-DDTHH:mm:ss:SSS-ZZ").format("MMMM DD, h:MMa");
    this.steps = steps;
    this.tcxLink = tcxLink;
    this.actNum = actNum;
}

function activityRequestProperties(lastWeekStr, ACCESS_TOKEN) {
    this.url = "https://api.fitbit.com/1/user/-/activities/list.json?afterDate="+lastWeekStr+"&sort=desc&offset=0&limit=5";
    this.method = 'GET';
    this.headers = {
        Authorization: 'Bearer ' + ACCESS_TOKEN
    };
    this.json = true;
}

function tcxLinkRequestProperties(tcxLink, ACCESS_TOKEN) {
    this.url = tcxLink;
    this.methods = 'GET';
    this.headers = {
        Authorization: 'Bearer ' + ACCESS_TOKEN
    };
    this.json = true;
}

function fetchTCX(tcxLink, logId, ACCESS_TOKEN) {
    return new Promise((resolve, reject) => {
        fs.stat('tcx/'+logId+'.tcx', (err) => {
            if(err === null) {
                resolve()
            }
        });

        request(new tcxLinkRequestProperties(tcxLink, ACCESS_TOKEN), (error, response, body) => {
            if (error) {
                console.error(error);
                reject(error);
            }
            fs.writeFile("tcx/"+logId+".tcx", body, (err) => {
                if (err) {
                    console.error(err);
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    });

}

/* Handles Auth Code response from fitbit */
router.get('/', (req, res) => {
    let templateFetch = new Promise((resolve, reject) => {
        fs.readFile("templates/fitbit_summary.mustache", 'utf8', (err, data) => {
            if (err) { reject(err); }
            resolve(data);
        });
    });

    fs.readFile("tokens/auth", 'utf8', (err, data) => {
        if (err) {
            console.error(err);
        }

        const ACCESS_TOKEN = data;
        let lastWeekStr = moment().subtract(14, 'days').format("YYYY-MM-DD");

        request(new activityRequestProperties(lastWeekStr, ACCESS_TOKEN), (error, response, body) => {
            if (error) {
                console.error(error);
                res.status(400);
                res.send({error: error});
            }

            templateFetch.then((source) => {
                let displayActivities = [];
                let tcxFetches = [];
                for (actNum in body.activities) {
                    let act = body.activities[actNum];
                    let displayAct = new Activity(
                        act.activeDuration,
                        act.activityName,
                        act.averageHeartRate,
                        act.calories,
                        act.logId,
                        act.startTime,
                        act.steps,
                        act.tcxLink,
                        actNum
                    );
                    displayActivities.push(displayAct);
                    tcxFetches.push(fetchTCX(act.tcxLink, act.logId, ACCESS_TOKEN));
                }

                let html = mustache.render(source, {activities: displayActivities});
                res.send(html);
            });
        });
    });
});

module.exports = router;




