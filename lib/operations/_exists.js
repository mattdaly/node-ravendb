var http = require('http');
var util = require('util');
var masks = require('./masks');

module.exports = (function() {
  return function (key, connection, callback) {
    if (!key) return;

    var options = {
      host: connection.host,
      port: connection.port,
      path: util.format(masks.database + masks.document, connection.database, key),
      method: 'HEAD'
    };

    http.request(options, function (response) {
       callback(undefined, response.statusCode === 200);	      
    }).on('error', callback).end();    
  };
})();
