var util = require('util');
var inflector = require('./../util/inflector');

var Type = (function() {
  function Type(type) {
    if (!type || typeof type !== 'string') {
      throw new Error('You must specify a type to create a Raven Type object.');
    }

    this['@metadata'] = {
      'Raven-Entity-Name': inflector.pluralize(type),
      'Raven-Clr-Type': type
    };
    
    this['@conventions'] = { };
  }

  Type.prototype.Id = function (id) {
    if (id) {
      this['@metadata']['@id'] = id;
    } else {
      return this['@metadata']['@id'];
    }
  };

  Type.prototype.IdSeparator = function (seperator) {
    if (seperator) {
      this['@conventions'].idSeparator = seperator;
    } else {
      return this['@conventions'].idSeparator;
    }
  };

  Type.prototype.IdGenerationStrategy = function (generator) {
    if (generator) {
      this['@conventions'].idGenerationStrategy = generator;
    } else {
      return this['@conventions'].idGenerationStrategy;
    }
  };
  
  return Type;
})();

var DocumentType = module.exports = function (type) {
  if (!type || typeof type !== 'string') {
    throw new Error('You must specify a type to create a Raven Type object.');
  }

  function DocumentType() { 
    DocumentType.super_.call(this, type);
    DocumentType.constructor.apply(this, arguments);
    DocumentType.Type = type;
  }

  util.inherits(DocumentType, Type);
  return DocumentType;
};

DocumentType.Base = Type;
