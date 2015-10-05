'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _http = require('http');

var HttpServer = (function () {
  function HttpServer() {
    _classCallCheck(this, HttpServer);

    this.server = new _http.Server();
    this.isListening = false;
  }

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
})();

exports.HttpServer = HttpServer;