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
                data.forEach(function(item) {
                    <li class="@(item.gender === 'female' ? 'pink' : '')">
                        <a href="/details/@item.id">@item.name</a>
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

As you see above, Saker uses '@' as the core symbol - the code behind it will be treated as server-side scripts.
The following is quick reference:


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