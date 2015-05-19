'use strict';

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _http = require('http');

var _http2 = _interopRequireWildcard(_http);

function getUsageError(method) {
  return new Error('Method "' + method + '" must be implemented');
}

var WebServer = (function () {
  function WebServer() {
    _classCallCheck(this, WebServer);
  }

  _createClass(WebServer, [{
    key: 'onRequest',
    value: function onRequest() {
      throw getUsageError('onRequest');
    }
  }, {
    key: 'listen',
    value: function listen() {
      throw getUsageError('listen');
    }
  }, {
    key: 'close',
    value: function close() {
      throw getUsageError('close');
    }
  }]);

  return WebServer;
})();

var HttpServer = (function (_WebServer) {
  function HttpServer() {
    _classCallCheck(this, HttpServer);

    _get(Object.getPrototypeOf(HttpServer.prototype), 'constructor', this).call(this);
    this.server = _http2['default'].createServer();
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
})(WebServer);

exports.HttpServer = HttpServer;
exports.WebServer = WebServer;