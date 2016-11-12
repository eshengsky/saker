/**
 * Created by Sky on 2016/11/8.
 */
'use strict';
var assert = require('assert'),
    amber = require('../amber'),
    actual,
    expected;

describe('【amber解析测试用例。amber analysis test cases.】', function () {
    describe('简单情况。Simple cases.', function () {
        it('空字符串。Empty string.', function () {
            actual = amber.compile('');
            expected = '';
            assert.equal(actual, expected);
        });

        it('只存在HTML标签。Exists only html.', function () {
            actual = amber.compile('<div></div>');
            expected = '<div></div>';
            assert.equal(actual, expected);
        });

        it('只存在纯文本。Exists only plain text.', function () {
            actual = amber.compile('hello\r\nworld!');
            expected = 'hello\r\nworld!';
            assert.equal(actual, expected);
        });

        it('只存在脚本代码。Exists only scripts.', function () {
            actual = amber.compile('@name', {
                name: 'Sky'
            });
            expected = 'Sky';
            assert.equal(actual, expected);
        });
    });

    describe('作为标签属性。As property reference.', function () {
        it('不包含在引号内。Not included in quotation marks.', function () {
            actual = amber.compile('<div class=@clsName></div>', {
                clsName: 'active'
            });
            expected = '<div class=active></div>';
            assert.equal(actual, expected);
        });

        it('包含在引号内。Included in quotation marks.', function () {
            actual = amber.compile('<div class="@clsName"></div>', {
                clsName: 'active'
            });
            expected = '<div class="active"></div>';
            assert.equal(actual, expected);
        });

        it('包含点号。Included dot.', function () {
            actual = amber.compile('<div class="@obj.name red"></div>', {
                obj: {name: 'active'}
            });
            expected = '<div class="active red"></div>';
            assert.equal(actual, expected);
        });

        it('包含小括号。Included brackets.', function () {
            actual = amber.compile('<div class="@arr.toString()"></div>', {
                arr: ['active', 'blue']
            });
            expected = '<div class="active,blue"></div>';
            assert.equal(actual, expected);
        });

        it('包含方括号。Included square brackets.', function () {
            actual = amber.compile('<div class="@arr[0]"></div>', {
                arr: ['active', 'blue']
            });
            expected = '<div class="active"></div>';
            assert.equal(actual, expected);
        });

        it('包含有空格。Included whitespace.', function () {
            actual = amber.compile('<div class="@arr.join(\" \") red"></div>', {
                arr: ['active', 'blue']
            });
            expected = '<div class="active blue red"></div>';
            assert.equal(actual, expected);
        });

        it('后面跟空格。Followed by whitespace', function () {
            actual = amber.compile('<div class="@clsName red"></div>', {
                clsName: 'active'
            });
            expected = '<div class="active red"></div>';
            assert.equal(actual, expected);
        });

        it('后面跟反斜杠。Followed by \\', function () {
            actual = amber.compile('<div class="@clsName\\a"></div>', {
                clsName: 'active'
            });
            expected = '<div class="active\\a"></div>';
            assert.equal(actual, expected);
        });

        it('后面跟斜杠。Followed by /', function () {
            actual = amber.compile('<a href="@baseUrl/test.html"></a>', {
                baseUrl: 'example.com'
            });
            expected = '<a href="example.com/test.html"></a>';
            assert.equal(actual, expected);
        });

        it('小括号后面为空格。After brackets is whitespace.', function () {
            actual = amber.compile('<div class="@arr.toString() red"></div>', {
                arr: ['active', 'blue']
            });
            expected = '<div class="active,blue red"></div>';
            assert.equal(actual, expected);
        });

        it('小括号后面为普通字符。After brackets is word character.', function () {
            actual = amber.compile('<div class="@arr.toString()red"></div>', {
                arr: ['active', 'blue']
            });
            expected = '<div class="active,bluered"></div>';
            assert.equal(actual, expected);
        });

        it('小括号后面为脚本字符。After brackets is script character.', function () {
            actual = amber.compile('<div class="@names.split(\',\')[0]"></div>', {
                names: 'Sky,Kathy'
            });
            expected = '<div class="Sky"></div>';
            assert.equal(actual, expected);
        });
    });

    describe('特殊字符的处理。Special characters process.', function () {
        it('HTML中包含特殊字符。Exists special characters in HTML.', function () {
            actual = amber.compile('1 > 0 and 0 < 1 is a fact!');
            expected = '1 > 0 and 0 < 1 is a fact!';
            assert.equal(actual, expected);
        });

        it('脚本字符串中包含特殊字符。Exists special characters in script string.', function () {
            actual = amber.compile('@{var a = "a<b";}<div class="@a"></div>');
            expected = '<div class="a<b"></div>';
            assert.equal(actual, expected);
        });
    });


});