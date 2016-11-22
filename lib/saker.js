/**
 * Saker
 * Copyright(c) 2016 Sky <eshengsky@163.com>
 * MIT Licensed
 */

var isNode = typeof window === 'undefined',
    isProd = false,
    fs,
    path;

if (isNode) {
    fs = require('fs');
    path = require('path');
    isProd = process.env.NODE_ENV === 'production';
}

(function () {
    /**
     * 配置项
     * @type {{debug: boolean, defaultLayout: string, partialViewDir: string}}
     */
    var configure = {
        debug: false,
        defaultLayout: 'layout.html',
        partialViewDir: './views/partials/'
    };

    /**
     * 模板编译结果缓存（注：缓存的是解析后返回的function）
     * @type {{}}
     */
    var cache = {};

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
     * @type {{noAt: number, atIf: number, atFor: number, atWhile: number, atDo: number, atSwitch: number, atTry: number, atOther: number}}
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
     * Saker自定义错误
     * @param message
     * @param stack
     * @constructor
     */
    function SakerError(message, stack) {
        this.name = 'SakerError';
        this.message = message;
        this.stack = stack;
    }

    SakerError.prototype = Object.create(Error.prototype);
    SakerError.prototype.constructor = SakerError;

    /**
     * 解析处理器
     * @param source
     * @constructor
     */
    var ParseProcessor = function (source) {
        //要解析的源码
        this.source = source;

        //当前处理的位置
        this.position = 0;

        //当前读取状态
        this.state = stateEnum.client;

        //标签计数器，规则：遇到开始标签 '<' push，遇到结束标签 '</' pop
        this.tags = [];

        //引号计数器，规则：当遇到了引号，且引号之前不是'\'时，若数组为空则push，若数组不为空且值与它相同则pop，push类型：{type: quotesEnum.xxx, position: xxx}
        this.quotes = [];

        //左大括号计数器，规则：遇到 '{' push，遇到 '}' pop，push类型：{type: bracesEnum.xxx, position: xxx}
        this.braces = [];

        //左小括号计数器，规则：遇到 '(' push，遇到 ')' pop，push类型：position
        this.brackets = [];
    };

    ParseProcessor.prototype = {
        /**
         * 获取指定位置字符所在的行号、列号、该行的上一行和下两行
         * @returns {{row: Number, col: *, source: Array}}
         */
        getLineNum: function (pos) {
            if (pos === undefined) {
                pos = this.position;
            }
            var lines = this.source.substring(0, pos).split(/\r?\n/),
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
         * 获取错误stack信息
         * @param msg
         * @param pos
         * @returns {string}
         */
        getStackString: function (msg, pos) {
            return 'Saker Syntax Error: ' + msg + ' at position ' + pos.row + ':' + pos.col;
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
         * 自闭合标签类型
         */
        selfClosedTags: ['br', 'hr', 'img', 'input', 'link', 'meta', 'area', 'base', 'col', 'command', 'embed', 'keygen', 'param', 'source', 'track', 'wbr'],

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

                if (char === '<' && /^<(\w+)/.test(this.readNextChars(50))) {
                    matched = this.readNextChars(50).match(/^<(\w+)/);
                    this.tags.push({
                        type: matched[1],
                        position: this.position
                    });
                }

                //遇到 > 并且之前已经遇到过开始标签了
                if (char === '>' && this.tags.length > 0) {
                    //...</div> 或者 <img > 的结束
                    if (new RegExp('<\/' + this.tags[this.tags.length - 1].type + '\s*>$').test(this.readPrevChars() + char) || this.selfClosedTags.indexOf(this.tags[this.tags.length - 1].type) > -1) {
                        this.tags.pop();
                        result += char;
                        if ((this.tags[this.tags.length - 1] || {position: -1}).position >= (this.braces[this.braces.length - 1] || {position: -1}).position) {
                            continue;
                        } else {
                            this.position += 1;
                            break;
                        }
                    }
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
                if ((char === '"' || char === "'") && (this.brackets.length === 0 || this.brackets[this.brackets.length - 1] < (this.braces[this.braces.length - 1] || {position: -1}).position)) {
                    break;
                }

                //class="@name abc"   class="@arr.join(' ') abc"
                if (char === ' ' && (this.brackets.length === 0 || this.brackets[this.brackets.length - 1] < (this.braces[this.braces.length - 1] || {position: -1}).position)) {
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
                    throw new SakerError('在代码块内部，请直接写脚本，不需要加上前缀 @', this.getStackString('在代码块内部，请直接写脚本，不需要加上前缀 @', this.getLineNum(this.position)));
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
                    //'@{}'内部又有'@{}'，且内部的 '@{}' 不处在标签内，则认为是语法错误
                    // if (this.braces[this.braces.length - 1] && (this.braces[this.braces.length - 1].position > (this.tags[this.tags.length - 1] || {position: -1}) .position) && this.readPrevChars(1) === '@') {
                    //     throw '代码块内部的代码无需再加上 @ 标记。';
                    // } else {
                    //     this.braces.push({
                    //         type: this.readPrevChars(1) === '@' ? bracesEnum.atOther : bracesEnum.noAt,
                    //         position: this.position
                    //     });
                    // }
                    this.braces.push({
                        type: this.readPrevChars(1) === '@' ? bracesEnum.atOther : bracesEnum.noAt,
                        position: this.position
                    });
                } else if (char === '}' && this.quotes.length === 0) {
                    braceState = this.braces.pop();
                    //如果该 '}' 对应的是 '@{'
                    if (braceState.type > 0) {
                        if (braceState.type === bracesEnum.atIf && (/(?:^}\s*?else\s*?\{)|(?:^}\s*?else\s+if\s*?\([\s\S]+?\)\s*?\{)/.test(this.readNextChars()))) {
                            //如果 '}' 后面是 'else {' 或者 'else if {'，依然识别为脚本语言，同时处理下braces
                            matched = this.readNextChars().match(/(?:^}\s*?else\s*?\{)|(?:^}\s*?else\s+if\s*?\([\s\S]+?\)\s*?\{)/);
                            result += matched[0];
                            this.position += matched[0].length - 1;
                            this.braces.push({
                                type: bracesEnum.atIf,
                                position: this.position
                            });
                            continue;
                        } else if (braceState.type === bracesEnum.atDo && (/^}\s*?while\s*?\([\s\S]+?\)/.test(this.readNextChars()))) {
                            //如果 '}' 后面是 'while(...);'，依然识别为脚本语言
                            matched = this.readNextChars().match(/^}\s*?while\s*?\([\s\S]+?\)/);
                            result += matched[0];
                            this.position += matched[0].length - 1;
                            continue;
                        } else if (braceState.type === bracesEnum.atTry && (/(?:^}\s*?catch\([\s\S]+?\)\s*?\{)|(?:^}\s*?finally\s*?\{)/.test(this.readNextChars()))) {
                            //如果 '}' 后面是 'catch(...){' 或者 'finally {'，依然识别为脚本语言，同时处理下braces
                            matched = this.readNextChars().match(/(?:^}\s*?catch\([\s\S]+?\)\s*?\{)|(?:^}\s*?finally\s*?\{)/);
                            result += matched[0];
                            this.position += matched[0].length - 1;
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
            var startPosition = this.position;
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
                throw new SakerError('"(" 找不到相匹配的 ")" ！', this.getStackString('"(" 找不到相匹配的 ")" ！', this.getLineNum(startPosition)));
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
            var html = saker.compile(partialTemp).call({
                layout: null
            }, model);
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
                            throw new SakerError('后端块状注释 @* 找不到对应的 *@ 结尾！', processor.getStackString('后端块状注释 @* 找不到对应的 *@ 结尾！', processor.getLineNum(this.position)));
                        }
                    }
                    //@(...)
                    else if (nextChar === '(') {
                        code = processor.readBracketCode();
                        if(/\(\s*\)/.test(code)){
                            code = '';
                        }
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
                    //@abc, @_a, @[1,2], @!true
                    else if (/[A-Za-z_[!]/.test(nextChar)) {
                        code = processor.readLineServerCode();
                        contentProcessor.addSegment({
                            data: code,
                            type: modeEnum.expression
                        });
                    }
                    //@ abc, @", @?等其他特殊字符
                    else {
                        throw new SakerError('@ 之后不允许有该字符！', processor.getStackString('@ 之后不允许有该字符！', processor.getLineNum(this.position + 1)));
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
        //匹配情况检查
        if(processor.tags.length > 0){
            throw new SakerError('存在未关闭的标签！', processor.getStackString('存在未关闭的标签！', processor.getLineNum(processor.tags[processor.tags.length - 1].position)));
        }
        if(processor.braces.length > 0){
            throw new SakerError('存在不匹配的大括号！', processor.getStackString('存在不匹配的大括号！', processor.getLineNum(processor.braces[processor.braces.length - 1].position)));
        }
        if(processor.brackets.length > 0){
            throw new SakerError('存在不匹配的小括号！', processor.getStackString('存在不匹配的小括号！', processor.getLineNum(processor.brackets[processor.brackets.length - 1])));
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
            if (filePath.indexOf('.') === -1) {
                filePath += '.html';
            }
            if (cb) {
                fs.readFile(filePath, function (err, data) {
                    if (err) {
                        cb(err);
                    } else {
                        cb(null, data.toString('utf8'));
                    }
                })
            } else {
                try {
                    var data = fs.readFileSync(filePath);
                } catch (err) {
                    throw err;
                }
                return data.toString('utf8');
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
            if (configure.debug) {
                console.log('parsed start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>\n');
                console.log(content);
                console.log('parsed end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n');
            }
            return function (model, cb) {
                if (typeof model === 'function') {
                    cb = model;
                    model = {};
                }
                var _this = this,
                    fn = '',
                    variables = '',
                    thisObj = {
                        model: model,
                        raw: innerHelper.raw,
                        _renderBodyFlag: false,
                        _renderBodyFn: function () {
                            return model.$saker_body$;
                        },
                        _renderPartialFn: innerHelper.renderPartialFn
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
                //定义renderPartial，引用外部的_renderPartialFn方法
                fn += 'this.renderPartial = saker.renderPartial = function(filePath){$saker_data$.push(this._renderPartialFn(filePath, model));};\n';
                //renderBody，引用外部的_renderBodyFn方法
                fn += 'this.renderBody = saker.renderBody = function(){$saker_data$.push(this._renderBodyFn());};\n';
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

                        if (configure.debug) {
                            console.log('html start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>\n');
                            console.log(html);
                            console.log('html end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n');
                        }

                        //浏览器端
                        if (!isNode) {
                            return cb(null, html);
                        }

                        //以该回调函数执行时作用域内部的this.layout为准，修正thisObj.layout
                        if (_this.layout !== undefined) {
                            thisObj.layout = _this.layout;
                        }

                        //没有设置layout，则取默认layout
                        if (thisObj.layout === undefined) {
                            thisObj.layout = configure.defaultLayout;
                        }
                        if (thisObj.layout) {
                            if (model.settings) {
                                thisObj.layout = path.join(model.settings.views, thisObj.layout);
                            }
                            that.getView(thisObj.layout, function (err, layoutTemp) {
                                if (err) {
                                    cb(err);
                                } else {
                                    if (!thisObj._renderBodyFlag) {
                                        return cb(new SakerError('layout模板中找不到renderBody方法！', 'Saker Layout Error: ' +  'layout模板中找不到renderBody方法！'));
                                    }
                                    thisObj.layout = null;
                                    model.$saker_body$ = html;
                                    that.compile(layoutTemp).call({
                                        layout: thisObj.layout
                                    }, model, function (err, layoutHtml) {
                                        if (err) {
                                            cb(err);
                                        } else {
                                            cb(null, layoutHtml);
                                        }
                                    });
                                }
                            })
                        } else {
                            //layout为空或null
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

                    if (configure.debug) {
                        console.log('html start >>>>>>>>>>>>>>>>>>>\n');
                        console.log(html);
                        console.log('html end <<<<<<<<<<<<<<<<<<<<<<\n\n');
                    }

                    //浏览器端
                    if (!isNode) {
                        return html;
                    }

                    //以该回调函数执行时作用域内部的this.layout为准，修正thisObj.layout
                    if (_this.layout !== undefined) {
                        thisObj.layout = _this.layout;
                    }

                    //没有设置layout，则取默认layout
                    if (thisObj.layout === undefined) {
                        thisObj.layout = configure.defaultLayout;
                    }
                    if (thisObj.layout) {
                        //说明该方法是在Express中被调用的
                        if (model.settings) {
                            thisObj.layout = path.join(model.settings.views, thisObj.layout);
                        }
                        var layoutTemp = that.getView(thisObj.layout);
                        if (!thisObj._renderBodyFlag) {
                            throw new SakerError('layout模板中找不到renderBody方法！', 'Saker Layout Error: ' +  'layout模板中找不到renderBody方法！');
                        }
                        thisObj.layout = null;
                        model.$saker_body$ = html;
                        return that.compile(layoutTemp)(model);
                    } else {
                        //layout为空或null
                        return html;
                    }
                }
            }
        },

        /**
         * 根据文件路径和数据生成html
         * @param filePath
         * @param model
         * @param cb
         */
        renderView: function (filePath, model, cb) {
            var callback = function (err, html) {
                if (err) {
                    return cb(err);
                }
                return cb(null, html);
            };
            if (cache[filePath] && isProd) {
                cache[filePath](model, callback)
            } else {
                saker.getView(filePath, function (err, template) {
                    if (err) {
                        return cb(err);
                    }
                    var compiled = saker.compile(template);
                    if (isProd) {
                        cache[filePath] = compiled;
                    }
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