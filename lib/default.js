'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.defaultHandler = defaultHandler;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _stream = require('stream');

var _stream2 = _interopRequireDefault(_stream);

var emptyStatuses = {
  204: true,
  205: true,
  304: true
},
    objToString = ({}).toString,
    isError = function isError(e) {
  e && typeof e === 'object' && typeof e.message === 'string' && objToString.call(e) === '[object Error]';
},
    looksLikeHtmlRE = /^\s*</;

function statusResponse(status, message, res) {
  res._headers = {};
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Length', Buffer.byteLength(message));
  res.end(message);
}

function cannotRespond(res) {
  return res.finished || res.headersSent || res.socket && !res.socket.writable;
}

function defaultHandler(ctx, next) {
  next().then(function () {
    var body = ctx.body;
    var res = ctx.res;
    if (cannotRespond(res)) {
      return;
    }
    if (emptyStatuses[res.statusCode]) {
      res._headers = {};
      res.statusCode = res.statusCode || 204;
      return res.end();
    }
    if (!body) {
      return statusResponse(res.statusCode, res.statusMessage, res);
    }
    if (typeof body === 'string') {
      res.setHeader('Content-Type', 'text/' + (looksLikeHtmlRE.test(body) ? 'html' : 'plain'));
      res.setHeader('Content-Length', Buffer.byteLength(body));
      return res.end(body);
    }
    if (Buffer.isBuffer(body)) {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', body.length);
      return res.end(body);
    }
    if (body instanceof _stream2['default']) {
      res.setHeader('Content-Type', 'application/octet-stream');
      //todo cleanup, headers
      return body.pipe(res);
    }
    body = JSON.stringify(body);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Length', Buffer.byteLength(body));
    res.end(body);
  }, function (error) {
    var res = ctx.res;
    if (cannotRespond(res)) {
      return;
    }
    if (!isError(error)) {
      throw new TypeError('Non-error thrown: ', error);
    }
    if ('number' !== typeof error.status) {
      res.statusCode = 500;
    }
    if ('ENOENT' === error.code) {
      res.statusCode = 404;
    }
    statusResponse(res.statusCode, res.statusMessage, res);
  });
}