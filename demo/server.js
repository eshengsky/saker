var http = require('http'),
    url = require('url'),
    saber = require('../saber');

var server = http.createServer(function (req, res) {
    var path = url.parse(req.url).pathname;
    if(path === '/'){
        saber.render(res, './demo/index.html', {
            code: 1,
            data: [{
                name: 'Jack',
                age: 20
            },{
                name: 'Kathy',
                age: 18
            }]
        });
    }else{
        res.writeHead(404);
        res.end('404 Not Found!');
    }
});
server.listen(8001);
console.info('Server is running on 8001 port, you can visit it with http://localhost:8001/');