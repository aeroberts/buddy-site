var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    res.redirect(
        "https://www.fitbit.com/oauth2/authorize?" +
        "response_type=code&" +
        "client_id=228HQS&" +
        "redirect_uri=https://7ba35365.ngrok.io/fitbit_auth&" +
        "scope=activity%20heartrate%20location%20nutrition%20profile"
    );

});

module.exports = router;
