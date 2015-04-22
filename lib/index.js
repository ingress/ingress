'use strict';

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

var _bind = Function.prototype.bind;

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _inherits = function (subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _http = require('http');

var _http2 = _interopRequireWildcard(_http);

var _AppBuilder2 = require('app-builder');

var _Environment = require('./environment');

var Server = (function (_AppBuilder) {
  function Server() {
    _classCallCheck(this, Server);

    if (_AppBuilder != null) {
      _AppBuilder.apply(this, arguments);
    }
  }

  _inherits(Server, _AppBuilder);

  _createClass(Server, [{
    key: 'listen',
    value: function listen() {
      var _this = this;

      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      if (this.httpServer) {
        return Promise.reject(new Error('.listen can only be called once'));
      }var appFn = this.build();
      this.httpServer = _http2['default'].createServer(function (request, response) {
        appFn.call(_this, new _Environment.Environment({ request: request, response: response }));
      });
      return new Promise(function (res) {
        var _httpServer;

        return (_httpServer = _this.httpServer).listen.apply(_httpServer, args.concat([res]));
      });
    }
  }]);

  return Server;
})(_AppBuilder2.AppBuilder);

exports.Server = Server;

exports['default'] = function () {
  for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
    args[_key2] = arguments[_key2];
  }

  return new (_bind.apply(Server, [null].concat(args)))();
};

exports.Environment = _Environment.Environment;