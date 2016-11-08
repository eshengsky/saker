/**
 * Created by Sky on 2016/11/1.
 */
var fs = require('fs');

(function () {
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
     * @type {{markup: number, expression: number, script: number}}
     */
    var modeEnum = {
        markup: 0, //html标记
        expression: 1, //js表达式
        script: 2 //块状js代码
    };

    /**
     * @后面所跟 '{' 的类型
     * @type {{other: number, if: number, for: number, while: number, do: number, switch: number}}
     */
    var bracesEnum = {
        noAt: 0, //不带@的'{'
        atIf: 1, //@if 特殊：可能有else if{...}else{...}
        atFor: 2, //@for
        atWhile: 3, //@while
        atDo: 4, //@do 特殊：可能有while
        atSwitch: 5, //@switch
        atTry: 6, //@try　特殊：可能有catch{...}finally{...}
        atOther: 10 //@{...}等
    };

    /**
     * @后面所跟 '(' 的类型
     * @type {{noAt: number, withAt: number}}
     */
    var bracketsEnum = {
        noAt: 0, //不带@的'('
        withAt: 1 //带@的'('
    };

    /**
     * 模型对象，存储parse需要用到的一些值
     * @type {{source: string, position: number, state: number}}
     */
    var parseModel = {
        source: '', //要解析的源码
        position: 0, //当前处理的位置
        state: stateEnum.client, //当前读取状态
        quotes: [], //引号计数器，规则：当遇到了引号，且引号之前不是'\'时，若数组末尾元素与其相同，则弹出，若不同，则插入
        braces: [], //左大括号计数器，规则：遇到 '@{' push，遇到 '}' pop，push类型：{type: blockEnum.xxx, position: xxx}
        brackets: [] //左小括号计数器，规则：遇到 '(' push，遇到 ')' pop，push类型：当前位置数值position
    };

    /**
     * 代码语句处理类
     * @constructor
     */
    var ContentHandler = function () {
        this.segments = [];
    };

    ContentHandler.prototype = {
        /**
         * 特殊字符转义
         * @param str
         * @returns {string|XML}
         */
        escape: function (str) {
            return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '\\r').replace(/\n/g, '\\n');

        },

        /**
         * 添加语句片段
         * @param obj
         */
        addSegment: function (obj) {
            if(obj.data){
                switch (obj.type) {
                    case 0:
                        this.segments.push('writeLiteral("' + this.escape(obj.data) + '");');
                        break;
                    case 1:
                        this.segments.push('write(' + obj.data + ');');
                        break;
                    case 2:
                        this.segments.push(obj.data);
                        break;
                }
            }
        },

        /**
         * 获取生成的代码字符串
         * @returns {string}
         */
        getContent: function () {
            return this.segments.join('\r\n');
        }
    };

    /**
     * 获取当前所在的行号、列号、该行的上一行和下两行
     * @returns {{row: Number, col: *, source: Array}}
     */
    var getLineNum = function () {
        var lines = parseModel.source.substring(0, parseModel.position).split(/\r?\n/),
            row = lines.length,
            col = lines.pop().length + 1,
            allLines = parseModel.source.split(/\r?\n/),
            source = [];
        for (var i = -2; i < 2; i++) {
            if (allLines[row + i]) {
                source.push({
                    row: row + i + 1,
                    code: allLines[row + i]
                })
            }
        }
        return {
            row: row,
            col: col,
            source: source
        }
    };

    /**
     * 从当前位置开始读取指定长度字符
     * @returns {string}
     */
    var readNextChars = function (len) {
        var result = '';
        if (len) {
            result = parseModel.source.substr(parseModel.position, len);
        } else {
            result = parseModel.source.substr(parseModel.position);
        }
        return result;
    };

    /**
     * 读取前一个字符
     * @returns {string}
     */
    var readPrevChars = function (len) {
        var result = '';
        if (len) {
            result = parseModel.source.slice(parseModel.position - len, parseModel.position);
        } else {
            result = parseModel.source.substr(0, parseModel.position);
        }
        return result;
    };

    /**
     * 读取前端标记代码
     * @returns {*}
     */
    var readMarkup = function () {
        var len = parseModel.source.length,
            char,
            matched,
            result = '';
        if (parseModel.position >= len) {
            return undefined;
        }
        for (; parseModel.position < len; parseModel.position++) {
            char = readNextChars(1);
            //读到 '@' 就停止，因为 '@' 后面的必定是脚本代码
            if (char === '@') {
                break;
            }
            //读到 '<' 则需要再判断下：1.是否处于代码块内部；2.接来下的标签是否是闭合标签
            if (char === '<' && parseModel.braces.length > 0 && /^(?:<\/[a-zA-Z0-9]+\s*>)|^(?:<((br)|(hr)|(img)|(input)|(link)|(meta)|(area)|(base)|(col)|(command)|(embed)|(keygen)|(param)|(source)|(track)|(wbr))[\s\S]*?>)/.test(readNextChars())) {
                matched = readNextChars().match(/^(?:<\/[a-zA-Z0-9]+\s*>)|^(?:<((br)|(hr)|(img)|(input)|(link)|(meta)|(area)|(base)|(col)|(command)|(embed)|(keygen)|(param)|(source)|(track)|(wbr))[\s\S]*?>)/);
                result += matched[0];
                parseModel.position += matched[0].length;
                break;
            }
            result += char;
        }
        parseModel.state = stateEnum.server; //准备进入后端读取模式
        return result;
    };

    /**
     * 读取行内后端代码
     * @returns {*}
     */
    var readLineServerCode = function () {
        var len = parseModel.source.length,
            char,
            result = '';
        if (parseModel.position >= len) {
            return undefined;
        }
        for (; parseModel.position < len; parseModel.position++) {
            char = parseModel.source.substr(parseModel.position, 1);
            if ([' ', '<', '"', "'"].indexOf(char) > -1) {
                break;
            }
            result += char;
        }
        parseModel.state = stateEnum.client; //准备进入前端读取模式
        return result;
    };

    /**
     * 读取块状后端代码
     * @returns {*}
     */
    var readBlockServerCode = function () {
        var len = parseModel.source.length,
            char,
            braceState,
            matched,
            result = '';
        if (parseModel.position >= len) {
            return undefined;
        }
        for (; parseModel.position < len; parseModel.position++) {
            char = readNextChars(1);
            if (char === '@') {
                console.warn('在代码内部，请直接写脚本，不需要加上前缀“@”。');
                continue;
            }
            //如果 '<' 不在括号内部，则认为是标记语言的开始，退出循环
            if (char === '<' &&
                (parseModel.brackets.length === 0
                    || (parseModel.brackets.length > 0
                    && parseModel.brackets[parseModel.brackets.length - 1] < parseModel.braces[parseModel.braces.length - 1].position)
                )) {
                break;
            }
            if (char === '(') {
                parseModel.brackets.push(parseModel.position);
            } else if (char === ')') {
                parseModel.brackets.pop();
            }

            if (char === '{') {
                //'@{}'内部又有'@{}'，这里做下容错处理
                if (parseModel.braces[parseModel.braces.length - 1] && parseModel.braces[parseModel.braces.length - 1].state === true && readPrevChars(1) === '@') {
                    parseModel.braces.push({
                        state: false,
                        position: parseModel.position
                    });
                } else {
                    //遇到 '@{'，则插入true，否则遇到 '{'，则插入false
                    parseModel.braces.push({
                        state: readPrevChars(1) === '@',
                        position: parseModel.position
                    });
                }
            } else if (char === '}') {
                braceState = parseModel.braces.pop();
                //如果该 '}' 对应的是 '@{'
                if (braceState.state) {
                    if (/(?:^}\s*?else\s*?\{)|(?:^}\s*?else\s+if\s*?\([\s\S]+?\)\s*?\{)/.test(readNextChars())) {
                        //如果 '}' 后面是 'else {' 或者 'else if {' 或者 'while(...)'，依然识别为脚本语言，同时处理下braces
                        matched = readNextChars().match(/(?:^}\s*?else\s*?\{)|(?:^}\s*?else\s+if\s*?\([\s\S]+?\)\s*?\{)/);
                        result += matched[0];
                        parseModel.position += matched[0].length;
                        parseModel.braces.push({
                            state: true,
                            position: parseModel.position
                        });
                        continue;
                    } else if (/^}\s*?while\s*?\([\s\S]+?\)/.test(readNextChars())) {
                        //如果 '}' 后面是 'while(...)'，依然识别为脚本语言
                        matched = readNextChars().match(/^}\s*?while\s*?\([\s\S]+?\)/);
                        result += matched[0];
                        parseModel.position += matched[0].length;
                        continue;
                    } else {
                        //否则停止循环，启动标记语言读取模式
                        result += char;
                        parseModel.position++;
                        break;
                    }
                }
            }
            result += char;
        }

        parseModel.state = stateEnum.client; //准备进入前端读取模式
        return result;
    };

    /**
     * 读取(...)内的代码
     * @returns {*}
     */
    var readBracketCode = function () {
        var flag = 0,
            result = '',
            char = '';
        while (parseModel.position < parseModel.source.length) {
            char = parseModel.source.substr(parseModel.position, 1);
            if (char === '(') {
                flag++;
            } else if (char === ')') {
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
            console.error('格式错误："(" 找不到相匹配的 ")" ！');
        }
        return result;
    };

    /**
     * 模板字符串解析
     * @param template
     * @returns {ContentHandler}
     */
    var parse = function (template) {
        var code,
            nextChar,
            matchedText,
            contentHandler = new ContentHandler();
        parseModel.source = template;
        parseModel.position = 0;
        parseModel.state = stateEnum.client;
        parseModel.braces = [];
        parseModel.brackets = [];
        while (parseModel.position < parseModel.source.length) {
            if (parseModel.state === stateEnum.client) {
                code = readMarkup();
                contentHandler.addSegment({
                    data: code,
                    type: modeEnum.markup
                });
            } else {
                nextChar = readNextChars(1);
                //跳过@符号
                if (nextChar === '@') {
                    parseModel.position++;
                    nextChar = readNextChars(1);
                    if (nextChar === '(') {
                        code = readBracketCode();
                        contentHandler.addSegment({
                            data: code,
                            type: modeEnum.expression
                        });
                    } else if (nextChar === '{') {
                        code = readBlockServerCode();
                        contentHandler.addSegment({
                            data: code,
                            type: modeEnum.script
                        });
                    } else if (nextChar === 'i' && readNextChars(2) === 'if' && /^if\s*?\([\s\S]+?\)\s*\{/.test(readNextChars())) {
                        matchedText = readNextChars().match(/^if\s*?\([\s\S]+?\)\s*\{/)[0];
                        parseModel.position += matchedText.length;
                        parseModel.braces.push({
                            state: true,
                            position: parseModel.position
                        });
                        code = readBlockServerCode();
                        contentHandler.addSegment({
                            data: matchedText + code,
                            type: modeEnum.script
                        });
                    } else if (nextChar === 'f' && readNextChars(3) === 'for' && /^for\s*?\([\s\S]+?\)\s*\{/.test(readNextChars())) {
                        matchedText = readNextChars().match(/^for\s*?\([\s\S]+?\)\s*\{/)[0];
                        parseModel.position += matchedText.length;
                        parseModel.braces.push({
                            state: true,
                            position: parseModel.position
                        });
                        code = readBlockServerCode();
                        contentHandler.addSegment({
                            data: matchedText + code,
                            type: modeEnum.script
                        });
                    } else if (nextChar === 'w' && readNextChars(5) === 'while' && /^while\s*?\([\s\S]+?\)\s*\{/.test(readNextChars())) {
                        matchedText = readNextChars().match(/^while\s*?\([\s\S]+?\)\s*\{/)[0];
                        parseModel.position += matchedText.length;
                        parseModel.braces.push({
                            state: true,
                            position: parseModel.position
                        });
                        code = readBlockServerCode();
                        contentHandler.addSegment({
                            data: matchedText + code,
                            type: modeEnum.script
                        });
                    } else if (nextChar === 'd' && readNextChars(2) === 'do' && /^do\s*?\{/.test(readNextChars())) {
                        matchedText = readNextChars().match(/^do\s*?\{/)[0];
                        parseModel.position += matchedText.length;
                        parseModel.braces.push({
                            state: true,
                            position: parseModel.position
                        });
                        code = readBlockServerCode();
                        contentHandler.addSegment({
                            data: matchedText + code,
                            type: modeEnum.script
                        });
                    } else if (nextChar === 's' && readNextChars(6) === 'switch' && /^switch\s*?\([\s\S]+?\)\s*\{/.test(readNextChars())) {
                        matchedText = readNextChars().match(/^switch\s*?\([\s\S]+?\)\s*\{/)[0];
                        parseModel.position += matchedText.length;
                        parseModel.braces.push({
                            state: true,
                            position: parseModel.position
                        });
                        code = readBlockServerCode();
                        contentHandler.addSegment({
                            data: matchedText + code,
                            type: modeEnum.script
                        });
                    } else if (nextChar === '@') {
                        parseModel.position++;
                        parseModel.state = stateEnum.client; //准备进入前端读取模式
                        contentHandler.addSegment({
                            data: '@',
                            type: modeEnum.markup
                        });
                    } else {
                        code = readLineServerCode();
                        contentHandler.addSegment({
                            data: code,
                            type: modeEnum.expression
                        });
                    }
                } else {
                    code = readBlockServerCode();
                    contentHandler.addSegment({
                        data: code,
                        type: modeEnum.script
                    });
                }
            }
        }
        return contentHandler;
    };

    var saber = {
        /**
         * 根据视图文件路径获取文件
         * @param filePath
         * @param cb
         */
        getView: function (filePath, cb) {
            fs.readFile(filePath, function (err, data) {
                if (err) {
                    cb(err);
                } else {
                    cb(null, data.toString('utf8'));
                }
            })
        },

        /**
         * 根据给定模板字符串和视图模型编译生成最终html
         * @param template
         * @param model
         * @param cb
         */
        compile: function (template, model, cb) {
            try {
                var contentHandler = parse(template);
                var content = contentHandler.getContent();
                console.log(content);
                var fn = '';
                var variables = '';
                if (typeof model === 'object') {
                    Object.keys(model).forEach(function (item) {
                        variables += 'var ' + item + ' = model.' + item + ';';
                    })
                }
                fn += variables;
                fn += 'var $$$saber_data$$$ = [], writeLiteral = function(code) { $$$saber_data$$$.push(code); }, write = function(code){ writeLiteral((code)); };';
                fn += content;
                fn += ';return $$$saber_data$$$.join("");';
                var html = (new Function('model', fn)(model));
                if(typeof cb === 'function'){
                    cb(null, html);
                }else{
                    return html;
                }
            } catch (e) {
                if(typeof cb === 'function'){
                    cb(e);
                }else{
                    return e.stack;
                }
            }
        },

        /**
         * 编译指定文件并输出响应
         * @param res
         * @param filePath
         * @param model
         */
        render: function (res, filePath, model) {
            var that = this;
            this.getView(filePath, function (err, template) {
                if (err) {
                    res.writeHead(500, {'Content-Type': 'text/html'});
                    res.end(err.stack);
                } else {
                    that.compile(template, model, function (err, html) {
                        if (err) {
                            res.writeHead(500, {'Content-Type': 'text/html'});
                            res.end(err.stack);
                        } else {
                            res.writeHead(200, {'Content-Type': 'text/html'});
                            res.end(html);
                        }
                    })
                }
            })
        }
    };

    module.exports = saber;
})();