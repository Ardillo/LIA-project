/** 
* @description Intel(r) AMT WSMAN communication using Node.js TLS
* @author Ylian Saint-Hilaire
* @version v0.2.0
*/

// Construct a MeshServer object
var CreateWsmanComm = function (host, port, user, pass, tls) {
    var obj = {};
    obj.PendingAjax = [];               // List of pending AJAX calls. When one frees up, another will start.
    obj.ActiveAjaxCount = 0;            // Number of currently active AJAX calls
    obj.MaxActiveAjaxCount = 1;         // Maximum number of activate AJAX calls at the same time.
    obj.FailAllError = 0;               // Set this to non-zero to fail all AJAX calls with that error status, 999 causes responses to be silent.
    obj.challengeParams = null;
    obj.noncecounter = 1;
    obj.authcounter = 0;

    obj.Address = '/wsman';
    obj.user = user;
    obj.pass = pass;
    obj.challengeParams = null;
    obj.noncecounter = 1;
    obj.authcounter = 0;
    obj.cnonce = Math.random().toString(36).substring(7); // Generate a random client nonce

    obj.net = require('net');
    obj.tls = require('tls');
    obj.crypto = require('crypto');
    obj.socket = null;
    obj.socketState = 0;

    obj.host = host;
    obj.port = port;
    obj.user = user;
    obj.pass = pass;
    obj.xtls = tls;

    // Private method
    //obj.Debug = function (msg) { /*console.log(msg);*/ }

    // Private method
    //   pri = priority, if set to 1, the call is high priority and put on top of the stack.
    obj.PerformAjax = function (postdata, callback, tag, pri) {
        if ((obj.ActiveAjaxCount == 0 || ((obj.ActiveAjaxCount < obj.MaxActiveAjaxCount) && (obj.challengeParams != null))) && obj.PendingAjax.length == 0) {
            // There are no pending AJAX calls, perform the call now.
            obj.PerformAjaxEx(postdata, callback, tag);
        } else {
            // If this is a high priority call, put this call in front of the array, otherwise put it in the back.
            if (pri == 1) { obj.PendingAjax.unshift([postdata, callback, tag]); } else { obj.PendingAjax.push([postdata, callback, tag]); }
        }
    }

    // Private method
    obj.PerformNextAjax = function () {
        if (obj.ActiveAjaxCount >= obj.MaxActiveAjaxCount || obj.PendingAjax.length == 0) return;
        var x = obj.PendingAjax.shift();
        obj.PerformAjaxEx(x[0], x[1], x[2]);
        obj.PerformNextAjax();
    }

    // Private method
    obj.PerformAjaxEx = function (postdata, callback, tag) {
        if (obj.FailAllError != 0) { obj.gotNextMessagesError({ status: obj.FailAllError }, 'error', null, [postdata, callback, tag]); return; }
        if (!postdata) postdata = "";
        //obj.Debug("SEND: " + postdata); // DEBUG
        obj.ActiveAjaxCount++;
        return obj.PerformAjaxExNodeJS(postdata, callback, tag);
    }

    // NODE.js specific private method
    obj.pendingAjaxCall = [];

    // NODE.js specific private method
    obj.PerformAjaxExNodeJS = function (postdata, callback, tag) { obj.PerformAjaxExNodeJS2(postdata, callback, tag, 5); }

    // NODE.js specific private method
    obj.PerformAjaxExNodeJS2 = function (postdata, callback, tag, retry) {
        if (retry <= 0 || obj.FailAllError != 0) {
            // Too many retry, fail here.
            obj.ActiveAjaxCount--;
            if (obj.FailAllError != 999) obj.gotNextMessages(null, 'error', { status: ((obj.FailAllError == 0) ? 408 : obj.FailAllError) }, [postdata, callback, tag]); // 408 is timeout error
            obj.PerformNextAjax();
            return;
        }
        obj.pendingAjaxCall.push([postdata, callback, tag, retry]);
        if (obj.socketState == 0) { obj.xxConnectHttpSocket(); }
        else if (obj.socketState == 2) { obj.sendRequest(postdata); }
    }

    // NODE.js specific private method
    obj.sendRequest = function (postdata) {
        var h = "POST /wsman HTTP/1.1\r\n";
        if (obj.challengeParams != null) {
            var response = hex_md5(hex_md5(obj.user + ':' + obj.challengeParams["realm"] + ':' + obj.pass) + ':' + obj.challengeParams["nonce"] + ':' + obj.noncecounter + ':' + obj.cnonce + ':' + obj.challengeParams["qop"] + ':' + hex_md5('POST:/wsman'));
            h += 'Authorization: ' + obj.renderDigest({ "username": obj.user, "realm": obj.challengeParams["realm"], "nonce": obj.challengeParams["nonce"], "uri": "/wsman", "qop": obj.challengeParams["qop"], "response": response, "nc": obj.noncecounter++, "cnonce": obj.cnonce }) + '\r\n';
        }
        h += 'Content-Length: ' + postdata.length + '\r\n\r\n' + postdata;
        obj.xxSend(h);
        //obj.Debug("SEND: " + h); // Display send packet
    }

    // NODE.js specific private method
    obj.parseDigest = function (header) {
        var t = header.substring(7).split(',');
        for (i in t) t[i] = t[i].trim();
        return t.reduce(function (obj, s) { var parts = s.split('='); obj[parts[0]] = parts[1].replace(new RegExp('\"', 'g'), ''); return obj; }, {})
    }

    // NODE.js specific private method
    obj.renderDigest = function (params) {
        var paramsnames = [];
        for (i in params) { paramsnames.push(i); }
        return 'Digest ' + paramsnames.reduce(function (s1, ii) { return s1 + ',' + ii + '="' + params[ii] + '"' }, '').substring(1);
    }

    // NODE.js specific private method
    obj.xxConnectHttpSocket = function () {
        //obj.Debug("xxConnectHttpSocket");
        obj.socketParseState = 0;
        obj.socketAccumulator = '';
        obj.socketHeader = null;
        obj.socketData = '';
        obj.socketState = 1;
        if (obj.xtls == false) {
            obj.socket = new obj.net.Socket();
            obj.socket.setEncoding('binary');
            obj.socket.on('data', obj.xxOnSocketData);
            obj.socket.on('close', obj.xxOnSocketClosed);
            obj.socket.connect(obj.port, obj.host, obj.xxOnSocketConnected);
        } else {
            obj.socket = obj.tls.connect(obj.port, obj.host, { secureProtocol: 'TLSv1_method', rejectUnauthorized: false }, obj.xxOnSocketConnected);
            obj.socket.setEncoding('binary');
            obj.socket.on('data', obj.xxOnSocketData);
            obj.socket.on('close', obj.xxOnSocketClosed);
        }
        obj.socket.setNoDelay(true); // Disable nagle. We will encode each WSMAN request as a single send block and want to send it at once. This may help Intel AMT handle pipelining?
    }

    // NODE.js specific private method
    obj.xxOnSocketConnected = function () {
        //obj.Debug("xxOnSocketConnected");
        obj.socketState = 2;
        for (i in obj.pendingAjaxCall) { obj.sendRequest(obj.pendingAjaxCall[i][0]); }
    }

    // NODE.js specific private method
    obj.xxOnSocketData = function (data) {
        // obj.Debug("xxOnSocketData (" + data.length + "): " + data);

        if (typeof data === 'object') {
            // This is an ArrayBuffer, convert it to a string array (used in IE)
            var binary = "", bytes = new Uint8Array(data), length = bytes.byteLength;
            for (var i = 0; i < length; i++) { binary += String.fromCharCode(bytes[i]); }
            data = binary;
        }
        else if (typeof data !== 'string') return;

        obj.socketAccumulator += data;
        while (true) {
            if (obj.socketParseState == 0) {
                var headersize = obj.socketAccumulator.indexOf("\r\n\r\n");
                if (headersize < 0) return;
                //obj.Debug(obj.socketAccumulator.substring(0, headersize)); // Display received HTTP header
                obj.socketHeader = obj.socketAccumulator.substring(0, headersize).split("\r\n");
                obj.socketAccumulator = obj.socketAccumulator.substring(headersize + 4);
                obj.socketParseState = 1;
                obj.socketData = '';
                obj.socketXHeader = { Directive: obj.socketHeader[0].split(' ') };
                for (i in obj.socketHeader) {
                    if (i != 0) {
                        var x2 = obj.socketHeader[i].indexOf(':');
                        obj.socketXHeader[obj.socketHeader[i].substring(0, x2).toLowerCase()] = obj.socketHeader[i].substring(x2 + 2);
                    }
                }
            }
            if (obj.socketParseState == 1) {
                var csize = -1;
                if (obj.socketXHeader["content-length"] != undefined) {
                    // The body length is specified by the content-length
                    csize = parseInt(obj.socketXHeader["content-length"]);
                    if (obj.socketAccumulator.length < csize) return;
                    var data = obj.socketAccumulator.substring(0, csize);
                    obj.socketAccumulator = obj.socketAccumulator.substring(csize);
                    obj.socketData = data;
                    csize = 0;
                } else {
                    // The body is chunked
                    var clen = obj.socketAccumulator.indexOf("\r\n");
                    if (clen < 0) return; // Chunk length not found, exit now and get more data.
                    // Chunk length if found, lets see if we can get the data.
                    csize = parseInt(obj.socketAccumulator.substring(0, clen), 16);
                    if (obj.socketAccumulator.length < clen + 2 + csize + 2) return;
                    // We got a chunk with all of the data, handle the chunck now.
                    var data = obj.socketAccumulator.substring(clen + 2, clen + 2 + csize);
                    obj.socketAccumulator = obj.socketAccumulator.substring(clen + 2 + csize + 2);
                    obj.socketData += data;
                }
                if (csize == 0) {
                    //obj.Debug("xxOnSocketData DONE: (" + obj.socketData.length + "): " + obj.socketData);
                    obj.xxProcessHttpResponse(obj.socketXHeader, obj.socketData);
                    obj.socketParseState = 0;
                    obj.socketHeader = null;
                }
            }
        }
    }

    // NODE.js specific private method
    obj.xxProcessHttpResponse = function (header, data) {
        //obj.Debug("xxProcessHttpResponse: " + header.Directive[1]);

        var s = parseInt(header.Directive[1]);
        if (isNaN(s)) s = 500;
        if (s == 401 && ++(obj.authcounter) < 3) {
            obj.challengeParams = obj.parseDigest(header['www-authenticate']); // Set the digest parameters, after this, the socket will close and we will auto-retry
            obj.socket.end();
        } else {
            var r = obj.pendingAjaxCall.shift();
            if (r == null || r.length < 1) { console.log("pendingAjaxCall error, " + r); return; }
            //if (s != 200) { obj.Debug("Error, status=" + s + "\r\n\r\nreq=" + r[0] + "\r\n\r\nresp=" + data); } // Debug: Display the request & response if something did not work.
            obj.authcounter = 0;
            obj.ActiveAjaxCount--;
            obj.gotNextMessages(data, 'success', { status: s }, r);
            obj.PerformNextAjax();
        }
    }

    // NODE.js specific private method
    obj.xxOnSocketClosed = function (data) {
        //obj.Debug("xxOnSocketClosed");
        obj.socketState = 0;
        if (obj.socket != null) { obj.socket.destroy(); obj.socket = null; }
        if (obj.pendingAjaxCall.length > 0) {
            var r = obj.pendingAjaxCall.shift();
            var retry = r[3];
            obj.PerformAjaxExNodeJS2(r[0], r[1], r[2], --retry);
        }
    }

    // NODE.js specific private method
    obj.xxSend = function (x) {
        if (obj.socketState == 2) {
            //console.log("SEND(" + x.length + "): " + x);
            obj.socket.write(new Buffer(x, "binary"));
        }
    }

    // Cancel all pending queries with given status
    obj.CancelAllQueries = function (s) {
        while (obj.PendingAjax.length > 0) { var x = obj.PendingAjax.shift(); x[1](null, s, x[2]); }
        if (obj.socket != null) { obj.socket.destroy(); obj.socket = null; obj.socketState = 0; }
    }

    // Private method
    obj.gotNextMessages = function (data, status, request, callArgs) {
        if (obj.FailAllError == 999) return;
        if (obj.FailAllError != 0) { callArgs[1](null, obj.FailAllError, callArgs[2]); return; }
        if (request.status != 200) { callArgs[1](null, request.status, callArgs[2]); return; }
        callArgs[1](data, 200, callArgs[2]);
    }

    // Private method
    obj.gotNextMessagesError = function (request, status, errorThrown, callArgs) {
        if (obj.FailAllError == 999) return;
        if (obj.FailAllError != 0) { callArgs[1](null, obj.FailAllError, callArgs[2]); return; }
        callArgs[1](obj, null, { Header: { HttpError: request.status } }, request.status, callArgs[2]);
    }

    return obj;
}

