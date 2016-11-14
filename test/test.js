/**
 * Created by Sky on 2016/11/8.
 */
'use strict';
var assert = require('assert'),
    saker = require('../');

describe('【saker解析测试用例。saker analysis test cases.】', function () {
    describe('简单情况。Simple cases.', function () {
        it('空字符串。Empty string.', function (done) {
            var expected = '';
            saker.compile('')({
                layout: null
            }, function (err, actual) {
                if (err) return done(err);
                assert.equal(actual, expected);
                done();
            });
        });

        it('只存在HTML标签。Exists only html.', function (done) {
            var expected = '<div></div>';
            saker.compile('<div></div>')({
                layout: null
            }, function (err, actual) {
                if (err) return done(err);
                assert.equal(actual, expected);
                done();
            });
        });

        it('只存在纯文本。Exists only plain text.', function (done) {
            var expected = 'hello\r\nworld!';
            saker.compile('hello\r\nworld!')({
                layout: null
            }, function (err, actual) {
                if (err) return done(err);
                assert.equal(actual, expected);
                done();
            });
        });

        it('只存在脚本代码。Exists only scripts.', function (done) {
            var expected = 'Sky';
            saker.compile('@name')({
                name: 'Sky',
                layout: null
            }, function (err, actual) {
                if (err) return done(err);
                assert.equal(actual, expected);
                done();
            });
        });

        it('text标签的处理。Process text tag.', function (done) {
            var expected = 'hello world!';
            saker.compile('<text>hello world!</text>')({
                layout: null
            }, function (err, actual) {
                if (err) return done(err);
                assert.equal(actual, expected);
                done();
            });
        });
    });

    describe('作为标签属性。As property reference.', function () {
        it('不包含在引号内。Not included in quotation marks.', function (done) {
            var expected = '<div class=active></div>';
            saker.compile('<div class=@clsName></div>')({
                clsName: 'active',
                layout: null
            }, function (err, actual) {
                if (err) return done(err);
                assert.equal(actual, expected);
                done();
            });
        });

        it('包含在引号内。Included in quotation marks.', function (done) {
            var expected = '<div class="active"></div>';
            saker.compile('<div class="@clsName"></div>')({
                clsName: 'active',
                layout: null
            }, function (err, actual) {
                if (err) return done(err);
                assert.equal(actual, expected);
                done();
            });
        });

        it('包含点号。Included dot.', function (done) {
            var expected = '<div class="active red"></div>';
            saker.compile('<div class="@obj.name red"></div>')({
                obj: {name: 'active'},
                layout: null
            }, function (err, actual) {
                if (err) return done(err);
                assert.equal(actual, expected);
                done();
            });
        });

        it('包含小括号。Included brackets.', function (done) {
            var expected = '<div class="active,blue"></div>';
            saker.compile('<div class="@arr.toString()"></div>')({
                arr: ['active', 'blue'],
                layout: null
            }, function (err, actual) {
                if (err) return done(err);
                assert.equal(actual, expected);
                done();
            });
        });

        it('包含方括号。Included square brackets.', function (done) {
            var expected = '<div class="active"></div>';
            saker.compile('<div class="@arr[0]"></div>')({
                arr: ['active', 'blue'],
                layout: null
            }, function (err, actual) {
                if (err) return done(err);
                assert.equal(actual, expected);
                done();
            });
        });

        it('包含有空格。Included whitespace.', function (done) {
            var expected = '<div class="active blue red"></div>';
            saker.compile('<div class="@arr.join(\" \") red"></div>')({
                arr: ['active', 'blue'],
                layout: null
            }, function (err, actual) {
                if (err) return done(err);
                assert.equal(actual, expected);
                done();
            });
        });

        it('后面跟空格。Followed by whitespace', function (done) {
            var expected = '<div class="active red"></div>';
            saker.compile('<div class="@clsName red"></div>')({
                clsName: 'active',
                layout: null
            }, function (err, actual) {
                if (err) return done(err);
                assert.equal(actual, expected);
                done();
            });
        });

        it('后面跟反斜杠。Followed by \\', function (done) {
            var expected = '<div class="active\\a"></div>';
            saker.compile('<div class="@clsName\\a"></div>')({
                clsName: 'active',
                layout: null
            }, function (err, actual) {
                if (err) return done(err);
                assert.equal(actual, expected);
                done();
            });
        });

        it('后面跟斜杠。Followed by /', function (done) {
            var expected = '<a href="example.com/test.html"></a>';
            saker.compile('<a href="@baseUrl/test.html"></a>')({
                baseUrl: 'example.com',
                layout: null
            }, function (err, actual) {
                if (err) return done(err);
                assert.equal(actual, expected);
                done();
            });
        });

        it('小括号后面为空格。After brackets is whitespace.', function (done) {
            var expected = '<div class="active,blue red"></div>';
            saker.compile('<div class="@arr.toString() red"></div>')({
                arr: ['active', 'blue'],
                layout: null
            }, function (err, actual) {
                if (err) return done(err);
                assert.equal(actual, expected);
                done();
            });
        });

        it('小括号后面为普通字符。After brackets is word character.', function (done) {
            var expected = '<div class="active,bluered"></div>';
            saker.compile('<div class="@arr.toString()red"></div>')({
                arr: ['active', 'blue'],
                layout: null
            }, function (err, actual) {
                if (err) return done(err);
                assert.equal(actual, expected);
                done();
            });
        });

        it('小括号后面为脚本字符。After brackets is script character.', function (done) {
            var expected = '<div class="Sky"></div>';
            saker.compile('<div class="@names.split(\',\')[0]"></div>')({
                names: 'Sky,Kathy',
                layout: null
            }, function (err, actual) {
                if (err) return done(err);
                assert.equal(actual, expected);
                done();
            });
        });
    });

    describe('代码块处理。Code block process.', function () {
        it('后端单行注释。Server side line comment.', function (done) {
            var expected = 'other\ntext';
            saker.compile('other@//This is a line comment.\ntext')({
                layout: null
            }, function (err, actual) {
                if (err) return done(err);
                assert.equal(actual, expected);
                done();
            });
        });

        it('后端块状注释。Server side block comment.', function (done) {
            var expected = 'othertext';
            saker.compile('other@*\nThis is a block comment.\n*@text')({
                layout: null
            }, function (err, actual) {
                if (err) return done(err);
                assert.equal(actual, expected);
                done();
            });
        })
    });

    describe('特殊字符的处理。Special characters process.', function () {
        it('HTML中包含特殊字符。Exists special characters in HTML.', function (done) {
            var expected = '1 > 0 and 0 < 1 is a fact!';
            saker.compile('1 > 0 and 0 < 1 is a fact!')({
                layout: null
            }, function (err, actual) {
                if (err) return done(err);
                assert.equal(actual, expected);
                done();
            });
        });

        it('脚本字符串中包含特殊字符。Exists special characters in script string.', function (done) {
            var expected = '<div class="a&lt;b"></div>';
            saker.compile('@{var a = "a<b";}<div class="@a"></div>')({
                layout: null
            }, function (err, actual) {
                if (err) return done(err);
                assert.equal(actual, expected);
                done();
            });
        });
    });
});