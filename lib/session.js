var events = require('events');
var util = require('util');
var http = require('http');
var qs = require('querystring');
var inflector = require('./util/inflector');
var generator = require('./util/key-generator');
var Type = require('./objects/type');
var Queryable = require('./objects/queryable');
var Statistics = require('./objects/statistics');


var Session = module.exports = (function () {
  function Session() {
    if (arguments.length) 
      throw new Error('Open a session by using the Store\'s openSession function');

    this._cache = {};           // cache of all loaded documents
    this._changes = {};         // copy of 'live' objects to compare changes
    this._store = {};           // stored new documents
  }

  util.inherits(Session, events.EventEmitter);

  Session.prototype.on = function (error, listener) {
    if (typeof error === 'string' && typeof listener === 'function') {
      if (this._events && this._events[error])
        delete this._events[error];

      this.addListener(error, listener);
    }
  };

  var masks = {
    document: '/docs/%s',
    queries: '/queries',
    bulk: '/bulk_docs',
    dynamic: '/indexes/dynamic/%s?query=%s',
    index: '/indexes/%s?query=%s'
  };

  Session.prototype._request = function (method, query, callback, jsonHandler, writeable, headers, responseHandler, endHandler) {
    var session = this;

    var options = { 
      host: session._connection.host,
      port: session._connection.port,
      path: session._connection.path + query,
      method: method
    };

    if (headers)
      options.headers = headers;

    var request = http.request(options);

    request.on('response', function (response) {
      var error = undefined;
      var args = [ undefined ];

      if (response.statusCode === 409) {  
        error = new Error('Concurrency conflict, no changes were performed. The specified etag did not match the current document etag.');
        error.statusCode = 409;
      } else if (jsonHandler !== undefined) {
        response.on('data', function (chunk) {  
          try {
	        var json = JSON.parse(chunk);

            if (response.statusCode > 299 || json.Error) {
              var message = json.Error.match(/: (.*)\r\n/)[1];
              error = new Error(message ? message : 'An error occured');
              error.statusCode = response.statusCode;
            } else if (jsonHandler !== null) {
              args = args.concat(jsonHandler(json, response.headers));
            }
          } catch (e) {
            error = new Error('Parse Error: ' + e.message);
          }               
        });
      } else if (responseHandler) {
        args = args.concat(responseHandler(response.statusCode));
      } else if (response.statusCode === 400) {
        error = new Error('Query Failed: The request url was badly formed. Ensure no parameters contain illegal characters');
        error.statusCode = 400;
      }

      response.on('end', function () {
        if (error) {
          if (session.listeners(error.statusCode)) {
            session.emit(error.statusCode, error);
          } else if (session.listeners('error')) {
            session.emit('error', error);
          }

          if (callback) 
            callback(error);
        } else {            
          if (endHandler)
            endHandler();

          if (callback) 
            callback.apply(this, args);  
        }
      });
    });

    request.on('error', function (error) {
      if (session._events && session._events['error'])
        session.emit('error', error);

      if (callback) 
        callback(error);
    });

    if (writeable) 
      request.write(JSON.stringify(writeable));

    request.end();
  };
  
  Session.prototype.load = function (keys, includes, callback) { 
    if (!keys) 
      return;
    
    var session = this;

    if (typeof includes === 'function' && callback === undefined) {
        callback = includes;
        includes = undefined;
    }

    var _addToCache = function (document) {
      var cached = session._cache[document['@metadata']['@id']];

      if (!cached) {
        Object.freeze(document['@metadata']);                                       // you shouldn't be able to change metadata
        session._cache[document['@metadata']['@id']] = JSON.stringify(document);    // js passes by reference, so stringify it - used for comparison on save
        session._changes[document['@metadata']['@id']] = document;                  // an editable reference of the document to compare against the stringified cache
      }          
    };

    var _addMeta = function (document, headers, key) {
      document['@metadata'] = {
        'Raven-Entity-Name': headers['raven-entity-name'],
        'Raven-Clr-Type': headers['raven-clr-type'],
        '@id': key,
        'Last-Modified': new Date(headers['last-modified']).toISOString(),
        '@etag': headers.etag
      };
    };

    if (typeof keys === 'string') {
      if (!includes) {
        var document = session._cache[keys];

        if (!document) {
          var query = util.format(masks.document, keys); 

          session._request('GET', query, callback, function (json, headers) {
            _addMeta(json, headers, keys);
            _addToCache(json);         

            return [ json ];
          });
        } else {
          callback(undefined, JSON.parse(document));
        }
      } else {
        var cached = session._cache[keys];

        if (!cached) { 
          includes = (typeof includes === 'string' ? [ includes ] : includes);
     
          var query = masks.queries + (Array.isArray(includes) ? '?' + qs.stringify({ include: includes }, '&', '=') : '');

          session._request('POST', query, callback, function (json) {
            json.Results.forEach(_addToCache);
            json.Includes.forEach(_addToCache);
            return [ json.Results[0], new Queryable(json.Includes) ];
          }, [ keys ]);
        } else {
	      var document = JSON.parse(cached);
          Object.freeze(document['@metadata']); 

          var included = [];	    
          var uncached = []; 

          includes.forEach(function (property) {
            var doc = session._cache[document[property]];
            doc ? included.push(JSON.parse(doc)) : uncached.push(document[property]);
          });
          
          var length = uncached.length;

          if (length === 0) {
            callback(undefined, document, new Queryable(included));
          } else if (length === 1) {
            var query = util.format(masks.document, uncached[0]); 

            session._request('GET', query, callback, function (json, headers) {
              _addMeta(json, headers, uncached[0]);
              _addToCache(json);
              included.push(json);
              return [ document, new Queryable(included) ];
            });     
          } else if (length > 1) {
            var query = masks.queries + (Array.isArray(included) ? '?' + qs.stringify({ include: included }, '&', '=') : '');

            session._request('POST', query, callback, function (json) {
              json.Results.forEach(_addToCache);
              included.concat(json.Results);
              return [ document, new Queryable(included) ];
            }, keys);
          }
        }
      }
    } else if (Array.isArray(keys)) {
      // batches - we're not checking the cache here - whats the likelihood of every document being cached?
      includes = (typeof includes === 'string' ? [ includes ] : includes);
     
      var query = masks.queries + (Array.isArray(includes) ? '?' + qs.stringify({ include: includes }, '&', '=') : '');

      session._request('POST', query, callback, function (json) {
        json.Results.forEach(_addToCache);
        json.Includes.forEach(_addToCache);
        return [ new Queryable(json.Results), new Queryable(json.Includes) ];
      }, keys);
    }
  };

  Session.prototype.query = function (type, parameters, projections, sort, callback) { 
    if (!type || !parameters) 
      return;

    if (typeof type === 'function' && type.Type) {
      type = type.Type;
    }

    if (typeof projections === 'function' && callback === undefined) {
        callback = projections;
        projections = undefined;
    } else if (typeof sort === 'function' && callback === undefined) {
        callback = sort;
        sort = undefined;
    }

    var plural = inflector.pluralize(type);
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

    this._request('GET', query, callback, function (json) {
      return [ new Queryable(json.Results), new Statistics(json) ];
    });
  };

  Session.prototype.index = function (index, parameters, projections, sort, callback) { 
     if (!index || !parameters) 
       return;

    if (typeof projections === 'function' && callback === undefined) {
        callback = projections;
        projections = undefined;
    } else if (typeof sort === 'function' && callback === undefined) {
        callback = sort;
        sort = undefined;
    }

    var query = util.format(masks.index, index, qs.stringify(parameters, '%20AND%20', ':'));

    if (Array.isArray(projections))
      query += '&' + qs.stringify({ fetch: projections }, '&', '=');

    if (Array.isArray(sort))
      query += '&' + qs.stringify({ sort: sort }, '&', '=');
    
    this._request('GET', query, callback, function (json) {
      return [ new Queryable(json.Results), new Statistics(json) ];
    });
  };

  Session.prototype.store = function (documents) { 
    if (!documents)
      return;

    var session = this;

    var _track = function (document) {
      if (document instanceof Type.Base && !document['@metadata']['Last-Modified'] && !document['@metadata']['@etag']) {
        var id = document['@metadata']['@id'];

        if (!session._store.hasOwnProperty(id)) {
          generator.generate(document, session.conventions.idSeparator, session.conventions.idGenerationStrategy, function (key) {
            if (key !== undefined) {
              document.Id(key);
              Object.freeze(document['@metadata']);
              session._store[key] = document;
            }
          });
        } else {
          session._store[id] = document;
        }
      }
    };

    if (Array.isArray(documents)) {
      documents.forEach(_track);
    } else {
      _track(documents);
    }     
  };

  Session.prototype.save = function (callback) { 
    if (Object.keys(this._store).length === 0 && Object.keys(this._changes).length === 0) return;

    var session = this;
    var batch = [];

    for (var key in session._changes) {
      var document = session._changes[key];
      var cached = session._cache[key];
      
      // cached documents were stringified on caching and comparing strings is easier than deep comparison
      if (cached && JSON.stringify(document) !== cached) {
       batch.push({
         Key: document['@metadata']['@id'],
         Etag: session.options.useOptimisticConcurrency && document['@metadata'].etag ? document['@metadata'].etag : null,
         Method: 'PUT',
         Document: document,
         Metadata: document['@metadata']
       });
      }     
    }

    for (var key in session._store) {
      var document = session._store[key];

      batch.push({
        Key: document['@metadata']['@id'],
        Etag: session.options.useOptimisticConcurrency && document['@metadata']['@etag'] ? document['@metadata']['@etag'] : null,
        Method: 'PUT',
        Document: document,
        Metadata: {
          'Raven-Entity-Name': document['@metadata']['Raven-Entity-Name'],
          'Raven-Clr-Type': document['@metadata']['Raven-Clr-Type']
        }
      });
    }
   
    if (batch.length === 0) 
      return;

    var query = masks.bulk;

    session._request('POST', query, callback, function (json) {
      keys = [];
      
      json.forEach(function (data) {
        keys.push(data.Key);
      });

      return [ keys ];	      
    }, batch, undefined, undefined, function () {
      session._store = { };               
    });
  };

  Session.prototype.delete = function (document, etag, callback) {
    if (!document)
      return;
    
    var session = this;

    if (typeof etag === 'function' && callback === undefined) {
      callback = etag;
      etag = undefined;
    }

    if (document instanceof Type.Base || typeof document === 'string') {
      var id = typeof document === 'string' ? document : document['@metadata']['@id'];
      var etag = typeof document === 'string' ? etag : document['@metadata']['etag'];

      var query = util.format(masks.document, id);
      var headers = etag && session.options.useOptimisticConcurrency ? { 'If-Match': etag } : undefined;
 
      session._request('DELETE', query, callback, null, undefined, headers, undefined, function () {
        if (session._cache.hasOwnProperty[id]) 
          delete session._cache[id];

        if (session._changes.hasOwnProperty[id])
          delete session._changes[id];
      });
    } else if (Array.isArray(document)) {
      var batch = [];

      function _push(key, etag) {
        batch.push({
          Key: key,
          Etag: etag && session.options.useOptimisticConcurrency ? etag : null,
          Method: 'DELETE'
        });
      }

      document.forEach(function (doc) {        
        if (doc instanceof Document.Base) {
          _push(doc['@metadata']['@id'], doc['@metadata']['etag']);
        } else if (doc.key) {
          _push(doc.key, doc.etag);
        } else if (typeof doc === 'string') {
          _push(doc, undefined);
        }
      });

      var query = masks.bulk;

      session._request('POST', query, callback, null, batch, headers,  function (statusCode) {
        return [ statusCode === 204 ];
      }, function () {
        batch.forEach(function (patch) {
          if (session._cache.hasOwnProperty[id])
            delete session._cache[id];

          if (session._changes.hasOwnProperty[id])
            delete session._changes[id];
        });
      });
    }     
  }

  Session.prototype.patch = function (key, patches, etag, callback) {
   if (!key || !patches) 
     return;

    if (typeof etag === 'function' && callback === undefined) {
      callback = etag;
      etag = undefined;
    }

    if (Array.isArray(patches) && patches.length > 0) {
      var query = util.format(masks.document, key);  
      var headers = etag ? { 'If-Match': etag } : undefined;

      this._request('PATCH', query, callback, null, patches, headers);
    }    
  };

  Session.prototype.exists = function (key, callback) {
    if (!key) return;

    var query = util.format(masks.document, key);

    this._request('HEAD', query, callback, undefined, undefined, undefined, function (statusCode) {
      return [ statusCode === 200 ];
    });  
  };

  return Session;
})();
