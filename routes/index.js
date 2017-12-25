var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

// POST method route
router.post('/sendmessage', function (req, res) {
	console.log('sendmessage', req.body);
  res.send(null);
})

router.post('/startmonitor', function (req, res) {
	console.log('startmonitor', req.body);
  res.send(null);
})

router.post('/stopmonitor', function (req, res) {
	console.log('stopmonitor', req.body);
  res.send(null);
})

module.exports = router;
