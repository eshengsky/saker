/**
 * Created by Sky on 2016/11/8.
 */
'use strict';
var assert = require('assert'),
    saker = require('../saker');

describe('【saker解析测试用例。saker analysis test cases.】', function () {
    describe('简单情况。Simple cases.', function () {
        it('空字符串。Empty string.', function () {
            var expected = '';
            saker.compile('')(function (err, actual) {
                assert.equal(actual, expected);
            });
        });

        it('只存在HTML标签。Exists only html.', function () {
            var expected = '<div></div>';
            saker.compile('<div></div>')(function (err, actual) {
                assert.equal(actual, expected);
            });
        });

        it('只存在纯文本。Exists only plain text.', function () {
            var expected = 'hello\r\nworld!';
            saker.compile('hello\r\nworld!')(function (err, actual) {
                assert.equal(actual, expected);
            });
        });

        it('只存在脚本代码。Exists only scripts.', function () {
            var expected = 'Sky';
            saker.compile('@name')({
                name: 'Sky'
            }, function (err, actual) {
                assert.equal(actual, expected);
            });
        });
    });

    describe('作为标签属性。As property reference.', function () {
        it('不包含在引号内。Not included in quotation marks.', function () {
            var expected = '<div class=active></div>';
            saker.compile('<div class=@clsName></div>')({
                clsName: 'active'
            }, function (err, actual) {
                assert.equal(actual, expected);
            });
        });

        it('包含在引号内。Included in quotation marks.', function () {
            var expected = '<div class="active"></div>';
            saker.compile('<div class="@clsName"></div>')({
                clsName: 'active'
            }, function (err, actual) {
                assert.equal(actual, expected);
            });
        });

        it('包含点号。Included dot.', function () {
            var expected = '<div class="active red"></div>';
            saker.compile('<div class="@obj.name red"></div>')({
                obj: {name: 'active'}
            }, function (err, actual) {
                assert.equal(actual, expected);
            });
        });

        it('包含小括号。Included brackets.', function () {
            var expected = '<div class="active,blue"></div>';
            saker.compile('<div class="@arr.toString()"></div>')({
                arr: ['active', 'blue']
            }, function (err, actual) {
                assert.equal(actual, expected);
            });
        });

        it('包含方括号。Included square brackets.', function () {
            var expected = '<div class="active"></div>';
            saker.compile('<div class="@arr[0]"></div>')({
                arr: ['active', 'blue']
            }, function (err, actual) {
                assert.equal(actual, expected);
            });
        });

        it('包含有空格。Included whitespace.', function () {
            var expected = '<div class="active blue red"></div>';
            saker.compile('<div class="@arr.join(\" \") red"></div>')({
                arr: ['active', 'blue']
            }, function (err, actual) {
                assert.equal(actual, expected);
            });
        });

        it('后面跟空格。Followed by whitespace', function () {
            var expected = '<div class="active red"></div>';
            saker.compile('<div class="@clsName red"></div>')({
                clsName: 'active'
            }, function (err, actual) {
                assert.equal(actual, expected);
            });
        });

        it('后面跟反斜杠。Followed by \\', function () {
            var expected = '<div class="active\\a"></div>';
            saker.compile('<div class="@clsName\\a"></div>')({
                clsName: 'active'
            }, function (err, actual) {
                assert.equal(actual, expected);
            });
        });

        it('后面跟斜杠。Followed by /', function () {
            var expected = '<a href="example.com/test.html"></a>';
            saker.compile('<a href="@baseUrl/test.html"></a>')({
                baseUrl: 'example.com'
            }, function (err, actual) {
                assert.equal(actual, expected);
            });
        });

        it('小括号后面为空格。After brackets is whitespace.', function () {
            var expected = '<div class="active,blue red"></div>';
            saker.compile('<div class="@arr.toString() red"></div>')({
                arr: ['active', 'blue']
            }, function (err, actual) {
                assert.equal(actual, expected);
            });
        });

        it('小括号后面为普通字符。After brackets is word character.', function () {
            var expected = '<div class="active,bluered"></div>';
            saker.compile('<div class="@arr.toString()red"></div>')({
                arr: ['active', 'blue']
            }, function (err, actual) {
                assert.equal(actual, expected);
            });
        });

        it('小括号后面为脚本字符。After brackets is script character.', function () {
            var expected = '<div class="Sky"></div>';
            saker.compile('<div class="@names.split(\',\')[0]"></div>')({
                names: 'Sky,Kathy'
            }, function (err, actual) {
                assert.equal(actual, expected);
            });
        });
    });

    describe('特殊字符的处理。Special characters process.', function () {
        it('HTML中包含特殊字符。Exists special characters in HTML.', function () {
            var expected = '1 > 0 and 0 < 1 is a fact!';
            saker.compile('1 > 0 and 0 < 1 is a fact!')(function (err, actual) {
                assert.equal(actual, expected);
            });
        });

        it('脚本字符串中包含特殊字符。Exists special characters in script string.', function () {
            var expected = '<div class="a<b"></div>';
            saker.compile('@{var a = "a<b";}<div class="@a"></div>')(function (err, actual) {
                assert.equal(actual, expected);
            });
        });
    });


});