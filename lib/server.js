'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _appBuilder = require('app-builder');

var _context = require('./context');

var _context2 = _interopRequireDefault(_context);

var _httpServer = require('./http-server');

var _default = require('./default');

exports['default'] = function () {
  return new Server();
};

var Server = (function () {
  function Server() {
    var webserver = arguments[0] === undefined ? new _httpServer.HttpServer() : arguments[0];
    var contextFactory = arguments[1] === undefined ? function (x) {
      return new _context.Context(x);
    } : arguments[1];

    _classCallCheck(this, Server);

    this.builder = new _appBuilder.AppBuilder();
    this.createContext = contextFactory;
    this.webserver = webserver;
  }

  _createClass(Server, [{
    key: 'use',
    value: function use(mw) {
      this.builder.use(mw);
      return this;
    }
  }, {
    key: 'useDefault',
    value: function useDefault() {
      var onError = arguments[0] === undefined ? function () {} : arguments[0];

      this.onError = onError;
      return this;
    }
  }, {
    key: 'build',
    value: function build() {
      var _this = this;

      var appFn = this.builder.build(),
          errorHandler = this.onError;
      return function (req, res) {
        var context = _this.createContext({ req: req, res: res }),
            contextPromise = appFn(context);
        if (errorHandler) {
          contextPromise.then(_default.defaultHandler, function (error) {
            errorHandler(context, error);
            (0, _default.defaultError)(context);
          });
        }
      };
    }
  }, {
    key: 'listen',
    value: function listen() {
      var _webserver;

      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      this.webserver.onRequest(this.build());
      return (_webserver = this.webserver).listen.apply(_webserver, args);
    }
  }, {
    key: 'close',
    value: function close() {
      return this.webserver.close();
    }
  }]);

  return Server;
})();

exports.Server = Server;
exports.Context = _context.Context;
exports.HttpServer = _httpServer.HttpServer;