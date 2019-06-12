<a href="https://eshengsky.github.io/saker/"><img src="https://github.com/eshengsky/saker/blob/master/logo.png" height="150" align="right"></a>

# Saker
Full documentation is at [https://eshengsky.github.io/saker/](https://eshengsky.github.io/saker/).  
完整文档请查看[https://eshengsky.github.io/saker/](https://eshengsky.github.io/saker/)。

Saker is a template engine for [Node.js](https://nodejs.org) and browsers, it is lightweight, powerfull and easy to use.  
The greatest feature is, Saker minimizes the number of characters and keystrokes required in a file, and enables a fast, fluid coding workflow. Unlike most template syntaxes, you do not need to interrupt your coding to explicitly denote server blocks within your HTML. See [Example](https://github.com/eshengsky/saker#example-示例) for preview.  
Saker是一个可以用于Node.js和浏览器端的模板引擎，轻量、强大、易于使用。其最大的特点是，尽可能地减少了模板文件中的额外字符和击键数，支持快速流畅的编码流程。不同于大多数的模板引擎语法，你无须打断你的编码来显式表明HTML中的服务器代码 —— Saker能够智能识别哪些是HTML哪些是服务器脚本。可以查看[示例](https://github.com/eshengsky/saker#example-示例)代码作为预览。

[![Build Status](https://travis-ci.org/eshengsky/saker.svg?branch=master)](https://travis-ci.org/eshengsky/saker)
[![NPM version](https://img.shields.io/npm/v/saker.svg?style=flat)](https://www.npmjs.com/package/saker)
<a href="https://www.npmjs.com/package/saker"><img src="https://img.shields.io/npm/dt/saker.svg" alt="NPM downloads" height="20"></a>

## Comparison 比较
Let's compare Saker with other hot template engines.  
Saker和当前较流行的几款模板引擎（Jade、Handlebars、ejs）的比较。

<table>
<tr>
    <th></th>
    <th>Jade (Pug)</th>
    <th>Handlebars</th>
    <th>ejs</th>
    <th>Saker</th>
</tr>
<tr>
    <td>
    Example<br>示例
    </td>
    <td>
    <pre><code>.item
    if(data.code > 0) {
        a(href='/product/' + data.id)
            span=data.productName
    }</code></pre>
    </td>
    <td>
    <pre><code>// add custom helper gto 添加自定义helper
handlebars.registerHelper("gto", function(code){
    return code > 0;
});
// view template 视图模板
&lt;div class='item'&gt;
    {{#gto data.code}}
        &lt;a href='/product/{{data.id}}'&gt;
            &lt;span&gt;{{data.productName}}&lt;/span&gt;
        &lt;/a&gt;
    {{/gto}}
&lt;/div&gt;</code></pre>
    </td>
    <td>
    <pre><code>&lt;div class='item'&gt;
    <%if(data.code > 0){%>
        &lt;a href='/product/<%=data.id%>'&gt;
            &lt;span&gt;<%=data.productName%>&lt;/span&gt;
        &lt;/a&gt;
    <%}%>
&lt;/div&gt;</code></pre>
    </td>
    <td>
        <pre><code>&lt;div class='item'&gt;
    @if(data.code > 0){
        &lt;a href='/product/@(data.id)'&gt;
            &lt;span&gt;@data.productName&lt;/span&gt;
        &lt;/a&gt;
    }
&lt;/div&gt;</code></pre>
        </td>
</tr>
<td>Layout, Partial & Cache<br>母版页，局部页和缓存</td>
<td align='center'>✔</td>
<td align='center'>✔</td>
<td align='center'>✔</td>
<td align='center'>✔</td>
</tr>
<tr>
<td>Native HTML<br>原生HTML</td>
<td>Not native HTML. Jade create new grammar, you and your team members must learn it firstly.<br>
非原生HTML语法。Jade创造了新的语法，你和你的所有团队成员都必须首先学习这些语法才能开始工作。
</td>
<td align='center'>✔</td>
<td align='center'>✔</td>
<td align='center'>✔</td>
</tr>
<tr>
<td>Expression support<br>表达式支持</td>
<td align='center'>✔</td>
<td>Expression is not supported in Handlebars, such as, '{{#if data.code > 0}}' is wrong, you have to use helper instead.<br>
Handlebars不支持表达式语法，例如：'{{#if data.code > 0}}' 就是语法错误的，你不得不使用自定义helper来实现。
</td>
<td align='center'>✔</td>
<td align='center'>✔</td>
</tr>
<tr>
<td>Easy to use<br>易于使用</td>
<td>Jade removes '<, >', it is all dependent on newline & whitespace to distinguish between the level of tags, it's easy to make a mistake, and usually you need to use a tool (such as 'HTML to Jade') to translate HTML to jade. So it looks brief, but not easy to use.<br>
Jade语法移除了HTML中的'<, >'，它完全依赖于换行和空格来区分标签的层级关系，这很容易出错。另外，通常你还需要使用某种工具（例如'HTML to Jade'）来将HTML转换成Jade。所以Jade看上去简约，但并不易于使用。
</td>
<td align='center'>✔</td>
<td>You have to wrap all backend codes within '<% %>' like ASP in ejs template, even if the '}' symbol must be '<% } %>', so ejs is easy to get start, but not convenient to write and read, especially the template contains complex logic.<br>
在ejs模板中，所有的后端代码都必须放在'<% %>'中，就跟ASP一样，即便是一个单独的'}'符号，也必须写成'<% } %>'。因此，ejs的上手非常容易，但读写并不是那么方便，尤其是在模板文件中包含了复杂逻辑的情况下。
</td>
<td align='center'>✔</td>
</tr>
</table>

## Live Demo 在线演示
You can test drive Saker online [here](https://eshengsky.github.io/saker/live-demo.html).  
你可以在[这里](https://eshengsky.github.io/saker/live-demo.html)测试Saker。

## Installation 安装

```bash
$ npm install saker
```

## Example 示例

This is a very simple and representative sample, it shows a name list when code is 1, and if the gender is female, the &lt;li&gt; tag has a class 'pink'.  
这是一个非常简单又很典型的例子，当code的值为1时会显示一个名单，如果gender字段是female，则&lt;li&gt;标签还会添加'pink'类。

#### data 数据

```json
{
    "code" : 1,
    "data": [{
        "id" : 1,
        "name" : "Sky",
        "gender" : "male"
    }, {
        "id" : 2,
        "name" : "Kathy",
        "gender" : "female"
    }]
}
```

#### template 模板

```html
@{ this.layout = null }

<h2>Name List</h2>
<article>
    @if(code === 1) {
        <ul>
            @{
                data.forEach(function(person) {
                    <li class="@(person.gender === 'female' ? 'pink' : '')">
                        <a href="/details/@person.id">@person.name</a>
                    </li>
                });
            }
        </ul>
    } else {
        <p>Sorry, no data!</p>
    }
</article>
```

#### result 结果

```html
<h2>Name List</h2>
<article>
    <ul>
        <li>
            <a href="/details/1">Sky</a>
        </li>
        <li class="pink">
            <a href="/details/2">Kathy</a>
        </li>
    </ul>
</article>
```

For more examples, please see `examples` folder, it includes 3 examples each based on:   
更多示例请查看`examples`目录，其包含了3个示例分别基于：
* the native [Node.js server](https://nodejs.org/dist/latest-v6.x/docs/api/http.html) 原生[Node.js server](https://nodejs.org/dist/latest-v6.x/docs/api/http.html)
* the [Express](http://expressjs.com/) framework [Express](http://expressjs.com/)框架
* the browser side 浏览器端

## Syntax 语法

As you see above, Saker uses '@' as the default mark symbol (support custom) - the codes after it represent server-side scripts.
The following is the syntax cheat sheet, for more details you can see [Syntax Reference](https://eshengsky.github.io/saker/syntax.html).  
正如你在上面看到的，Saker使用'@'作为默认的标记符号（支持自定义）——在这之后的代码都视作是服务器端脚本。下面是一个语法速查，更详细的文档请查看[Syntax Reference](https://eshengsky.github.io/saker/syntax.html)。

<table>
<tr>
    <th>Syntax<br>语法</th>
    <th>Example<br>示例</th>
    <th>Remarks<br>说明</th>
</tr>
<tr>
    <td>Implicit expression<br>隐式表达式</td>
    <td>@name</td>
    <td>
    Simply prefix with the '@' character to access a variable or a function. <i>Be aware that the output will be automatically HTML encoded.</i><br>
    简单地将'@'字符作为前缀即可访问一个变量或者函数。<i>注意：输出内容会被自动转义。</i>
    </td>
</tr>
<tr>
    <td>Explicit expression<br>显式表达式</td>
    <td>@('name: ' + name)</td>
    <td>
    The explicit impression should be used when you want to do something that might confuse the parser. For instance, if you need to access a variable in the middle of a string or if you want to do calculations/modifications to the output.<br>
    当你觉得你的代码可能会使解析器理解有误，你就应该使用显式表达式。例如，你需要在字符串当中插入变量，或者你想要对变量进行计算或修改后再输出。
    </td>
</tr>
<tr>
    <td>Unencoded expression<br>不转义表达式</td>
    <td>@this.raw(name)</td>
    <td>
    The same as the implicit expression, but the output will not be HTML encoded.<br>
    类似隐式表达式，区别在于输出结果不会被转义。
    </td>
</tr>
<tr>
    <td>code blocks<br>代码块</td>
    <td>@{<br>&nbsp;&nbsp;&nbsp;&nbsp;var name = 'Saker'; <br>&nbsp;&nbsp;&nbsp;&nbsp;&lt;span&gt;@name&lt;/span&gt;<br>}</td>
    <td>
    A Saker code block starts with a combination of the '@' character and the '{' character and ends with the '}' character. Inside of this, you can writing server-side scripts. <i>Amazing, you can mix HTML markup and the server-side scripts, Saker can distinguish them intelligently!</i><br>
    Saker代码块使用'@'和'{'联合字符作为开始，以'}'字符结束。在这之间，你可以书写服务端脚本。<i>你可以混淆HTML标记和服务端脚本，Saker能够智能区分它们！</i>
    </td>
</tr>
<tr>
    <td>Special code blocks<br>特殊代码块</td>
    <td>@if (code == '1') {<br>&nbsp;&nbsp;&nbsp;&nbsp;&lt;span&gt;Has data!&lt;/span&gt;<br>} else {<br>&nbsp;&nbsp;&nbsp;&nbsp;&lt;span&gt;No data!&lt;/span&gt;<br>}</td>
    <td>
    It's the special style code blocks, the example left is the same as:<br>这是特殊形式的代码块，左侧的示例等同于：<br>@{<br>&nbsp;&nbsp;&nbsp;&nbsp;if (code == '1') {<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;span&gt;Has data!&lt;/span&gt;<br>&nbsp;&nbsp;&nbsp;&nbsp;} else {<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;span&gt;No data!&lt;/span&gt;<br>&nbsp;&nbsp;&nbsp;&nbsp;}<br>}<br>Special code blocks support: @if...else if...else, @for..., @while..., @do...while..., @switch..., @try...catch...finally..., total 6 types.<br>
    特殊代码块支持：@if...else if...else, @for..., @while..., @do...while..., @switch..., @try...catch...finally..., 一共6种形式。
    </td>
</tr>
<tr>
    <td>Plain text inside a code block<br>代码块中的纯文本</td>
    <td>&lt;text&gt;Plain text goes here...&lt;/text&gt;</td>
    <td>
    Within a code block, you can output plain text by surrounding it with &lt;text&gt; tags, <i>the tag itself won't be included in the output to the browser.</i><br>
    在代码块中，你可以通过将文本包裹在&lt;text&gt;标签中来输出纯文本。<i>标签本身不会输出到浏览器端。</i>
    </td>
</tr>
<tr>
    <td>Server-side comment<br>服务器端注释</td>
    <td>@// This is inline comment<br><br>@* <br>&nbsp;&nbsp;&nbsp;&nbsp;Here's a Saker server-side multi-line comment<br>&nbsp;&nbsp;&nbsp;&nbsp;It won't be rendered to the browser<br> *@</td>
    <td>
    If you need to, you can easily write Saker comments in your code. They are a great alternative to HTML comments, <i>because the Saker comments won't be included in the output to the browser.</i><br>
    如果需要的话，你可以轻易地书写Saker注释，这是替换HTML注释的一个很好的选择，<i>因为Saker注释不会输出到浏览器端。</i>
    </td>
</tr>
<tr>
    <td>Output '@'<br>输出'@'</td>
    <td>eshengsky@@163.com</td>
    <td>
    Double '@' will output the symbol '@'.<br>
    连续的2个'@'将输出'@'符号。
    </td>
</tr>
</table>

## Test 测试

You can execute the following script in terminal to run test.  
你可以在终端执行下面的脚本来运行测试。
```bash
$ npm test
```

## License 许可
The MIT License (MIT)

Copyright (c) 2016 Sky

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
