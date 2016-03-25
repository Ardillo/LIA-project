/** 
* @description Set of short commonly used methods for handling HTML elements
* @author Ylian Saint-Hilaire
* @version v0.0.1b
*/

// Quick UI functions, a bit of a replacement for jQuery
//function Q(x) { if (document.getElementById(x) == null) { console.log('Invalid element: ' + x); } return document.getElementById(x); }                            // "Q"
function Q(x) { return document.getElementById(x); }                            // "Q"
function QS(x) { try { return Q(x).style; } catch (x) { } }                     // "Q" style
function QE(x, y) { try { Q(x).disabled = !y; } catch (x) { } }                 // "Q" enable
function QV(x, y) { try { QS(x).display = (y ? '' : 'none'); } catch (x) { } }  // "Q" visible
function QA(x, y) { Q(x).innerHTML += y; }                                      // "Q" append
function QH(x, y) { Q(x).innerHTML = y; }                                       // "Q" html

// Move cursor to end of input box
function inputBoxFocus(x) { Q(x).focus(); var v = Q(x).value; Q(x).value = ''; Q(x).value = v; }

// Binary encoding and decoding functions
function ReadShort(v, p) { return (v.charCodeAt(p) << 8) + v.charCodeAt(p + 1); }
function ReadShortX(v, p) { return (v.charCodeAt(p + 1) << 8) + v.charCodeAt(p); }
function ReadInt(v, p) { return (v.charCodeAt(p) * 0x1000000) + (v.charCodeAt(p + 1) << 16) + (v.charCodeAt(p + 2) << 8) + v.charCodeAt(p + 3); } // We use "*0x1000000" instead of "<<24" because the shift converts the number to signed int32.
function ReadIntX(v, p) { return (v.charCodeAt(p + 3) * 0x1000000) + (v.charCodeAt(p + 2) << 16) + (v.charCodeAt(p + 1) << 8) + v.charCodeAt(p); }
function ShortToStr(v) { return String.fromCharCode((v >> 8) & 0xFF, v & 0xFF); }
function ShortToStrX(v) { return String.fromCharCode(v & 0xFF, (v >> 8) & 0xFF); }
function IntToStr(v) { return String.fromCharCode((v >> 24) & 0xFF, (v >> 16) & 0xFF, (v >> 8) & 0xFF, v & 0xFF); }
function IntToStrX(v) { return String.fromCharCode(v & 0xFF, (v >> 8) & 0xFF, (v >> 16) & 0xFF, (v >> 24) & 0xFF); }
function MakeToArray(v) { if (!v || v == null || typeof v == 'object') return v; return [v]; }
function SplitArray(v) { return v.split(','); }
function Clone(v) { return JSON.parse(JSON.stringify(v)); }

// Move an element from one position in an array to a new position
function ArrayElementMove(arr, from, to) { arr.splice(to, 0, arr.splice(from, 1)[0]); };

// Print object for HTML
function ObjectToStringEx(x, c) {
    var r = "";
    if (x != 0 && (!x || x == null)) return "(Null)";
    if (x instanceof Array) { for (var i in x) { r += '<br />' + gap(c) + "Item #" + i + ": " + ObjectToStringEx(x[i], c + 1); } }
    else if (x instanceof Object) { for (var i in x) { r += '<br />' + gap(c) + i + " = " + ObjectToStringEx(x[i], c + 1); } }
    else { r += x; }
    return r;
}

// Print object for console
function ObjectToStringEx2(x, c) {
    var r = "";
    if (x != 0 && (!x || x == null)) return "(Null)";
    if (x instanceof Array) { for (var i in x) { r += '\r\n' + gap2(c) + "Item #" + i + ": " + ObjectToStringEx2(x[i], c + 1); } }
    else if (x instanceof Object) { for (var i in x) { r += '\r\n' + gap2(c) + i + " = " + ObjectToStringEx2(x[i], c + 1); } }
    else { r += x; }
    return r;
}

// Create an ident gap
function gap(c) { var x = ''; for (var i = 0; i < (c * 4) ; i++) { x += '&nbsp;'; } return x; }
function gap2(c) { var x = ''; for (var i = 0; i < (c * 4) ; i++) { x += ' '; } return x; }

// Print an object in html
function ObjectToString(x) { return ObjectToStringEx(x, 0); }
function ObjectToString2(x) { return ObjectToStringEx2(x, 0); }

// Convert a hex string to a raw string
function hex2rstr(d) {
    var r = '', m = ('' + d).match(/../g), t;
    while (t = m.shift()) r += String.fromCharCode('0x' + t);
    return r
}

// Convert a raw string to a hex string
function rstr2hex(input) {
    var hex_tab = "0123456789abcdef", r = "", x, i;
    for (i = 0; i < input.length; i++) { x = input.charCodeAt(i); r += hex_tab.charAt((x >>> 4) & 0x0F) + hex_tab.charAt(x & 0x0F); }
    return r;
}

// UTF-8 encoding & decoding functions
function encode_utf8(s) { return unescape(encodeURIComponent(s)); }
function decode_utf8(s) { return decodeURIComponent(escape(s)); }

// Convert a string into a blob
function data2blob(data) {
    var bytes = new Array(data.length);
    for (var i = 0; i < data.length; i++) bytes[i] = data.charCodeAt(i);
    var blob = new Blob([new Uint8Array(bytes)]);
    return blob;
}

// Generate random numbers
function random(max) { return Math.floor(Math.random() * max); }

// Trademarks
function trademarks(x) { return x.replace(/\(R\)/g, '&reg;').replace(/\(TM\)/g, '&trade;'); }
