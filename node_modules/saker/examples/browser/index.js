/**
 * Created by Sky on 2016/11/14.
 */

(function () {
    var template = document.querySelector('#temp').innerHTML;
    var html = saker.compile(template)({
        title: 'saker',
        data: ['Sky', 'Kathy']
    });
    document.querySelector('#container').innerHTML = html;
}());