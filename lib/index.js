'use strict';

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _inherits = function (subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _http = require('http');

var _http2 = _interopRequireWildcard(_http);

var _AppBuilder2 = require('app-builder');

var _AppBuilder3 = _interopRequireWildcard(_AppBuilder2);

var _Promise = require('bluebird');

var _Promise2 = _interopRequireWildcard(_Promise);

var _Environment = require('./environment');

var _Environment2 = _interopRequireWildcard(_Environment);

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
        return _Promise2['default'].reject(new Error('.listen can only be called once'));
      }var appFn = this.build();
      this.httpServer = _http2['default'].createServer(function (req, res) {
        appFn.call(_this, _Environment2['default'].create(req, res));
      });
      return new _Promise2['default'](function (res) {
        var _httpServer;

        return (_httpServer = _this.httpServer).listen.apply(_httpServer, args.concat([res]));
      });
    }
  }]);

  return Server;
})(_AppBuilder3['default']);

exports['default'] = Server;
exports.Environment = _Environment2['default'];