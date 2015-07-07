## node-uqsso

UQ Single Sign-On support for uqcloud.net zones using node.js.

Designed for use with `express` or `restify`.

## Example

```shell
npm install uqsso express cookie-parser
```

```javascript
var uqsso = require('uqsso');
var express = require('express');
var cookieParser = require('cookie-parser');

var app = express();

var sso = uqsso();
sso.public('^/$');

app.use(cookieParser());
app.use(sso);

app.get('/authtest', function(req, res, next) {
    return res.send(JSON.stringify(req.user));
});

app.get('/', function(req, res, next) {
    return res.send('hi');
});

app.listen(80);
```
