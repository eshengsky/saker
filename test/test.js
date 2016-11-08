/**
 * Created by Sky on 2016/11/8.
 */
'use strict';
var assert = require('assert'),
    saber = require('../saber'),
    actual,
    expected;

describe('saber解析测试', function() {
    it('空文档直接返回空字符串', function() {
        actual = saber.compile('');
        expected = '';
        assert.equal(actual, expected);
    });

    it('只存在HTML标签，则返回该HTML标签', function() {
        actual = saber.compile('<div></div>');
        expected = '<div></div>';
        assert.equal(actual, expected);
    });

    it('只存在纯文本，则返回该纯文本', function() {
        actual = saber.compile('hello\r\nworld!');
        expected = 'hello\r\nworld!';
        assert.equal(actual, expected);
    });

    it('包含特殊字符的HTML内容', function() {
        actual = saber.compile('1 > 0 and 0 < 1 is a fact!');
        expected = '1 > 0 and 0 < 1 is a fact!';
        assert.equal(actual, expected);
    });

    it('只包含后端脚本', function() {
        actual = saber.compile('@{var a = 0;}');
        expected = '';
        assert.equal(actual, expected);
    });

    it('作为标签属性', function() {
        actual = saber.compile('<div class="@clsName"></div>', {clsName: 'active'});
        expected = '<div class="active"></div>';
        assert.equal(actual, expected);
    });

    it('作为标签属性，后面跟空格', function() {
        actual = saber.compile('<div class="@clsName red"></div>', {clsName: 'active'});
        expected = '<div class="active red"></div>';
        assert.equal(actual, expected);
    });

    it('作为标签属性，包含点号', function() {
        actual = saber.compile('<div class="@obj.name red"></div>', {obj: {name: 'active'}});
        expected = '<div class="active red"></div>';
        assert.equal(actual, expected);
    });

    it('字符串中包含<号', function() {
        actual = saber.compile('@{var a = "a<b";}<div class="@a"></div>');
        expected = '<div class="a<b"></div>';
        assert.equal(actual, expected);
    });
});