var express = require('express');
var router = express.Router();

router.get('/', function (req, res) {
    var model = {
        code: 1,
        data: [{
            id: 1,
            name: "Sky",
            gender: "male"
        }, {
            id: 2,
            name: "Kathy",
            gender: "female"
        }]
    };
    res.render('index', model);
});

module.exports = router;