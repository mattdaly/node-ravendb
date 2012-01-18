var http = require('http');
var util = require('util');
var masks = require('./masks');

module.exports = (function() {
  return function (cache, changes, store, connection, concurrency, callback) {
    if (!cache || !changes || !store || (Object.keys(store).length === 0 && Object.keys(changes).length === 0)) return;

    var batch = [];

    // add changed documents to the batch
    for (var key in changes) {
      var document = changes[key];
      var cached = cache[key];
      
      // cached documents were stringified on caching and comparing strings is easier than deep copy comparison
      if (cached && JSON.stringify(document) !== cached) {
       batch.push({
         Key: document['@metadata']['@id'],
         Etag: concurrency && document['@metadata'].etag ? document['@metadata'].etag : null,
         Method: 'PUT',
         Document: document,
         Metadata: document['@metadata']
       });
      }     
    }

    // add new documents to the batch
    for (var key in store) {
      var document = store[key];

      batch.push({
        Key: document['@metadata']['@id'],
        Etag: concurrency && document['@metadata']['@etag'] ? document['@metadata']['@etag'] : null,
        Method: 'PUT',
        Document: document,
        Metadata: {
          'Raven-Entity-Name': document['@metadata']['Raven-Entity-Name'],
          'Raven-Clr-Type': document['@metadata']['Raven-Clr-Type']
        }
      });
    }
   
    if (batch.length === 0) return;

    var options = {
      host: connection.host,
      port: connection.port,
      path: util.format(masks.database, connection.database) + masks.bulk,
      method: 'POST'
    };

    var request = http.request(options, function (response) {
      var error = undefined;
      var keys = undefined;

      response.on('data', function (chunk) {
        try {       
          var json = JSON.parse(chunk);   

          if (json.Error || response.statusCode === 409) {
            error = new Error(response.statusCode === 409 ? 'Concurrency conflict (HTTP 409). No chanes were made.' : json.Error);
            error.statusCode = response.statusCode;
          } else { 
            keys = [];

            json.forEach(function (data) {
              keys.push(data.Key);
            });
          }
        } catch (e) {
          error = new Error('Parse Error: ' + e.message);
        }
      });

      response.on('end', function () { 
        store = {};
        if (callback) callback(error, keys);
      });	      
    });
    
    request.on('error', function (error) {
      if (callback) callback(error);             
    });
    request.write(JSON.stringify(batch));
    request.end();
  };
})();
