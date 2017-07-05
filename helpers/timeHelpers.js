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

exports.pad = pad;
exports.hhmmss = hhmmss;
