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
    if (arguments.length) {
      throw new Error('Open a session by using the Store\'s openSession function');
    }

    this._cache = {};           // cache of all loaded documents
    this._changes = {};         // copy of 'live' objects to compare changes
    this._store = {};           // stored new documents
  }

  util.inherits(Session, events.EventEmitter);

  Session.prototype.on = function (error, listener) {
    if (typeof error === 'string' && typeof listener === 'function') {
      if (this._events && this._events[error]) {
        delete this._events[error];
      }

      this.addListener(error, listener);
    }
  };

  var masks = {
    document: '/docs/%s',
    queries: '/queries',
    bulk: '/bulk_docs',
    dynamic: '/indexes/dynamic/%s',
    index: '/indexes/%s'
  };

  Session.prototype._request = function (method, query, callback, handlers, writeable, headers) {
    var session = this, handlers = handlers || { };

    var options = { 
      host: session._connection.host,
      port: session._connection.port,
      path: session._connection.path + query,
      method: method
    };

    if (headers) {
      options.headers = headers;
    }

    var request = http.request(options);

    request.on('response', function (response) {
      var args = [ undefined ], data = '', error;

      response.on('data', function (chunk) {
        try {
          data += chunk.toString();
        } catch (e) {
          error = new Error('Processing Error: ' + e.message);
        }
      });

      if (response.statusCode === 409) {  
        error = new Error('Concurrency conflict, no changes were performed. The specified etag did not match the current document etag.');
        error.statusCode = 409;
      } else if (typeof handlers.response === 'function') {
        args = args.concat(handlers.response(response.statusCode));
      } else if (response.statusCode === 400) {
        error = new Error('Query Failed: The request url was badly formed. Ensure no parameters contain illegal characters');
        error.statusCode = 400;
      }

      response.on('end', function () {
        if (data.length > 0) {
          try {
            var json = JSON.parse(data);

            if (response.statusCode > 299 || json.Error) {
              var errorDetail = new Error(json.Error || 'An error occured.');
              errorDetail.statusCode = response.statusCode;
              if (error) {
                error.inner = errorDetail;
              } else {
                error = errorDetail;
              }
            } else if (typeof handlers.json === 'function') {
              args = args.concat(handlers.json(json, response.headers));
            }
          } catch (e) {
            error = new Error('Parse Error: ' + e.message);
          }
        }

        if (error) {
          if (session.listeners(error.statusCode)) {
            session.emit(error.statusCode, error);
          } else if (session.listeners('error')) {
            session.emit('error', error);
          }

          if (callback) {
            callback(error);
          }
        } else {
          if (typeof handlers.end === 'function') {
            handlers.end();
          }

          if (callback) {
            callback.apply(this, args);  
          }
        }
      });
    });

    request.on('error', function (error) {
      if (session._events && session._events.error) {
        session.emit('error', error);
      }

      if (callback) {
        callback(error);
      }
    });

    if (writeable) {
      request.write(JSON.stringify(writeable));
    }

    request.end();
  };

  Session.prototype.load = function (keys, includes, callback) { 
    if (!keys) {
      return;
    }
    
    var session = this, handlers = { };

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

// it's a single key
    if (typeof keys === 'string') {        
      var cached = session._cache[keys];

  // there are includes
      if (includes) { 
        if (cached) {
	      var document = JSON.parse(cached);
          Object.freeze(document['@metadata']); 

          var cachedIncludes = [];	    
          var uncachedIncludes = []; 

          includes.forEach(function (property) {
            var key = document[property];
            var doc = session._cache[key];

            if (doc) {
              cachedIncludes.push(JSON.parse(doc)); 
            } else { 
              uncachedIncludes.push(key); 
            }
          });
          
          var length = uncachedIncludes.length;

          if (length === 0) {
            callback(undefined, document, new Queryable(cachedIncludes));
          } else if (length === 1) {
            handlers.json = function (json, headers) {
                _addMeta(json, headers, uncachedIncludes[0]);
                _addToCache(json);
                cachedIncludes.push(json);
                return [ document, new Queryable(cachedIncludes) ];
              };

            session._request('GET', util.format(masks.document, uncachedIncludes[0]), callback, handlers);     
          } else if (length > 1) {     
            handlers.json = function (json) {
                json.Results.forEach(_addToCache);
                cachedIncludes.concat(json.Results);
                return [ document, new Queryable(cachedIncludes) ];
              };   

            session._request('POST', masks.queries, callback, handlers, uncachedIncludes);
          }
        } else {
          includes = (typeof includes === 'string' ? [ includes ] : includes);
          handlers.json =  function (json) {
              json.Results.forEach(_addToCache);
              json.Includes.forEach(_addToCache);
              return [ json.Results[0], new Queryable(json.Includes) ];
            };

          session._request('POST', masks.queries + (Array.isArray(includes) ? '?' + qs.stringify({ include: includes }, '&', '=') : ''), callback, handlers, [ keys ]);
        }

      } else {
  // no includes
        if (cached) {
          callback(undefined, JSON.parse(cached));
        } else {
          handlers.json = function (json, headers) {
              _addMeta(json, headers, keys);
              _addToCache(json);
              return [ json ];
            };

          session._request('GET', util.format(masks.document, keys), callback, handlers);
        }
      }
    } else if (Array.isArray(keys)) {
// it's an array of keys        
      // batches - we're not checking the cache here - whats the likelihood of every document being cached?
      includes = (typeof includes === 'string' ? [ includes ] : includes);
      handlers.json = function (json) {
          json.Results.forEach(_addToCache);
          json.Includes.forEach(_addToCache);
          return [ new Queryable(json.Results), new Queryable(json.Includes) ];
        };

      session._request('POST', masks.queries + (Array.isArray(includes) ? '?' + qs.stringify({ include: includes }, '&', '=') : ''), callback, handlers, keys);
    }
  };

  Session.prototype._parseQueryParameters = function (parameters, parentKey) {
    if (Array.isArray(parameters)) {
      var statements = [];
      for (var i=0; i<parameters.length; i++) {
        statements.push(this._parseQueryParameters(parameters[i], parentKey));
      }
      if (statements.length === 1) {
        return statements[0];
      } else if (statements.length > 1) {
        return '(' + statements.join(' OR ') + ')';
      }
    } else if (typeof parameters === 'object') {
      var statements = [];
      for (var name in parameters) {
        if (parameters.hasOwnProperty(name)) {
          statements.push(this._parseQueryParameters(parameters[name], name));
        }
      }
      if (statements.length === 1) {
        return statements[0];
      } else if (statements.length > 1) {
        return '(' + statements.join(' AND ') + ')';
      }
    } else {
      var statement = '(' + parameters + ')'
      if (typeof parentKey === 'string') {
        statement = parentKey + ':' + statement
      }
      return statement;
    }
    return ''
  }

  Session.prototype._buildQuery = function (urlFormat, urlTypeName, specifications) {
    if (!urlFormat || !urlTypeName) {
      return;
    }

    var query = util.format(urlFormat, urlTypeName);
    if (specifications !== null && typeof specifications === 'object') {
      var queryParameters = {};

      if (typeof specifications.query === 'string' && specifications.query.length > 0) {
        queryParameters.query = specifications.query;
      } else {
        if (typeof specifications.parameters === 'object') {
          queryParameters.query = this._parseQueryParameters(specifications.parameters);
        }
      }

      if (Array.isArray(specifications.projections) || typeof specifications.projections === 'string') {
        queryParameters.fetch = specifications.projections;
      }

      if (Array.isArray(specifications.sort) || typeof specifications.sort === 'string') {
        queryParameters.sort = specifications.sort
      }

      if (typeof specifications.skip === 'number') {
        if (specifications.skip > 0) {
          queryParameters.start = specifications.skip;
        }
      }

      if (typeof specifications.take === 'number') {
        if (specifications.take >= 0) {
          queryParameters.pageSize = specifications.take;
        }
      }

      var sQueryParameters = qs.stringify(queryParameters);
      if (sQueryParameters.length > 0) {
        query += '?' + sQueryParameters;
      }
    }
    return query;
  }

  Session.prototype.query = function (type, specifications, callback, singular) {
    if (!type) {
      return;
    }

    if (typeof type === 'function' && type.Type) {
      type = type.Type;
    }

    if (typeof specifications === 'function' && callback === undefined) {
        callback = specifications;
        specifications = undefined;
    }

    var typeName = singular ? type : inflector.pluralize(type);
    var query = this._buildQuery(masks.dynamic, (typeName.charAt(0).toUpperCase() + typeName.slice(1)), specifications);

    this._request('GET', query, callback, { json: function (json) {
        return [ new Queryable(json.Results), new Statistics(json) ];
      }
    });
  };

  Session.prototype.index = function (index, specifications, callback) {
     if (!index) {
       return;
     }

    if (typeof specifications === 'function' && callback === undefined) {
        callback = specifications;
        specifications = undefined;
    }

    var query = this._buildQuery(masks.index, index, specifications);
    
    this._request('GET', query, callback, { json: function (json) {
        return [ new Queryable(json.Results), new Statistics(json) ];
      }
    });
  };

  Session.prototype.store = function (documents) { 
    if (!documents) {
      return;
    }

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
    if (Object.keys(this._store).length === 0 && Object.keys(this._changes).length === 0) {
      return false;
    }

    var session = this, 
        cache = session._cache,
        changes = session._changes,
        store = session._store,
        batch = [ ],
        handlers = { },
        key, document;

    for (key in changes) {
      if (changes.hasOwnProperty(key) && cache.hasOwnProperty(key)) {
        document = changes[key];

        // cached documents were stringified on caching and comparing strings is easier than deep comparison
        if (JSON.stringify(document) !== cache[key]) {
          batch.push({
            Key: document['@metadata']['@id'],
            Etag: session.options.useOptimisticConcurrency && document['@metadata'].etag ? document['@metadata'].etag : null,
            Method: 'PUT',
            Document: document,
            Metadata: document['@metadata']
          });
        }
      }
    }

    for (key in store) {
      if (store.hasOwnProperty(key)) {
        document = store[key];

        batch.push({
          Key: document['@metadata']['@id'],
          Etag: session.options.useOptimisticConcurrency && document['@metadata'].etag ? document['@metadata'].etag : null,
          Method: 'PUT',
          Document: document,
          Metadata: document['@metadata']
        });
      }
    }

    if (batch.length === 0) {
      return false;
    }

    handlers.json = function (json) {
      var keys = [];
      
      json.forEach(function (data) {
        keys.push(data.Key);
      });

      return [ keys ];	      
    };

    handlers.end = function () {
      session._store = { };               
    };

    session._request('POST', masks.bulk, callback, handlers, batch);
	return true;
  };

  Session.prototype.delete = function (document, etag, callback) {
    if (!document) {
      return;
    }
    
    var session = this, handlers = { };

    if (typeof etag === 'function' && callback === undefined) {
      callback = etag;
      etag = undefined;
    }

    var _push = function (batch, key, etag) {
      batch.push({
        Key: key,
        Etag: etag && session.options.useOptimisticConcurrency ? etag : null,
        Method: 'DELETE'
      });
    };

    if (document instanceof Type.Base || typeof document === 'string') {
      etag = typeof document === 'string' ? etag : document['@metadata'].etag;

      var id = typeof document === 'string' ? document : document['@metadata']['@id'];
      var headers = etag && session.options.useOptimisticConcurrency ? { 'If-Match': etag } : undefined;
  
      handlers.end = function () {
        if (session._cache.hasOwnProperty[id]) {
          delete session._cache[id];
        }

        if (session._changes.hasOwnProperty[id]) {
          delete session._changes[id];
        }
      };

      session._request('DELETE', util.format(masks.document, id), callback, handlers, undefined, headers);
    } else if (Array.isArray(document)) {
      var batch = [];     

      document.forEach(function (doc) {        
        if (doc instanceof Type.Base) {
          _push(batch, doc['@metadata']['@id'], doc['@metadata'].etag);
        } else if (doc.key) {
          _push(batch, doc.key, doc.etag);
        } else if (typeof doc === 'string') {
          _push(batch, doc, undefined);
        }
      });

      handlers.response = function (statusCode) {
        return [ statusCode === 204 ];
      };

      handlers.end = function () {
        batch.forEach(function (patch) {
          if (session._cache.hasOwnProperty[id]) {
            delete session._cache[id];
          }

          if (session._changes.hasOwnProperty[id]) {
            delete session._changes[id];
          }
        });
      };

      session._request('POST', masks.bulk, callback, handlers, batch, headers);
    }     
  };

  Session.prototype.patch = function (key, patches, etag, callback) {
   if (!key || !patches) {
     return;
   }

    if (typeof etag === 'function' && callback === undefined) {
      callback = etag;
      etag = undefined;
    }

    if (Array.isArray(patches) && patches.length > 0) {
      var query = util.format(masks.document, key);  
      var headers = etag ? { 'If-Match': etag } : undefined;

      this._request('PATCH', query, callback, undefined, patches, headers);
    }    
  };

  Session.prototype.exists = function (key, callback) {
    if (!key) {
      return;
    }

    var query = util.format(masks.document, key);
    var handlers = { 
      response: function (statusCode) {
        return [ statusCode === 200 ];
      }
    };

    this._request('HEAD', query, callback, handlers, undefined, undefined);  
  };

  return Session;
})();
