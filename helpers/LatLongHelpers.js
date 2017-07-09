/**
 * Created by aerobs on 7/8/17.
 */

function generateLatLong(trackPoint) {
    let lat = trackPoint["LatitudeDegrees"][0];
    let long = trackPoint["LongitudeDegrees"][0];
    return [long, lat];
}

exports.generateLatLong = generateLatLong;
