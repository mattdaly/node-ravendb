var http = require('http');
var util = require('util');
var masks = require('./masks');
var Document = require('./../objects/document');

module.exports = (function() {
  return function (args, etag, connection, concurrency, cache, changes, callback) {
    if (!args) return;

    if (args instanceof Document.Base) {
      single(args['@metadata']['@id'], args['@metadata']['etag'], connection, concurrency, cache, changes, callback);
    } else if (typeof args === 'string') {
      if (typeof etag === 'function' && callback === undefined) {
        callback = etag;
        etag = undefined;
      }
      single(args, etag, connection, concurrency, cache, changes, callback);
    } else if (Array.isArray(args)) {
      batch (args, connection, concurrency, cache, changes, callback);
    }
  };

  function single (key, etag, connection, concurrency, cache, changes, callback) {
    var options = {
      host: connection.host,
      port: connection.port,
      path: util.format(masks.database + masks.document, connection.database, key),
      method: 'DELETE'
    };

    if (etag && concurrency) {    
      options.headers = { 'If-Match': etag }
    }

    http.request(options, function (response) {
      var error = undefined;

      response.on('data', function (chunk) {
          try {          
            var json = JSON.parse(chunk);

            if (json.Error || response.statusCode === 400) {
              error = new Error(response.statusCode === 400 ? 'Could not parse etag as Guid' : json.Error);
              error.statusCode = response.statusCode;
            }
          } catch (e) {
            error = new Error('Parse Error: ' + e.message);
          }
        });

      response.on('end', function() {
        if (cache.hasOwnProperty[patch.Key]) delete cache[patch.Key];
        if (changes.hasOwnProperty[patch.Key]) delete changes[key];

        callback(error); 
      });	      
    }).on('error', callback).end();    
  };

  function batch (args, connection, concurrency, cache, changes, callback) {
    var batch = [];

    function push(key, etag) {
      batch.push({
        Key: key,
        Etag: concurrency ? etag : null,
        Method: 'DELETE'
      });
    }

    args.forEach(function (document) {        
      if (document instanceof Document.Base) {
        push(document['@metadata']['@id'], document['@metadata']['etag']);
      } else if (document.key && document.etag) {
        push(document.key, document.etag);
      }
    });

    var options = {
      host: connection.host,
      port: connection.port,
      path: util.format(masks.database, connection.database) + masks.bulk,
      method: 'POST'
    };

    var request = http.request(options, function (response) {
      var error = undefined;

      if (response.statusCode === 409) {  
        error = new Error('Concurrency conflict (HTTP 409). No saves were performed.');
        error.statusCode = 409;
      } else if (response.statusCode !== 204) {
        error = new Error('HTTP ' + response.statusCode);
        error.statusCode = response.statusCode;
      }

      response.on('end', function() {          
        if (!error) {
          batch.forEach(function (patch) {
            if (cache.hasOwnProperty[patch.Key]) delete cache[patch.Key];
            if (changes.hasOwnProperty[patch.Key]) delete changes[key];
          });
        }

        callback(error); 
      });
    });      
    
    request.on('error', callback);
    request.write(JSON.stringify(batch));
    request.end()
  };
})();

