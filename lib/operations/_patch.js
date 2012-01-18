var http = require('http');
var util = require('util');
var masks = require('./masks');
var Queryable = require('./../objects/queryable')

module.exports = (function() {
  return function (key, patches, etag, connection, callback) {
    if (!key || !patches) return;

    if (typeof etag === 'function' && callback === undefined) {
      callback = etag;
      etag = undefined;
    }

    if (Array.isArray(patches) && patches.length > 0) {
      var options = {
        host: connection.host,
        port: connection.port,
        path: util.format(masks.database + masks.document, connection.database, key),
        method: 'PATCH'
      };
     
      if (etag) {
        options.headers = { 'If-Match': etag };
      }

      var request = http.request(options, function (response) {
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
     
        response.on('end', function () { callback(error); });
      });
    
      request.on('error', callback);
      request.write(JSON.stringify(patches));
      request.end();
    }       
  };
})();
