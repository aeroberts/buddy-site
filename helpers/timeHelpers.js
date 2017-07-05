let moment = require('moment');

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

exports.pad = pad;
exports.hhmmss = hhmmss;
exports.getElapsedTime = getElapsedTime;
exports.calcSplit = calcSplit;
