var util = require('util');
var inflector = require('./../util/inflector');

var DocumentBase = (function() {
  function DocumentBase(type) {
    if (!type) {
      throw new Error('You must specify a type to create a Raven Document object.');
    }    

    this['@metadata'] = {
      'Raven-Entity-Name': inflector.pluralize(type),
      'Raven-Clr-Type': type
    };

    this['@conventions'] = { };
  }

  DocumentBase.prototype.Id = function (id) {
    if (id) {
      this['@metadata']['@id'] = id;
    } else {
      return this['@metadata']['@id'];
    }
  };

  DocumentBase.prototype.IdentityPartsSeparator = function (seperator) {
    if (seperator) {
      this['@conventions']['IdentityPartsSeparator'] = seperator;
    } else {
      return this['@conventions']['IdentityPartsSeparator'];
    }
  };

  DocumentBase.prototype.GenerateDocumentKey = function (generator) {
    if (generator) {
      this['@conventions']['GenerateDocumentKey'] = generator;
    } else {
      return this['@conventions']['GenerateDocumentKey'];
    }
  };

  return DocumentBase;
})();

var Document = module.exports = function (type) {
  function Document() { 
    Document.super_.call(this, type);
    Document.Type = type;

    if (this.init) { 
      this.init.apply(this, arguments);
      Object.freeze(this['@conventions']);
    }
  }
  
 

  util.inherits(Document, DocumentBase);

  return Document;
};

Document.Base = DocumentBase;
