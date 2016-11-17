# Saker
Saker is a template engine for [Node.js](https://nodejs.org) and browsers, it is lightweight, powerfull and easy to use.

[![Build Status](https://travis-ci.org/eshengsky/saker.svg?branch=master)](https://travis-ci.org/eshengsky/saker)
[![NPM version](https://img.shields.io/npm/v/saker.svg?style=flat)](https://www.npmjs.com/package/saker)

## Installation

```bash
$ npm install saker
```

## Example

This is a very simple and representative sample, it shows a name list when code is 1, and if the gender is female, the &lt;li&gt; tag has a class 'pink'.

#### data

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

#### template

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

#### result

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

The code looks clean and graceful, isn't it?  
For more examples, please see `examples` folder, it includes 3 examples each based on: 
* the native [Node.js server](https://nodejs.org/dist/latest-v6.x/docs/api/http.html)
* the [Express](http://expressjs.com/) framework
* the browser side

## Syntax

As you see above, Saker uses '@' as the mark symbol - the codes after it represent server-side scripts.
The following is quick reference:

|Syntax                         |Example   |Remarks|
|-------------------------------|----------|-------|
|Implicit expression            |@name|Simply prefix with the @ character to access a variable or a function. *Be aware that the output will be automatically HTML encoded.*|
|Explicit expression            |@('name: ' + name)|The explicit impression should be used when you want to do something that might otherwise confuse the parser. For instance, if you need to access a variable in the middle of a string or if you want to do calculations/modifications to the output.|
|Unencoded expression           |@this.raw(name)|The same as the implicit expression, but the output will not be HTML encoded.|
|Multi-statement code blocks    |@{<br>&nbsp;&nbsp;&nbsp;&nbsp;var name = 'Saker'; <br>&nbsp;&nbsp;&nbsp;&nbsp;&lt;span&gt;@name&lt;/span&gt;<br>}|A Saker code block starts with a combination of the @ character and the { character and ends with the } character. Inside of this, you're now writing server-side scripts. *Amazing, you can mix HTML markup and the server-side scripts, Saker can distinguish them intelligently!*|
|Special code blocks            |@if (code == '1') {<br>&nbsp;&nbsp;&nbsp;&nbsp;&lt;span&gt;Has data!&lt;/span&gt;<br>} else {<br>&nbsp;&nbsp;&nbsp;&nbsp;&lt;span&gt;No data!&lt;/span&gt;<br>}|It's the special style code blocks, the example left is the same as:<br>@{<br>&nbsp;&nbsp;&nbsp;&nbsp;if (code == '1') {<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;span&gt;Has data!&lt;/span&gt;<br>&nbsp;&nbsp;&nbsp;&nbsp;} else {<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;span&gt;No data!&lt;/span&gt;<br>&nbsp;&nbsp;&nbsp;&nbsp;}<br>}<br>Special code blocks support: @if...else if...else, @for..., @while..., @do...while..., @switch..., @try...catch...finally..., the 6 types.|
|Plain text inside a code block |&lt;text&gt;Plain text goes here...&lt;/text&gt;|When you're inside a code block, you can output plain text by surrounding it with &lt;text&gt; tags, *the tag itself won't be included in the output to the browser*.|
|Server-side comment            |@// This is inline comment<br><br>@* <br>&nbsp;&nbsp;&nbsp;&nbsp;Here's a Saker server-side multi-line comment<br>&nbsp;&nbsp;&nbsp;&nbsp;It won't be rendered to the browser<br> *@|If you need to, you can easily write Saker comments in your code. They are a great alternative to HTML comments, *because the Saker comments won't be included in the output to the browser*.|
|Output @                       |eshengsky@@163.com|Double @ will output the symbol @.|

## Test

You can execute the following script in terminal to run test.
```bash
$ npm test
```

## License
The MIT License (MIT)

Copyright (c) 2016 Sky

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.