var express = require('express');
var router = express.Router();

router.get('/', function (req, res) {
	var model = {
		greeting: 'Hello Saker',
		title: 'saker',
		layout: 'layout.html'
	};
	res.render('index', model);
});

module.exports = router;