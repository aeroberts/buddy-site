let fs = require('fs');
let request = require('request');
let express = require('express');
let router = express.Router();

let CLIENT_ID = "228HQS";
let CLIENT_SECRET = "2cd339823caf59087c49ebd9b41c4c99";

/* Handles Auth Code response from fitbit */
router.get('/', (req, res) => {
    let options = {
        url: 'https://api.fitbit.com/oauth2/token',
        method: 'POST',
        headers: {
            Authorization: 'Basic ' + new Buffer(CLIENT_ID + ":" + CLIENT_SECRET).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        form: {
            clientId: CLIENT_ID,
            redirect_uri: "https://7ba35365.ngrok.io/fitbit_auth",
            grant_type: "authorization_code",
            code: req.query.code
        }
    };

    request(options, (error, response, body) => {
        let parsedBody = JSON.parse(body);
        let auth_token = parsedBody.access_token;
        let refresh_token = parsedBody.refresh_token;

        fs.writeFile("tokens/auth", auth_token, (err) => {
            if (err) {
                console.log("Error writing auth token to file");
                console.error(err);
            }
        });
        fs.writeFile("tokens/refresh", refresh_token, (err) => {
            if (err) {
                console.log("Error writing refresh token to file");
                console.error(err);
            }
        });

        res.redirect("/");
    });


});

module.exports = router;
