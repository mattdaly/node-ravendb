var Queryable = module.exports = (function() {
  function Queryable (documents) {
    var arr = [ ];

    if (Array.isArray(documents)) {
      arr = documents.slice(0);
    }

    arr.__proto__ = Queryable.prototype;
    return arr;
  };

  Queryable.prototype = new Array

  Queryable.prototype.all = function (fn) {
    return this.every(fn);
  };

  Queryable.prototype.any = function (fn) {
    return this.exists(fn);
  };

  Queryable.prototype.count = function (fn) {
    return (fn ? this.where(fn) : this).length;
  };

  Queryable.prototype.elementAt = function (index) {
    return this[index];
  };

  Queryable.prototype.exists = function (fn) {
    return this.some(fn);
  };

  Queryable.prototype.first = function (fn) {
    if (fn) {
      var temp = this.where(fn);
      return temp.length > 0 ? temp[0] : undefined;
    }
    
    return this.length > 0 ? this[0] : undefined;
  };

  Queryable.prototype.isEmpty = function () {
    return this.length === 0;
  };

  Queryable.prototype.last = function (fn) {
    if (fn) {
      var temp = this.where(fn);
      return temp.length > 0 ? temp[temp.length - 1] : undefined;
    }
    
    return this.length > 0 ? this[this.length - 1] : undefined;
  };

  Queryable.prototype.load = function (key) {
    return this.single(function (document) {
      return document['@metadata']['@id'] === key;
    });
  };

  Queryable.prototype.random = function (fn) {
    if (fn) {
      var temp = this.where(fn);
      return temp[Math.floor(Math.random() * results.length)] || undefined;
    }
   
    return this[Math.floor(Math.random() * this.length)] || undefined;
  };

  Queryable.prototype.select = function (fn) {
    if (typeof fn === 'string') {
      return new Queryable(this.map(function (document) {
        return document[fn];
      }));
    } else if (typeof fn === 'function') {
      return new Queryable(this.map(fn));
    }

    return undefined;
  };

  Queryable.prototype.single = function (fn) {
    var temp = this.where(fn);

    if (temp.length === 1) {
      return temp[0];
    } else if (temp.length > 1) {
      throw new Error('Sequence contains more than one element');
    }

    return undefined;
  };

  Queryable.prototype.where = function (fn) {
    return new Queryable(this.filter(fn));
  };

  return Queryable;
})();
