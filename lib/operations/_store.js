var generator = require('./../util/key-generator');
var Document = require('./../objects/document');

module.exports = (function() {
  return function (documents, conventions, changes, store) {
    if (!documents) return;

    var track = function (document) {
      if (document instanceof Document.Base && document['@metadata']['@etag'] === undefined) {
        var id = document['@metadata']['@id'];

        if (!store.hasOwnProperty(id)) {
          generator.generate(document, conventions.IdentityPartsSeparator, conventions.GenerateDocumentKey, function (key) {
            if (key !== undefined) {
              document.Id(key);
              Object.freeze(document['@metadata']);
              store[key] = document;
            }
          });
        } else {
          store[id] = document;
        }
      }
    };

    if (Array.isArray(documents)) {
      documents.forEach(track);
    } else {
      track(documents);
    }    
  };
})();

