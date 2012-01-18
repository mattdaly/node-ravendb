var http = require('http');
var util = require('util');
var qs = require('querystring');
var masks = require('./masks');
var inflector = require('./../util/inflector');
var Queryable = require('./../objects/queryable');
var Statistics = require('./../objects/statistics');

module.exports = (function() {
  return function (type, parameters, projections, sort, connection, callback) {
    if (!type || !parameters) return;

    if (typeof projections === 'function' && callback === undefined) {
        callback = projections;
        projections = undefined;
    } else if (typeof sort === 'function' && callback === undefined) {
        callback = sort;
        sort = undefined;
    }

    var plural = inflector.pluralize(type);
    plural = inflector.pluralize(type);  // annoying bug, some words won't pluralize first time
    var query = util.format(masks.dynamic, (plural.charAt(0).toUpperCase() + plural.slice(1)), qs.stringify(parameters, '%20AND%20', ':'));

    if (Array.isArray(projections)) {
      query += '&' + qs.stringify({ fetch: projections }, '&', '=');
    } else if (typeof projections === 'string') {
      query += '&fetch=' + projections;
    }

    if (Array.isArray(sort)) {
      query += '&' + qs.stringify({ sort: sort }, '&', '=');
    } else if (typeof sort === 'string') {
      query += '&sort=' + sort;
    }

    var options = {
      host: connection.host,
      port: connection.port,
      path: util.format(masks.database, connection.database) + query
    };  

    http.get(options, function (response) {
      var error = null;
      var results = null;
      var statistics = null;

      if (response.statusCode === 400) {
        error = new Error('Query Failed: The request url was badly formed. Ensure none of the parameters contain illegal characters');
        error.statusCode = 400;
      } else {
        response.on('data', function (chunk) {
          try {
	        var json = JSON.parse(chunk);

            if (json.Error) {
              var message = json.Error.match(/: (.*)\r\n/)[1];
              error = new Error(message ? message : 'An error occured, no documents could be retrieved');
              error.statusCode = response.statusCode;
            } else {
              results = new Queryable(json.Results);
              statistics = new Statistics(json);
            }
          } catch (e) {
            error = new Error('Parse Error: ' + e.message);
          }
        });
      }

      response.on('end', function () { callback(error, results, statistics); });    
    }).on('error', callback);
  };
})();
