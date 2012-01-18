var documentKeyGenerator = {
  generate: function (id, name, seperator, generator) {
    var prefix = name.toLowerCase();
    if (id) {
      return prefix + seperator + id.toLowerCase();
    } else {
      if (generator === 'guid') {
        return null;
      } else {
        return prefix + '/';
      }
    }
  }
};

exports.generate = function (document, seperator, generator, callback) {
  if (!document['@metadata'] || !document['@metadata']['Raven-Entity-Name']) {
    return;
  } 

  var id = document['@metadata']['@id'];
  var name = document['@metadata']['Raven-Entity-Name'];
  var seperator = seperator;
  var generator = generator;
  
  if (document['@conventions']) {
    if (document['@conventions']['IdentityPartsSeparator']) { seperator = document['@conventions']['IdentityPartsSeparator']; }
    if (document['@conventions']['GenerateDocumentKey']) { generator = document['@conventions']['GenerateDocumentKey']; }
  }

  return callback(documentKeyGenerator.generate(id, name, seperator, generator));
};

