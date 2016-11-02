/**
 * Created by Sky on 2016/11/1.
 */
var fs = require('fs');

/**
 * 读取状态枚举
 * @type {{client: number, server: number}}
 */
var stateEnum = {
    client: 0, //前端代码
    server: 1 //后端代码
};

/**
 * 文本类型枚举
 * @type {{html: number, expression: number, script: number}}
 */
var modeEnum = {
    html: 0, //html代码
    expression: 1, //js表达式
    script: 2 //块状js代码
};

/**
 * 模型对象，存储parse需要用到的一些值
 * @type {{source: string, position: number, state: number}}
 */
var parseModel = {
    source: '', //要解析的源码
    position: 0, //当前处理的位置
    state: stateEnum.client, //读取状态
    block: false, //是否块状代码
    brace: 0 //左大括号计数器
};

/**
 * 从当前位置开始读取指定长度字符
 * @returns {string}
 */
var readNextChars = function (len) {
    len = len || 1;
    return parseModel.source.substr(parseModel.position, len);
};

/**
 * 从当前位置开始读取，直到碰到指定的字符为止
 * @param untilChars
 * @returns {*}
 */
var readUntil = function (untilChars) {
    untilChars = untilChars || [];
    var len = parseModel.source.length,
        char,
        hasBrace = false,
        result = '';
    if (parseModel.position >= len) {
        return undefined;
    }
    for (; parseModel.position < len; parseModel.position++) {
        char = parseModel.source.substr(parseModel.position, 1);
        if (untilChars.indexOf(char) > -1) {
            break;
        }
        if(parseModel.state === stateEnum.server && char === '@'){
            continue;
        }
        result += char;
        if (parseModel.block) {
            if (char === '{') {
                parseModel.brace++;
                hasBrace = true;
            } else if (char === '}') {
                parseModel.brace--;
                if(parseModel.brace === 0 && readNextChars(5) === '}else'){
                    hasBrace = false;
                }
            }

            if (hasBrace && parseModel.brace === 0) {
                parseModel.position++;
                break;
            }
        }
    }
    return result;
};

/**
 * 读取前端代码
 * 规则：'@'符号之前的代码一定是前端代码
 * 举例：源码：<div class="@clsName"></div> 提取：<div class="
 * @returns {*}
 */
var readClientCode = function () {
    var symbols = ['@'];
    if (parseModel.block) {
        symbols.push('}');
    }
    var result = readUntil(symbols);
    parseModel.state = stateEnum.server; //准备进入后端读取模式
    return result;
};

/**
 * 读取行内后端代码
 * 规则：'@'符号之后、空格或者'<'之前的代码一定是后端代码
 * 举例：源码：<span>@score.toString()</span> 提取：score.toString()
 * @returns {*}
 */
var readLineServerCode = function () {
    var result = readUntil([' ', '<', '"', "'"]);
    parseModel.state = stateEnum.client; //准备进入前端读取模式
    return result;
};

/**
 * 读取块状后端代码
 * 规则：'@{...}'内部的、'<'之前的代码一定是后端代码
 * 举例：源码：@{var a = 1; <div></div>} 提取：var a = 1;
 * @returns {*}
 */
var readBlockServerCode = function () {
    var result = readUntil(['<']);
    parseModel.state = stateEnum.client; //准备进入前端读取模式
    return result;
};

/**
 * 读取相匹配的符号（如()、{}）内的代码
 * @param startChar
 * @param endChar
 * @returns {*}
 */
var readMatchedCode = function (startChar, endChar) {
    var flag = 0,
        result = '',
        char = '';
    while (parseModel.position < parseModel.source.length) {
        char = parseModel.source.substr(parseModel.position, 1);
        if (char === startChar) {
            flag++;
        } else if (char === endChar) {
            flag--;
        }
        result += char;
        if (flag === 0) {
            break;
        }
        parseModel.position++;
    }
    parseModel.state = stateEnum.client;
    parseModel.position++;
    if (flag !== 0) {
        console.error('格式错误：' + startChar + ' ' + endChar + '不匹配！');
    }
    return result;
};

var parse = function () {
    var contentModel = [],
        code,
        nextChar;
    while (parseModel.position < parseModel.source.length) {
        if (parseModel.block && parseModel.brace === 0) {
            parseModel.block = false;
        }
        if (parseModel.state === stateEnum.client) {
            code = readClientCode();
            contentModel.push({
                data: code,
                type: modeEnum.html
            });
        } else {
            nextChar = readNextChars();
            //跳过@符号
            if (nextChar === '@') {
                parseModel.position++;
            }
            nextChar = readNextChars();
            if (nextChar === '(') {
                code = readMatchedCode('(', ')');
                contentModel.push({
                    data: code,
                    type: modeEnum.expression
                });
            } else if (nextChar === '{') {
                parseModel.block = true;
                code = readBlockServerCode();
                contentModel.push({
                    data: code,
                    type: modeEnum.script
                });
            } else if (nextChar === '}') {
                code = readBlockServerCode();
                contentModel.push({
                    data: code,
                    type: modeEnum.script
                });

            } else if ((nextChar === 'i' && readNextChars(2) === 'if')
                || (nextChar === 'f' && readNextChars(3) === 'for')
                || (nextChar === 'w' && readNextChars(5) === 'while')
                || (nextChar === 'd' && readNextChars(2) === 'do')
                || (nextChar === 's' && readNextChars(6) === 'switch')) {
                parseModel.block = true;
                code = readBlockServerCode();
                contentModel.push({
                    data: code,
                    type: modeEnum.script
                });
            } else if (nextChar === '@') {
                parseModel.position++;
                parseModel.state = stateEnum.client; //准备进入前端读取模式
                contentModel.push({
                    data: '@',
                    type: modeEnum.html
                });
            } else {
                code = readLineServerCode();
                contentModel.push({
                    data: code,
                    type: modeEnum.expression
                });
            }
        }
    }
    console.log(parseModel.position, parseModel.source.length);
    console.log(contentModel)
};

var source = fs.readFileSync('demo/index.html').toString('utf8');
parseModel.source = source;
parse(source);
