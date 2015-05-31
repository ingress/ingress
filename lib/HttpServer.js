'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _http = require('http');

var _AbstractWebServerJs = require('./AbstractWebServer.js');

var HttpServer = (function (_WebServer) {
  function HttpServer() {
    _classCallCheck(this, HttpServer);

    _get(Object.getPrototypeOf(HttpServer.prototype), 'constructor', this).call(this);
    this.server = new _http.Server();
    this.isListening = false;
  }

  _inherits(HttpServer, _WebServer);

  _createClass(HttpServer, [{
    key: 'onRequest',
    value: function onRequest(fn) {
      this.server.on('request', fn);
    }
  }, {
    key: 'listen',
    value: function listen() {
      var _this = this;

      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      if (this.isListening) {
        return Promise.reject(new Error('.listen can only be called once'));
      }
      this.isListening = true;
      return new Promise(function (res) {
        var _server;

        return (_server = _this.server).listen.apply(_server, args.concat([res]));
      });
    }
  }, {
    key: 'close',
    value: function close() {
      var _this2 = this;

      return new Promise(function (res) {
        return _this2.server.close(res);
      });
    }
  }]);

  return HttpServer;
})(_AbstractWebServerJs.WebServer);

exports.HttpServer = HttpServer;