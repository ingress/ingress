'use strict';

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _http = require('http');

var _http2 = _interopRequireWildcard(_http);

var _AppBuilder2 = require('app-builder');

var _Environment = require('./Environment');

var _HttpServer = require('./HttpServer.js');

var Server = (function (_AppBuilder) {
  function Server(webserver) {
    _classCallCheck(this, Server);

    _get(Object.getPrototypeOf(Server.prototype), 'constructor', this).call(this);
    this.webserver = webserver;
  }

  _inherits(Server, _AppBuilder);

  _createClass(Server, [{
    key: 'listen',
    value: function listen() {
      var _this = this;

      var _webserver;

      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      var appFn = this.build();
      this.webserver.onRequest(function (request, response) {
        appFn.call(_this, new _Environment.Environment({ request: request, response: response }));
      });
      return (_webserver = this.webserver).listen.apply(_webserver, args);
    }
  }, {
    key: 'close',
    value: function close() {
      return this.webserver.close();
    }
  }]);

  return Server;
})(_AppBuilder2.AppBuilder);

exports['default'] = function () {
  return new Server(new _HttpServer.HttpServer());
};

exports.Environment = _Environment.Environment;
exports.HttpServer = _HttpServer.HttpServer;
exports.Server = Server;