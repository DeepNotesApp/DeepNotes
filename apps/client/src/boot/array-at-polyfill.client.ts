export {};

if (![].at) {
  Array.prototype.at = function (pos) {
    return this[pos >= 0 ? pos : this.length + pos];
  };
}
