'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x3, _x4, _x5) { var _again = true; _function: while (_again) { var object = _x3, property = _x4, receiver = _x5; desc = parent = getter = undefined; _again = false; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x3 = parent; _x4 = property; _x5 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _appBuilder = require('app-builder');

var _Environment = require('./Environment');

var _Environment2 = _interopRequireDefault(_Environment);

var _HttpServer = require('./HttpServer');

var _default = require('./default');

var Server = (function (_AppBuilder) {
  function Server() {
    var webserver = arguments[0] === undefined ? new _HttpServer.HttpServer() : arguments[0];
    var contextFactory = arguments[1] === undefined ? function (x) {
      return new _Environment.Environment(x);
    } : arguments[1];

    _classCallCheck(this, Server);

    _get(Object.getPrototypeOf(Server.prototype), 'constructor', this).call(this);
    this.createContext = contextFactory;
    this.webserver = webserver;
  }

  _inherits(Server, _AppBuilder);

  _createClass(Server, [{
    key: 'listen',
    value: function listen() {
      var _webserver,
          _this = this;

      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      var appFn = this.build();
      this.webserver.onRequest(function (req, res) {
        appFn(_this.createContext({ req: req, res: res }));
      });
      return (_webserver = this.webserver).listen.apply(_webserver, args);
    }
  }, {
    key: 'useDefault',
    value: function useDefault() {
      return this.use(_default.defaultHandler);
    }
  }, {
    key: 'close',
    value: function close() {
      return this.webserver.close();
    }
  }]);

  return Server;
})(_appBuilder.AppBuilder);

exports.Server = Server;
exports.Environment = _Environment.Environment;
exports.HttpServer = _HttpServer.HttpServer;

exports['default'] = function () {
  return new Server();
};