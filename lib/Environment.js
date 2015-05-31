"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Environment = function Environment(_ref) {
  var request = _ref.request;
  var response = _ref.response;

  _classCallCheck(this, Environment);

  this.request = request;
  this.response = response;
};

exports.Environment = Environment;

exports["default"] = function (x) {
  return new Environment(x);
};