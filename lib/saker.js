/**
 * Created by Sky on 2016/11/1.
 */

var isNode = typeof window === 'undefined',
    fs,
    path,
    express;

if (isNode) {
    fs = require('fs');
    path = require('path');
}

(function () {
    /**
     * 配置项
     * @type {{debug: boolean, defaultLayout: string}}
     */
    var configure = {
        debug: false,
        defaultLayout: 'main.html',
        partialViewDir: './views/partials/'
    };

    /**
     * 模板读取结果缓存
     * @type {{}}
     */
    var cacheTemplate = {};

    /**
     * 模板编译结果缓存
     * @type {{}}
     */
    var cacheCompiled = {};

    /**
     * 读取状态枚举
     * @type {{client: number, server: number}}
     */
    var stateEnum = {
        //前端代码
        client: 0,

        //后端代码
        server: 1
    };

    /**
     * 文本类型枚举
     * @type {{markup: number, expression: number, script: number}}
     */
    var modeEnum = {
        //html标记
        markup: 0,

        //js表达式
        expression: 1,

        //块状js代码
        script: 2
    };

    /**
     * 引号类型枚举
     * @type {{singleQuotes: number, doubleQuotes: number}}
     */
    var quotesEnum = {
        singleQuotes: 0,
        doubleQuotes: 1
    };

    /**
     * @后面所跟 '{' 的类型枚举
     * @type {{other: number, if: number, for: number, while: number, do: number, switch: number}}
     */
    var bracesEnum = {
        //不带@的'{'
        noAt: 0,

        //@if 特殊：可能有else if{...}else{...}
        atIf: 1,

        //@for
        atFor: 2,

        //@while
        atWhile: 3,

        //@do 特殊：可能有while
        atDo: 4,

        //@switch
        atSwitch: 5,

        //@try　特殊：可能有catch{...}finally{...}
        atTry: 6,

        //@{...}等
        atOther: 10
    };

    /**
     * 解析处理器
     * @type {{source: string, position: number, state: number}}
     */
    var ParseProcessor = function (source) {
        //要解析的源码
        this.source = source;

        //当前处理的位置
        this.position = 0;

        //当前读取状态
        this.state = stateEnum.client;

        //引号计数器，规则：当遇到了引号，且引号之前不是'\'时，若数组为空则push，若数组不为空且值与它相同则pop，push类型：{type: quotesEnum.xxx, position: xxx}
        this.quotes = [];

        //左大括号计数器，规则：遇到 '{' push，遇到 '}' pop，push类型：{type: bracesEnum.xxx, position: xxx}
        this.braces = [];

        //左小括号计数器，规则：遇到 '(' push，遇到 ')' pop，push类型：position
        this.brackets = [];
    };

    ParseProcessor.prototype = {
        /**
         * 获取当前所在的行号、列号、该行的上一行和下两行
         * @returns {{row: Number, col: *, source: Array}}
         */
        getLineNum: function () {
            var lines = this.source.substring(0, this.position).split(/\r?\n/),
                row = lines.length,
                col = lines.pop().length + 1,
                allLines = this.source.split(/\r?\n/),
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
        },

        /**
         * 从当前位置开始读取指定长度字符
         * @returns {string}
         */
        readNextChars: function (len) {
            var result = '';
            if (len) {
                result = this.source.substr(this.position, len);
            } else {
                result = this.source.substr(this.position);
            }
            return result;
        },

        /**
         * 从当前位置开始向前读取指定长度字符
         * @returns {string}
         */
        readPrevChars: function (len) {
            var result = '';
            if (len) {
                result = this.source.slice(this.position - len, this.position);
            } else {
                result = this.source.substr(0, this.position);
            }
            return result;
        },

        /**
         * 读取前端标记代码
         * @returns {*}
         */
        readMarkup: function () {
            var len = this.source.length,
                char,
                matched,
                result = '';
            if (this.position >= len) {
                return undefined;
            }
            for (; this.position < len; this.position++) {
                char = this.readNextChars(1);
                //读到 '@' 就停止，因为 '@' 后面的必定是脚本代码
                if (char === '@') {
                    break;
                }
                //读到 '<' 则需要再判断下：1.是否处于代码块内部；2.接来下的标签是否是闭合标签
                if (char === '<' && this.braces.length > 0 && /^(?:<\/[a-zA-Z0-9]+\s*>)|^(?:<((br)|(hr)|(img)|(input)|(link)|(meta)|(area)|(base)|(col)|(command)|(embed)|(keygen)|(param)|(source)|(track)|(wbr))[\s\S]*?>)/.test(this.readNextChars())) {
                    matched = this.readNextChars().match(/^(?:<\/[a-zA-Z0-9]+\s*>)|^(?:<((br)|(hr)|(img)|(input)|(link)|(meta)|(area)|(base)|(col)|(command)|(embed)|(keygen)|(param)|(source)|(track)|(wbr))[\s\S]*?>)/);
                    result += matched[0];
                    this.position += matched[0].length;
                    break;
                }
                result += char;
            }
            this.state = stateEnum.server; //准备进入后端读取模式
            return result;
        },

        /**
         * 读取行内后端代码
         * @returns {*}
         */
        readLineServerCode: function () {
            var len = this.source.length,
                char,
                result = '';
            if (this.position >= len) {
                return undefined;
            }
            for (; this.position < len; this.position++) {
                char = this.readNextChars(1);
                //引号的处理
                if ((char === '"' || char === "'") && this.readPrevChars(1) !== '\\') {
                    if (this.quotes.length === 0) {
                        this.quotes.push({
                            type: char === '"' ? quotesEnum.doubleQuotes : quotesEnum.singleQuotes,
                            position: this.position
                        });
                    } else if (this.quotes.length > 0) {
                        if (char === '"' && this.quotes[0].type === quotesEnum.doubleQuotes) {
                            this.quotes.pop();
                        } else if (char === "'" && this.quotes[0].type === quotesEnum.singleQuotes) {
                            this.quotes.pop();
                        }
                    }
                }

                if (char === '(' && this.quotes.length === 0) {
                    this.brackets.push(this.position);
                } else if (char === ')' && this.quotes.length === 0) {
                    this.brackets.pop();
                }

                //除这些外，且不在引号内部的特殊字符，都break
                if (['.', ',', '(', ')', '[', ']', '"', "'", ' '].indexOf(char) === -1 && /\W/.test(char)) {
                    break;
                }

                //class="@name"   class="@arr.join('')"
                if ((char === '"' || char === "'") && this.brackets.length === 0) {
                    break;
                }

                //class="@name abc"   class="@arr.join(' ') abc"
                if (char === ' ' && this.brackets.length === 0) {
                    break;
                }

                //class="@name.toString()abc"   class="@arr.join().toString()abc"
                if (char === ')' && [').', ')[', ')]', ')('].indexOf(this.readNextChars(2)) === -1) {
                    result += char;
                    this.position++;
                    break;
                }

                if (char === ']' && ['].', '][', ']]', ']('].indexOf(this.readNextChars(2)) === -1) {
                    result += char;
                    this.position++;
                    break;
                }

                result += char;
            }
            this.state = stateEnum.client; //准备进入前端读取模式
            return result;
        },

        /**
         * 读取块状后端代码
         * @returns {*}
         */
        readBlockServerCode: function () {
            var len = this.source.length,
                char,
                braceState,
                matched,
                result = '';
            if (this.position >= len) {
                return undefined;
            }
            for (; this.position < len; this.position++) {
                char = this.readNextChars(1);
                if (char === '@') {
                    console.warn('在代码内部，请直接写脚本，不需要加上前缀“@”。');
                    continue;
                }
                //引号的处理
                if ((char === '"' || char === "'") && this.readPrevChars(1) !== '\\') {
                    if (this.quotes.length === 0) {
                        this.quotes.push({
                            type: char === '"' ? quotesEnum.doubleQuotes : quotesEnum.singleQuotes,
                            position: this.position
                        });
                    } else if (this.quotes.length > 0) {
                        if (char === '"' && this.quotes[0].type === quotesEnum.doubleQuotes) {
                            this.quotes.pop();
                        } else if (char === "'" && this.quotes[0].type === quotesEnum.singleQuotes) {
                            this.quotes.pop();
                        }
                    }
                }
                //如果 '<' 不在括号内部，则认为是标记语言的开始，退出循环
                if (char === '<' && this.quotes.length === 0 &&
                    (this.brackets.length === 0
                        || (this.brackets.length > 0
                        && this.brackets[this.brackets.length - 1] < this.braces[this.braces.length - 1].position)
                    )) {
                    break;
                }
                if (char === '(' && this.quotes.length === 0) {
                    this.brackets.push(this.position);
                } else if (char === ')' && this.quotes.length === 0) {
                    this.brackets.pop();
                }

                if (char === '{' && this.quotes.length === 0) {
                    //'@{}'内部又有'@{}'，这里做下容错处理
                    if (this.braces[this.braces.length - 1] && this.braces[this.braces.length - 1].type > 0 && this.readPrevChars(1) === '@') {
                        this.braces.push({
                            type: bracesEnum.noAt,
                            position: this.position
                        });
                    } else {
                        this.braces.push({
                            type: this.readPrevChars(1) === '@' ? bracesEnum.atOther : bracesEnum.noAt,
                            position: this.position
                        });
                    }
                } else if (char === '}' && this.quotes.length === 0) {
                    braceState = this.braces.pop();
                    //如果该 '}' 对应的是 '@{'
                    if (braceState.type > 0) {
                        if (braceState.type === bracesEnum.atIf && (/(?:^}\s*?else\s*?\{)|(?:^}\s*?else\s+if\s*?\([\s\S]+?\)\s*?\{)/.test(this.readNextChars()))) {
                            //如果 '}' 后面是 'else {' 或者 'else if {' 或者 'while(...)'，依然识别为脚本语言，同时处理下braces
                            matched = this.readNextChars().match(/(?:^}\s*?else\s*?\{)|(?:^}\s*?else\s+if\s*?\([\s\S]+?\)\s*?\{)/);
                            result += matched[0];
                            this.position += matched[0].length;
                            this.braces.push({
                                type: bracesEnum.atIf,
                                position: this.position
                            });
                            continue;
                        } else if (braceState.type === bracesEnum.atDo && (/^}\s*?while\s*?\([\s\S]+?\)/.test(this.readNextChars()))) {
                            //如果 '}' 后面是 'while(...);'，依然识别为脚本语言
                            matched = this.readNextChars().match(/^}\s*?while\s*?\([\s\S]+?\)/);
                            result += matched[0];
                            this.position += matched[0].length;
                            continue;
                        } else if (braceState.type === bracesEnum.atTry && (/(?:^}\s*?catch\([\s\S]+?\)\s*?\{)|(?:^}\s*?finally\s*?\{)/.test(this.readNextChars()))) {
                            //如果 '}' 后面是 'catch(...){' 或者 'finally {'，依然识别为脚本语言，同时处理下braces
                            matched = this.readNextChars().match(/(?:^}\s*?catch\([\s\S]+?\)\s*?\{)|(?:^}\s*?finally\s*?\{)/);
                            result += matched[0];
                            this.position += matched[0].length;
                            this.braces.push({
                                type: bracesEnum.atTry,
                                position: this.position
                            });
                            continue;
                        } else {
                            //否则停止循环，启动标记语言读取模式
                            result += char;
                            this.position++;
                            break;
                        }
                    }
                }
                result += char;
            }

            this.state = stateEnum.client; //准备进入前端读取模式
            return result;
        },

        /**
         * 读取@(...)内的代码
         * @returns {*}
         */
        readBracketCode: function () {
            var flag = 0,
                result = '',
                char = '';
            while (this.position < this.source.length) {
                char = this.source.substr(this.position, 1);
                if (char === '(') {
                    flag++;
                } else if (char === ')') {
                    flag--;
                }
                result += char;
                if (flag === 0) {
                    break;
                }
                this.position++;
            }
            this.state = stateEnum.client;
            this.position++;
            if (flag !== 0) {
                console.error('格式错误："(" 找不到相匹配的 ")" ！');
            }
            return result;
        }
    };

    /**
     * 内容处理器
     * @constructor
     */
    var ContentProcessor = function () {
        this.segments = [];
    };

    ContentProcessor.prototype = {
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
            if (obj.data) {
                switch (obj.type) {
                    case 0:
                        this.segments.push('$saker_writeLiteral$("' + this.escape(obj.data) + '");');
                        break;
                    case 1:
                        this.segments.push('$saker_write$(' + obj.data + ');');
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

    var innerHelper = {
        /**
         * 输出原生未转义的字符串，注意最终还需escapeHtml去处理
         * @param val
         * @returns {{str: *, $saker_raw$: boolean}}
         */
        raw: function (val) {
            return {
                str: val,
                $saker_raw$: true
            }
        },

        /**
         * 转义特殊字符
         * @param val
         * @returns {XML|string|void|*}
         */
        escapeHtml: function (val) {
            if (val === undefined || val === null) {
                return '';
            }
            //接收到的是raw包装的字符串，则不转义
            if (val.$saker_raw$) {
                return val.str;
            }
            if (typeof val !== 'string') {
                return val;
            }
            var map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };

            return val.replace(/[&<>"']/g, function (m) {
                return map[m];
            });
        },

        /**
         * 反转义特殊字符
         * @param val
         * @returns {XML|string|void|*}
         */
        unescapeHtml: function (val) {
            if (val === undefined || val === null) {
                return '';
            }
            if (typeof val !== 'string') {
                return val;
            }
            var map = {
                '&amp;': '&',
                '&lt;': '<',
                '&gt;': '>',
                '&quot;': '"',
                "&#039;": "'"
            };

            return val.replace(/&amp;|&lt;|&gt;|&quot;|&#039;/g, function (m) {
                return map[m];
            });
        },

        /**
         * 加载局部视图
         * @param filePath
         * @param model
         * @returns {*}
         */
        renderPartialFn: function (filePath, model) {
            if (filePath.indexOf('.') === -1) {
                filePath += '.html';
            }
            filePath = path.join(configure.partialViewDir, filePath);
            var partialTemp = saker.getView(filePath);
            var layout = model.layout;
            model.layout = null;
            var html = saker.compile(partialTemp)(model);
            model.layout = layout;
            return html;
        }
    };

    /**
     * 中央处理器
     * @param template
     * @returns {ContentProcessor}
     */
    var centerProcessor = function (template) {
        var code,
            nextChar,
            matchedText,
            processor = new ParseProcessor(template),
            contentProcessor = new ContentProcessor();

        while (processor.position < processor.source.length) {
            if (processor.state === stateEnum.client) {
                code = processor.readMarkup();
                contentProcessor.addSegment({
                    data: code,
                    type: modeEnum.markup
                });
            } else {
                nextChar = processor.readNextChars(1);
                //跳过@符号
                if (nextChar === '@') {
                    processor.position++;
                    nextChar = processor.readNextChars(1);
                    //@@
                    if (nextChar === '@') {
                        processor.position++;
                        processor.state = stateEnum.client; //准备进入前端读取模式
                        contentProcessor.addSegment({
                            data: '@',
                            type: modeEnum.markup
                        });
                    }
                    //@//...
                    else if (nextChar === '/' && processor.readNextChars(2) === '//') {
                        matchedText = processor.readNextChars().match(/\/\/.*/)[0];
                        processor.position += matchedText.length;
                        processor.state = stateEnum.client;
                    }
                    //@*...*@
                    else if (nextChar === '*') {
                        if (/\*[\s\S]*?\*@/.test(processor.readNextChars())) {
                            matchedText = processor.readNextChars().match(/\*[\s\S]*?\*@/)[0];
                            processor.position += matchedText.length;
                            processor.state = stateEnum.client;
                        } else {
                            throw '后端块状注释 @* 找不到对应的 *@ 结尾！';
                        }
                    }
                    //@' @"
                    else if (nextChar === '"' || nextChar === "'") {
                        throw '引号在代码块开头无效。只有标识符、关键字、注释、“(”和“{”才有效。';
                    }
                    //@(...)
                    else if (nextChar === '(') {
                        code = processor.readBracketCode();
                        contentProcessor.addSegment({
                            data: code,
                            type: modeEnum.expression
                        });
                    }
                    //@{...}
                    else if (nextChar === '{') {
                        code = processor.readBlockServerCode();
                        contentProcessor.addSegment({
                            data: code,
                            type: modeEnum.script
                        });
                    }
                    //@if(){...}
                    else if (nextChar === 'i' && processor.readNextChars(2) === 'if' && /^if\s*?\([\s\S]+?\)\s*\{/.test(processor.readNextChars())) {
                        matchedText = processor.readNextChars().match(/^if\s*?\([\s\S]+?\)\s*\{/)[0];
                        processor.position += matchedText.length;
                        processor.braces.push({
                            type: bracesEnum.atIf,
                            position: processor.position
                        });
                        code = processor.readBlockServerCode();
                        contentProcessor.addSegment({
                            data: matchedText + code,
                            type: modeEnum.script
                        });
                    }
                    //@for(){...}
                    else if (nextChar === 'f' && processor.readNextChars(3) === 'for' && /^for\s*?\([\s\S]+?\)\s*\{/.test(processor.readNextChars())) {
                        matchedText = processor.readNextChars().match(/^for\s*?\([\s\S]+?\)\s*\{/)[0];
                        processor.position += matchedText.length;
                        processor.braces.push({
                            type: bracesEnum.atFor,
                            position: processor.position
                        });
                        code = processor.readBlockServerCode();
                        contentProcessor.addSegment({
                            data: matchedText + code,
                            type: modeEnum.script
                        });
                    }
                    //@while(){...}
                    else if (nextChar === 'w' && processor.readNextChars(5) === 'while' && /^while\s*?\([\s\S]+?\)\s*\{/.test(processor.readNextChars())) {
                        matchedText = processor.readNextChars().match(/^while\s*?\([\s\S]+?\)\s*\{/)[0];
                        processor.position += matchedText.length;
                        processor.braces.push({
                            type: bracesEnum.atWhile,
                            position: processor.position
                        });
                        code = processor.readBlockServerCode();
                        contentProcessor.addSegment({
                            data: matchedText + code,
                            type: modeEnum.script
                        });
                    }
                    //@do{}
                    else if (nextChar === 'd' && processor.readNextChars(2) === 'do' && /^do\s*?\{/.test(processor.readNextChars())) {
                        matchedText = processor.readNextChars().match(/^do\s*?\{/)[0];
                        processor.position += matchedText.length;
                        processor.braces.push({
                            type: bracesEnum.atDo,
                            position: processor.position
                        });
                        code = processor.readBlockServerCode();
                        contentProcessor.addSegment({
                            data: matchedText + code,
                            type: modeEnum.script
                        });
                    }
                    //@switch(){...}
                    else if (nextChar === 's' && processor.readNextChars(6) === 'switch' && /^switch\s*?\([\s\S]+?\)\s*\{/.test(processor.readNextChars())) {
                        matchedText = processor.readNextChars().match(/^switch\s*?\([\s\S]+?\)\s*\{/)[0];
                        processor.position += matchedText.length;
                        processor.braces.push({
                            type: bracesEnum.atSwitch,
                            position: processor.position
                        });
                        code = processor.readBlockServerCode();
                        contentProcessor.addSegment({
                            data: matchedText + code,
                            type: modeEnum.script
                        });
                    }
                    //@try{}
                    else if (nextChar === 't' && processor.readNextChars(3) === 'try' && /^try\s*?\{/.test(processor.readNextChars())) {
                        matchedText = processor.readNextChars().match(/^try\s*?\{/)[0];
                        processor.position += matchedText.length;
                        processor.braces.push({
                            type: bracesEnum.atTry,
                            position: processor.position
                        });
                        code = processor.readBlockServerCode();
                        contentProcessor.addSegment({
                            data: matchedText + code,
                            type: modeEnum.script
                        });
                    }
                    //@abc
                    else {
                        code = processor.readLineServerCode();
                        contentProcessor.addSegment({
                            data: code,
                            type: modeEnum.expression
                        });
                    }
                } else {
                    code = processor.readBlockServerCode();
                    contentProcessor.addSegment({
                        data: code,
                        type: modeEnum.script
                    });
                }
            }
        }
        return contentProcessor;
    };

    var saker = {
        /**
         * 合并配置项
         * @param passObj
         */
        config: function (passObj) {
            for (var item in passObj) {
                if (Object.prototype.hasOwnProperty.call(passObj, item)) {
                    configure[item] = passObj[item];
                }
            }
        },

        /**
         * 根据视图文件路径获取文件
         * @param filePath
         * @param cb
         */
        getView: function (filePath, cb) {
            if (cacheTemplate[filePath]) {
                if (cb) {
                    cb(null, cacheTemplate[filePath]);
                } else {
                    return cacheTemplate[filePath];
                }
            } else {
                if (cb) {
                    fs.readFile(filePath, function (err, data) {
                        if (err) {
                            cb(err);
                        } else {
                            cacheTemplate[filePath] = data.toString('utf8');
                            cb(null, data.toString('utf8'));
                        }
                    })
                } else {
                    try {
                        var data = fs.readFileSync(filePath);
                    } catch (err) {
                        throw err;
                    }
                    cacheTemplate[filePath] = data.toString('utf8');
                    return data.toString('utf8');
                }
            }
        },

        /**
         * 根据给定模板字符串进行编译
         * @param template
         */
        compile: function (template) {
            var that = this;
            var contentProcessor = centerProcessor(template);
            var content = contentProcessor.getContent();
            if(configure.debug){
                console.log('content start >>>>>>>>>>>>>>>>>>>\n');
                console.log(content);
                console.log('content end <<<<<<<<<<<<<<<<<<<<\n\n');
            }
            return function (model, cb) {
                if (typeof model === 'function') {
                    cb = model;
                    model = {};
                }
                var fn = '';
                var variables = '';
                var thisObj = {
                    model: model,
                    raw: innerHelper.raw,
                    renderBodyFn: function () {
                        return model.$saker_body$;
                    },
                    renderPartialFn: innerHelper.renderPartialFn
                };
                //将 this.xxx 赋到 saker.xxx 上
                variables += 'var saker = {};\n';
                Object.keys(thisObj).forEach(function (item) {
                    variables += 'saker.' + item + ' = this.' + item + ';\n';
                });
                //允许将 @model.xxx 简写为 @xxx
                if (typeof model === 'object' && Object.keys(model).length > 0) {
                    Object.keys(model).forEach(function (item) {
                        variables += 'var ' + item + ' = model.' + item + ';\n';
                    })
                }
                fn += variables;
                fn += 'var $saker_escapeHtml$ = ' + innerHelper.escapeHtml.toString() + ';\n';
                //定义write、writeLiteral
                fn += 'var $saker_data$ = [],\n $saker_writeLiteral$ = function(code) { $saker_data$.push(code); },\n $saker_write$ = function(code){ $saker_writeLiteral$(($saker_escapeHtml$(code))); };\n';
                //定义renderPartial，引用外部的renderPartialFn方法
                fn += 'this.renderPartial = saker.renderPartial = function(filePath, model){$saker_data$.push(this.renderPartialFn(filePath, model));};\n';
                //renderBody，引用外部的renderBodyFn方法
                fn += 'this.renderBody = saker.renderBody = function(){$saker_data$.push(this.renderBodyFn());};\n';
                //附加解析后的脚本
                fn += content + '\n';
                fn += 'return $saker_data$.join("");';

                if (cb) {
                    //异步方式
                    setImmediate(function () {
                        var html = '';
                        try {
                            //eval处理js代码
                            html = new Function('model', fn).call(thisObj, model);
                        } catch (err) {
                            return cb(err);
                        }
                        //过滤<text>标签
                        html = html.replace(/<text>([\s\S]*?)<\/text>/g, function (a, b) {
                            return b;
                        });

                        if(configure.debug){
                            console.log('html start >>>>>>>>>>>>>>>>>>>\n');
                            console.log(html);
                            console.log('html end <<<<<<<<<<<<<<<<<<<<<<\n\n');
                        }

                        //浏览器端
                        if(!isNode){
                            return cb(null, html);
                        }

                        if (model.layout === undefined) {
                            model.layout = configure.defaultLayout;
                        }
                        if (model.layout) {
                            if (express) {
                                model.layout = path.join(express().get('views'), model.layout);
                            }
                            that.getView(model.layout, function (err, layoutTemp) {
                                if (err) {
                                    cb(err);
                                } else {
                                    if (layoutTemp.indexOf('saker.renderBody()') === -1) {
                                        return cb(new Error('layout模板中找不到saker.renderBody()方法！'));
                                    }
                                    model.layout = null;
                                    model.$saker_body$ = html;
                                    that.compile(layoutTemp)(model, function (err, layoutHtml) {
                                        if (err) {
                                            cb(err);
                                        } else {
                                            cb(null, layoutHtml);
                                        }
                                    });
                                }
                            })
                        } else {
                            cb(null, html);
                        }

                    });
                } else {
                    //同步方式
                    var html = '';
                    try {
                        //eval处理js代码
                        html = new Function('model', fn).call(thisObj, model);
                    } catch (err) {
                        throw err;
                    }
                    //过滤<text>标签
                    html = html.replace(/<text>([\s\S]*?)<\/text>/g, function (a, b) {
                        return b;
                    });

                    if(configure.debug){
                        console.log('html start >>>>>>>>>>>>>>>>>>>\n');
                        console.log(html);
                        console.log('html end <<<<<<<<<<<<<<<<<<<<<<\n\n');
                    }

                    //浏览器端
                    if(!isNode){
                        return html;
                    }

                    if (model.layout === undefined) {
                        model.layout = configure.defaultLayout;
                    }
                    if (model.layout) {
                        if (express) {
                            model.layout = path.join(express().get('views'), model.layout);
                        }
                        var layoutTemp = that.getView(model.layout);
                        if (layoutTemp.indexOf('saker.renderBody()') === -1) {
                            throw 'layout模板中找不到saker.renderBody()方法！';
                        }
                        model.layout = null;
                        model.$saker_body$ = html;
                        return that.compile(layoutTemp)(model);
                    } else {
                        return html;
                    }
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
            var callback = function (err, html) {
                if (err) {
                    res.writeHead(500, {'Content-Type': 'text/html'});
                    res.end(err.message);
                } else {
                    res.writeHead(200, {'Content-Type': 'text/html'});
                    res.end(html);
                }
            };
            if (cacheCompiled[filePath]) {
                cacheCompiled[filePath](model, callback);
            } else {
                this.getView(filePath, function (err, template) {
                    if (err) {
                        res.writeHead(500, {'Content-Type': 'text/html'});
                        res.end(err.message);
                    } else {
                        that.compile(template)(model, callback);
                    }
                })
            }
        },

        /**
         * express集成接口
         * @param filePath
         * @param model
         * @param cb
         */
        express: function (filePath, model, cb) {
            express = require('express');
            var callback = function (err, html) {
                if (err) {
                    return cb(err);
                }
                return cb(null, html);
            };
            if (cacheCompiled[filePath]) {
                cacheCompiled[filePath](model, callback)
            } else {
                saker.getView(filePath, function (err, template) {
                    if (err) {
                        return cb(err);
                    }
                    var compiled = saker.compile(template);
                    cacheCompiled[filePath] = compiled;
                    compiled(model, callback);
                })
            }
        }
    };

    if (isNode) {
        module.exports = saker;
    }
    else {
        window.saker = {
            config: saker.config,
            compile: saker.compile
        }
    }
})();