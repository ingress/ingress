'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

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

exports.WebServer = WebServer;