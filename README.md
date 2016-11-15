# Saker
Saker is a template engine for [Node.js](https://nodejs.org) and browsers, it is lightweight, powerfull and easy to use.

[![Build Status](https://travis-ci.org/eshengsky/saker.svg?branch=master)](https://travis-ci.org/eshengsky/saker)
[![NPM version](https://img.shields.io/npm/v/saker.svg?style=flat)](https://www.npmjs.com/package/saker)

## Why Saker

There are some template engines I believe you know, such as [Pug](https://github.com/pugjs/pug), [EJS](https://github.com/tj/ejs), [Handlebars](https://github.com/wycats/handlebars.js)... So, why choose Saker?

|                              | Pug           | EJS           | Handlebars    | Saker         | *Note*                                                                                                   |
|------------------------------|:-------------:|:-------------:|:-------------:|:-------------:|--------------------------------------------------------------------------------------------------------  |
|Support expression            | Yes           | Yes           | **No**        | Yes           | *Handlebars is 'no logic' template, so it dose not support expression, but you can use 'helper' instead.*|
|Support layout & partial view | Yes           | Yes           | Yes           | Yes           | *They all support layout and partial view.*                                                              |
|Easy to lean & use            | **No**        | Yes           | Yes           | Yes           | *Pug create new grammar, it's not the HTML markup language, you need to go to a special study.*          |
|Code simple & clear           | Yes           | **No**        | Yes           | Yes           | *EJS uses '<% %>' to distinguish between HTML markup and server-side scripts, it looks ugly and complex.*|

## Installation

```bash
$ npm install saker
```

## Examples
``` html
<h2>Product List</h2>
<article>
    @if (code === 1) {
        <ul>
            @{
                data.forEach(function(item){
                    <li>
                        <a href="@item.href">@item.productName</a>
                    </li>
                });
            }
        </ul>
    } else {
        <p>No data!</p>
    }
</article>
```
The code looks clean and graceful, isn't it?  
For more examples, please see `examples` folder, it includes 3 examples each based on: 
* the native [Node.js server](https://nodejs.org/dist/latest-v6.x/docs/api/http.html)
* the [Express](http://expressjs.com/) framework
* the browser side


## Syntax

As you see above, Saker uses '@' as the core symbol - the code behind it will be treated as server-side scripts.
The following are common cases:
