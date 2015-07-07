/*
uqsso
UQ single sign-on for zone projects

Copyright (c) 2015, Alex Wilson and the University of Queensland
All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

 * Redistributions of source code must retain the above copyright notice,
   this list of conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation and/or
   other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT
SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR
BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY
WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

var kvd = require('eait-kvd');
var bunyan = require('bunyan');

function makeHandler(opts) {
    if (opts === undefined)
        opts = {};

    var log = opts.log;
    if (!log)
        log = bunyan.createLogger({name: 'uqsso'});
    log = log.child({middleware: 'uqsso'});

    if (!opts.kvdServer)
        opts.kvdServer = '172.23.84.20';
    if (!opts.redirectBase)
        opts.redirectBase = 'https://api.uqcloud.net/login/';
    if (!opts.cookieName)
        opts.cookieName = 'EAIT_WEB';
    if (opts.secureOnly === undefined)
        opts.secureOnly = false;

    var kvdc = new kvd.Client(opts.kvdServer, {log: log});
    var publicParts = [];
    var skr = new RegExp('^/_set_cookie/([^/]+)/(.+)$')

    var f = function(req, res, next) {
        var m;
        if ((m = skr.exec(req.url))) {
            var cookie = m[1];
            var finalUri = m[2];
            res.cookie(opts.cookieName, cookie, {
                expires: new Date(Date.now() + 7200000),
                secure: opts.secureOnly});
            res.set('Pragma', 'no-cache');
            res.set('Cache-Control', 'no-cache, must-revalidate');
            res.redirect(302, finalUri);
            return res.send();
        }

        function noAuth() {
            for (var i = 0; i < publicParts.length; ++i)
                if (publicParts[i].exec(req.url))
                    return next();
            var uri = opts.redirectBase + (opts.secureOnly ? 'https' : 'http') +
                '://' + req.hostname + req.url;
            res.set('Pragma', 'no-cache');
            res.set('Cache-Control', 'no-cache, must-revalidate');
            res.redirect(302, uri);
            return res.send();
        }

        var key = req.cookies[opts.cookieName];
        if (key) {
            kvdc.get(key, function(err, val) {
                if (err)
                    return noAuth();
                if (!val)
                    return noAuth();
                req.user = val;
                return next();
            });
        } else {
            return noAuth();
        }
    };

    f.public = function(rx) {
        if (typeof(rx) === 'string')
            rx = new RegExp(rx);
        if (typeof(rx) !== 'object' || !(rx instanceof RegExp))
            throw new Error('public() must be passed a RegExp object or string');
        publicParts.push(rx);
    }

    return f;
}

module.exports = makeHandler;
