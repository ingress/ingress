"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Request = function Request() {
  _classCallCheck(this, Request);
};

var Response = function Response() {
  _classCallCheck(this, Response);
};

var Environment = (function () {
  function Environment(_ref) {
    var req = _ref.req;
    var res = _ref.res;

    _classCallCheck(this, Environment);

    this.req = req;
    this.res = res;
    this.reqeust = new Request(req);
    this.response = new Response(res);
  }

  _createClass(Environment, [{
    key: "requestBody",
    get: function () {}
  }]);

  return Environment;
})();

exports.Environment = Environment;

exports["default"] = function (x) {
  return new Environment(x);
};