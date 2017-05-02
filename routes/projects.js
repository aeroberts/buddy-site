var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  console.log("HI");
  res.render('projects', { title: 'Projects - Herkenham' });
});

module.exports = router;
