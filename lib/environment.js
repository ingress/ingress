"use strict";

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var Environment = (function () {
  function Environment(request, response) {
    _classCallCheck(this, Environment);

    this.request = request;
    this.response = response;
  }

  _createClass(Environment, null, [{
    key: "create",
    value: function create(req, res) {
      return new Environment(req, res);
    }
  }]);

  return Environment;
})();

exports["default"] = Environment;
module.exports = exports["default"];