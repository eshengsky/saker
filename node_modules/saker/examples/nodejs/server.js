var http = require('http'),
    url = require('url'),
    saker = require('../../');

saker.config({
    debug: true
});

var server = http.createServer(function (req, res) {
    var path = url.parse(req.url).pathname;
    if(path === '/'){
        saker.renderView('./index.html', {
            code : 1,
            data: [{
                "id" : 1,
                "name" : "Sky",
                "gender" : "male"
            }, {
                "id" : 2,
                "name" : "Kathy",
                "gender" : "female"
            }],
            title: "Saker"
        }, function (err, html) {
            if (err) {
                res.writeHead(500, {'Content-Type': 'text/html'});
                res.end(err.stack);
            } else {
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.end(html);
            }
        });
    }else{
        res.writeHead(404);
        res.end('404 Not Found!');
    }
});
server.listen(8001);
console.info('NodeJs server is running on 8001 port, you can visit it on http://localhost:8001/');