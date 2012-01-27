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
  
  if (document['@conventions']) {
    if (document['@conventions']['idSeparator']) { 
      seperator = document['@conventions']['idSeparator']; 
    }

    if (document['@conventions']['idGenerationStrategy']) { 
      generator = document['@conventions']['idGenerationStrategy']; 
    }
  }

  return callback(documentKeyGenerator.generate(id, name, seperator, generator));
};

