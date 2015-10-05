"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

exports["default"] = function (x) {
  return new Environment(x);
};

var Environment = function Environment(_ref) {
  var req = _ref.req;
  var res = _ref.res;

  _classCallCheck(this, Environment);

  this.req = req;
  this.res = res;
};

exports.Environment = Environment;