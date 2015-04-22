"use strict";

var _bind = Function.prototype.bind;

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var Environment = function Environment(_ref) {
  var request = _ref.request;
  var response = _ref.response;

  _classCallCheck(this, Environment);

  this.request = request;
  this.response = response;
};

exports.Environment = Environment;

exports["default"] = function () {
  for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  return new (_bind.apply(Environment, [null].concat(args)))();
};