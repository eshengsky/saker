/**
 * Saker
 * The template engine for Node.js and browsers.
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
     * 配置项。Configure set.
     * @type {{debug: boolean, defaultLayout: string, partialViewDir: string}}
     */
    var configure = {
        debug: false,
        defaultLayout: 'layout.html',
        partialViewDir: './views/partials/'
    };

    /**
     * 模板编译结果缓存（注：缓存的是解析后返回的function）。The cache for complied result (note: it stored the returned function).
     * @type {{}}
     */
    var cache = {};

    /**
     * 读取状态枚举。Read state enum.
     * @type {{client: number, server: number}}
     */
    var stateEnum = {
        //前端代码。Frontend code.
        client: 0,

        //后端代码。Backend code.
        server: 1
    };

    /**
     * 文本类型枚举。String type enum.
     * @type {{markup: number, expression: number, script: number}}
     */
    var modeEnum = {
        //HTML标记。HTML markup.
        markup: 0,

        //js表达式。js expression.
        expression: 1,

        //块状js代码。Block js code.
        script: 2
    };

    /**
     * 引号类型枚举。Quotes type enum.
     * @type {{singleQuotes: number, doubleQuotes: number}}
     */
    var quotesEnum = {
        singleQuotes: 0,
        doubleQuotes: 1
    };

    /**
     * '{' 类型枚举。'{' type enum.
     * @type {{noAt: number, atIf: number, atFor: number, atWhile: number, atDo: number, atSwitch: number, atTry: number, atOther: number}}
     */
    var bracesEnum = {
        //不带@的'{'。Without '@'.
        noAt: 0,

        //@if 特殊：可能有else if{...}else{...}。Special: maybe follows else if and else in the end.
        atIf: 1,

        //@for
        atFor: 2,

        //@while
        atWhile: 3,

        //@do 特殊：可能有while。Special: maybe follows while in the end.
        atDo: 4,

        //@switch
        atSwitch: 5,

        //@try　特殊：可能有catch{...}finally{...}。Special: maybe follows catch and finally in the end.
        atTry: 6,

        //@{...}
        atOther: 10
    };

    /**
     * 自定义错误。Custom error.
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
     * 获取带后缀的文件名。Get file name with extension.
     * @param filePath
     * @returns {*}
     */
    function getFileWithExt(filePath) {
        if (filePath.indexOf('.') === -1) {
            filePath += '.html';
        }
        return filePath;
    }

    /**
     * 解析处理器。Parse processor.
     * @param source
     * @constructor
     */
    var ParseProcessor = function (source) {
        //要解析的源码。To be parsed template source string.
        this.source = source;

        //当前处理的位置。Current parsed position of source.
        this.position = 0;

        //当前读取状态。Current read state, server or client.
        this.state = stateEnum.client;

        //标签计数器，规则：遇到开始标签 '<' push，遇到结束标签 '</' pop。Counter for tags, rule: if '<' push, if '</' pop.
        this.tags = [];

        //引号计数器，规则：当遇到了引号，且引号之前不是'\'时，若数组为空则push，若数组不为空且值与它相同则pop，push类型：{type: quotesEnum.xxx, position: xxx}。Counter for quotes.
        this.quotes = [];

        //左大括号计数器，规则：遇到 '{' push，遇到 '}' pop，push类型：{type: bracesEnum.xxx, position: xxx}。Counter for braces.
        this.braces = [];

        //左小括号计数器，规则：遇到 '(' push，遇到 ')' pop，push类型：position。Counter for brackets.
        this.brackets = [];
    };

    ParseProcessor.prototype = {
        /**
         * 获取指定位置字符所在的行号、列号、该行的上一行和下两行。Get the line number for the position.
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
         * 获取错误stack信息。Get the stack.
         * @param msg
         * @param pos
         * @returns {string}
         */
        getStackString: function (msg, pos) {
            return 'Saker Syntax Error: ' + msg + ' at position ' + pos.row + ':' + pos.col;
        },

        /**
         * 从当前位置开始读取指定长度字符。Read text from current position.
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
         * 从当前位置开始向前读取指定长度字符。Read previous text form last position.
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
         * 自闭合标签类型。Self-closing tags type.
         */
        selfClosedTags: ['br', 'hr', 'img', 'input', 'link', 'meta', 'area', 'base', 'col', 'command', 'embed', 'keygen', 'param', 'source', 'track', 'wbr'],

        /**
         * 读取前端标记代码。Read client markup.
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
                //读到 '@' 就停止，因为 '@' 后面的必定是脚本代码。Stop if '@', for the code behind '@' must be the server scripts.
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

                //遇到 > 并且之前已经遇到过开始标签了。Meet '>' and there exists start tag.
                if (char === '>' && this.tags.length > 0) {
                    //...</div> , <img >
                    if (new RegExp('<(\\\\)?\/' + this.tags[this.tags.length - 1].type + '\\s*>$').test(this.readPrevChars() + char) || this.selfClosedTags.indexOf(this.tags[this.tags.length - 1].type) > -1) {
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
            //准备进入后端读取模式。Ready to switch to backend read mode.
            this.state = stateEnum.server;
            return result;
        },

        /**
         * 读取行内后端代码。Read inline code.
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

                //除这些外，且不在引号内部的特殊字符，都break。Special characters, except the following, and is not in quotes, all break.
                if (['.', ',', '(', ')', '[', ']', '"', "'", ' '].indexOf(char) === -1 && /\W/.test(char) && this.quotes.length === 0) {
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

                //引号的处理。Handle quotes.
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
            //准备进入前端读取模式。Ready to switch to frontend read mode.
            this.state = stateEnum.client;
            return result;
        },

        /**
         * 读取块状后端代码。Read backend block scripts.
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
                    throw new SakerError('In block scripts, please write scripts directly without prefix @ !', this.getStackString('In block scripts, please write scripts directly without prefix @ !', this.getLineNum(this.position)));
                }
                //引号的处理。Handle quotes.
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
                //如果 '<' 不在括号内部，则认为是标记语言的开始，退出循环。If '<' is not in quotes, indicates it's the start of markup, break loop.
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
                    this.braces.push({
                        type: this.readPrevChars(1) === '@' ? bracesEnum.atOther : bracesEnum.noAt,
                        position: this.position
                    });
                } else if (char === '}' && this.quotes.length === 0) {
                    braceState = this.braces.pop();
                    //如果该 '}' 对应的是 '@{'。If the '}' matched '{' has prefix @.
                    if (braceState.type > 0) {
                        if (braceState.type === bracesEnum.atIf && (/(?:^}\s*?else\s*?\{)|(?:^}\s*?else\s+if\s*?\([\s\S]+?\)\s*?\{)/.test(this.readNextChars()))) {
                            //如果 '}' 后面是 'else {' 或者 'else if {'，依然识别为脚本语言，同时处理下braces。If it is 'else' behind '}', that's backend scripts, and handles braces.
                            matched = this.readNextChars().match(/(?:^}\s*?else\s*?\{)|(?:^}\s*?else\s+if\s*?\([\s\S]+?\)\s*?\{)/);
                            result += matched[0];
                            this.position += matched[0].length - 1;
                            this.braces.push({
                                type: bracesEnum.atIf,
                                position: this.position
                            });
                            continue;
                        } else if (braceState.type === bracesEnum.atDo && (/^}\s*?while\s*?\([\s\S]+?\)/.test(this.readNextChars()))) {
                            //如果 '}' 后面是 'while(...);'，依然识别为脚本语言。If it is 'while' behind '}', that's backend scripts.
                            matched = this.readNextChars().match(/^}\s*?while\s*?\([\s\S]+?\)/);
                            result += matched[0];
                            this.position += matched[0].length - 1;
                            continue;
                        } else if (braceState.type === bracesEnum.atTry && (/(?:^}\s*?catch\([\s\S]+?\)\s*?\{)|(?:^}\s*?finally\s*?\{)/.test(this.readNextChars()))) {
                            //如果 '}' 后面是 'catch(...){' 或者 'finally {'，依然识别为脚本语言，同时处理下braces。If it is 'catch' or 'finally', that's backend scripts, and handles braces.
                            matched = this.readNextChars().match(/(?:^}\s*?catch\([\s\S]+?\)\s*?\{)|(?:^}\s*?finally\s*?\{)/);
                            result += matched[0];
                            this.position += matched[0].length - 1;
                            this.braces.push({
                                type: bracesEnum.atTry,
                                position: this.position
                            });
                            continue;
                        } else {
                            //否则停止循环。Otherwise stop loop.
                            result += char;
                            this.position++;
                            break;
                        }
                    }
                }
                result += char;
            }
            //准备进入前端读取模式。Ready to switch to frontend read mode.
            this.state = stateEnum.client;
            return result;
        },

        /**
         * 读取@(...)内的代码。Read scripts in @()
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
                throw new SakerError('"(" not found the matched ")" ！', this.getStackString('"(" not found the matched ")" ！', this.getLineNum(startPosition)));
            }
            return result;
        }
    };

    /**
     * 内容处理器。Content processor.
     * @constructor
     */
    var ContentProcessor = function () {
        this.segments = [];
    };

    ContentProcessor.prototype = {
        /**
         * 特殊字符转义。Encode special characters.
         * @param str
         * @returns {string|XML}
         */
        escape: function (str) {
            return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '\\r').replace(/\n/g, '\\n');

        },

        /**
         * 添加语句片段。Add segment to array.
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
         * 获取生成的代码字符串。Get scripts string.
         * @returns {string}
         */
        getContent: function () {
            return this.segments.join('\r\n');
        }
    };

    var innerHelper = {
        /**
         * 输出原生未转义的字符串，注意最终还需escapeHtml去处理。Output raw string.
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
         * 转义特殊字符。Encode special characters.
         * @param val
         * @returns {XML|string|void|*}
         */
        escapeHtml: function (val) {
            if (val === undefined || val === null) {
                return '';
            }
            //接收到的是raw包装的字符串，则不转义。If get an object with 'raw' property, no encode.
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
         * 反转义特殊字符。Unused now.
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
         * 加载局部视图。Render a partial view.
         * @param filePath
         * @param model
         * @returns {*}
         */
        renderPartialFn: function (filePath, model) {
            filePath = getFileWithExt(filePath);
            filePath = path.join(configure.partialViewDir, filePath);
            var partialTemp = saker.getView(filePath);
            try {
                var html = saker.compile(partialTemp, filePath).call({
                    layout: null
                }, model);
            } catch (err) {
                throw err;
            }
            return html;
        }
    };

    /**
     * 中央处理器。The main processor.
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
                //跳过@符号。Pass the @
                if (nextChar === '@') {
                    processor.position++;
                    nextChar = processor.readNextChars(1);
                    //@@
                    if (nextChar === '@') {
                        processor.position++;
                        processor.state = stateEnum.client;
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
                            throw new SakerError('Comments @* not found the matched *@ ！', processor.getStackString('Comments @* not found the matched *@ ！', processor.getLineNum(processor.position)));
                        }
                    }
                    //@(...)
                    else if (nextChar === '(') {
                        code = processor.readBracketCode();
                        if (/^\(\s*\)$/.test(code)) {
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
                        throw new SakerError('Illegal character after @ ! ', processor.getStackString('Illegal character after @ ! ', processor.getLineNum(processor.position)));
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
        //匹配情况检查。Check match.
        if (processor.tags.length > 0) {
            throw new SakerError('There exists unclosed tags！', processor.getStackString('There exists unclosed tags！', processor.getLineNum(processor.tags[processor.tags.length - 1].position)));
        }
        if (processor.braces.length > 0) {
            throw new SakerError('There exists unmatched braces！', processor.getStackString('There exists unmatched braces！', processor.getLineNum(processor.braces[processor.braces.length - 1].position)));
        }
        if (processor.brackets.length > 0) {
            throw new SakerError('There exits unmatched brackets！', processor.getStackString('There exits unmatched brackets！', processor.getLineNum(processor.brackets[processor.brackets.length - 1])));
        }
        return contentProcessor;
    };

    var saker = {
        /**
         * 合并配置项。Combine config object.
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
         * 根据视图文件路径获取文件。Get view file according to the file path.
         * @param filePath
         * @param cb
         */
        getView: function (filePath, cb) {
            filePath = getFileWithExt(filePath);
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
         * 根据给定模板字符串进行编译。Compile the given template string, and return a complied function.
         * @param template
         */
        compile: function (template) {
            var that = this;
            var filePath = arguments[1];
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
                        _renderBodyFn: function () {
                            return model.$saker_body$;
                        },
                        _renderPartialFn: innerHelper.renderPartialFn
                    };
                //将 this.xxx 赋到 saker.xxx 上。Assign this.xxx to saker.xxx
                variables += 'var saker = {};\n';
                Object.keys(thisObj).forEach(function (item) {
                    variables += 'saker.' + item + ' = this.' + item + ';\n';
                });
                //允许将 @model.xxx 简写为 @xxx。Allow @model.xxx to @xxx.
                if (typeof model === 'object' && Object.keys(model).length > 0) {
                    Object.keys(model).forEach(function (item) {
                        variables += 'var ' + item + ' = model.' + item + ';\n';
                    })
                }
                fn += variables;
                fn += 'var $saker_escapeHtml$ = ' + innerHelper.escapeHtml.toString() + ';\n';
                //write、writeLiteral
                fn += 'var _this = this,$saker_data$ = [],\n $saker_writeLiteral$ = function(code) { $saker_data$.push(code); },\n $saker_write$ = function(code){ $saker_writeLiteral$(($saker_escapeHtml$(code))); };\n';
                //renderPartial
                fn += 'this.renderPartial = saker.renderPartial = function(filePath){$saker_data$.push(this._renderPartialFn(filePath, model));};\n';
                //renderBody
                fn += 'this.renderBody = saker.renderBody = function(){model.$renderBodyFlag$ = true;$saker_data$.push(this._renderBodyFn());};\n';
                //附加解析后的脚本。Attach parsed scripts.
                fn += content + '\n';
                fn += 'return $saker_data$.join("");';

                if (cb) {
                    //异步方式。Async type.
                    setImmediate(function () {
                        var html = '';
                        try {
                            //eval处理js代码。eval to evaluate js.
                            html = new Function('model', fn).call(thisObj, model);
                        } catch (err) {
                            return cb(new SakerError(err.message, err.stack + (filePath ? ('\n    at template file (' + getFileWithExt(filePath) + ')') : '' )));
                        }
                        //过滤<text>标签。Filter <text> tags.
                        html = html.replace(/<text>([\s\S]*?)<\/text>/g, function (a, b) {
                            return b;
                        });

                        if (configure.debug) {
                            console.log('html start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>\n');
                            console.log(html);
                            console.log('html end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n');
                        }

                        //浏览器端。The browsers.
                        if (!isNode) {
                            return cb(null, html);
                        }

                        //以该回调函数执行时作用域内部的this.layout为准，修正thisObj.layout。Base on the layout in current scope, to fix thisObj.layout.
                        if (_this.layout !== undefined) {
                            thisObj.layout = _this.layout;
                        }

                        //没有设置layout，则取默认layout。Not set layout, use default layout.
                        if (thisObj.layout === undefined) {
                            thisObj.layout = configure.defaultLayout;
                        }
                        var layoutPath = thisObj.layout;
                        if (thisObj.layout) {
                            //说明当前是用的Express框架。Indicates this is used in Express framework.
                            if (model.settings && model.settings.views) {
                                thisObj.layout = path.join(model.settings.views, thisObj.layout);
                            }
                            that.getView(thisObj.layout, function (err, layoutTemp) {
                                if (err) {
                                    cb(err);
                                } else {
                                    thisObj.layout = null;
                                    model.$saker_body$ = html;
                                    try {
                                        var fn = that.compile(layoutTemp, layoutPath);
                                    } catch (err) {
                                        return cb(err);
                                    }
                                    fn.call(thisObj, model, function (err, layoutHtml) {
                                        if (err) {
                                            return cb(err);
                                        }
                                        //判断layout中是否调用了renderBody方法。Check whether call renderBody function.
                                        if (!model.$renderBodyFlag$) {
                                            cb(new SakerError('Missing renderBody in layout: ' + layoutPath + ' ！', 'Saker Layout Error: Missing renderBody in layout: ' + layoutPath + ' ！'))
                                        } else {
                                            cb(null, layoutHtml);
                                        }
                                    });
                                }
                            })
                        } else {
                            //layout为空或null。layout is set to empty string or just null.
                            cb(null, html);
                        }

                    });
                } else {
                    //同步方式。Sync type.
                    var html = '';
                    try {
                        html = new Function('model', fn).call(thisObj, model);
                    } catch (err) {
                        throw new SakerError(err.message, err.stack + (filePath ? ('\n    at template file (' + getFileWithExt(filePath) + ')') : '' ));
                    }
                    html = html.replace(/<text>([\s\S]*?)<\/text>/g, function (a, b) {
                        return b;
                    });

                    if (configure.debug) {
                        console.log('html start >>>>>>>>>>>>>>>>>>>\n');
                        console.log(html);
                        console.log('html end <<<<<<<<<<<<<<<<<<<<<<\n\n');
                    }

                    if (!isNode) {
                        return html;
                    }

                    if (_this.layout !== undefined) {
                        thisObj.layout = _this.layout;
                    }

                    if (thisObj.layout === undefined) {
                        thisObj.layout = configure.defaultLayout;
                    }
                    var layoutPath = thisObj.layout;
                    if (thisObj.layout) {
                        if (model.settings && model.settings.views) {
                            thisObj.layout = path.join(model.settings.views, thisObj.layout);
                        }
                        var layoutTemp = that.getView(thisObj.layout);
                        thisObj.layout = null;
                        model.$saker_body$ = html;
                        var layoutHtml = that.compile(layoutTemp, layoutPath).call(thisObj, model);
                        if (!model.$renderBodyFlag$) {
                            throw new SakerError('Missing renderBody in layout: ' + layoutPath + ' ！', 'Saker Layout Error: Missing renderBody in layout: ' + layoutPath + ' ！');
                        }
                        return layoutHtml;
                    } else {
                        return html;
                    }
                }
            }
        },

        /**
         * 根据文件路径和数据生成html。Generate html according to file path and data model.
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
                    try {
                        var compiled = saker.compile(template, filePath);
                    } catch (err) {
                        return cb(err);
                    }
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