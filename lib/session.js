var _load = require('./operations/_load');
var _query = require('./operations/_query')
var _index = require('./operations/_index');
var _store = require('./operations/_store');
var _save = require('./operations/_save');
var _delete = require('./operations/_delete');
var _exists = require('./operations/_exists');
var _patch = require('./operations/_patch');

var DocumentSession = module.exports = (function () {
  function DocumentSession(connection, conventions) {
    if (!connection || !conventions) {
      throw new Error('Open a session by using the DocumentStore\'s openSession function');
    }
          
    this._connection = connection;
    this._conventions = conventions;

    Object.freeze(this._connection);
    Object.freeze(this._conventions);

    this._cache = {};           // cache of all loaded documents
    this._changes = {};         // copy of 'live' objects to compare changes
    this._store = {};           // stored new documents

    var session = this;
    this.Advanced = {
      DisableAllCaching: false,
      UseOptimisticConcurrency: false,
      deleteByKey: function (key, etag, callback) { _delete(key, etag, session._connection, true, session._cache, session._changes, callback); },
      exists: function (key, callback) { _exists(key, session._connection, callback); },
      patch: function (key, patches, etag, callback) { _patch(key, patches, etag, session._connection, callback); }
    };
  }

  DocumentSession.prototype.load = function (keys, includes, callback) { 
    _load(keys, includes, this._connection, this._cache, this._changes, callback); 
  };
 
  DocumentSession.prototype.query = function (type, parameters, projections, sort, callback) { 
    _query(type, parameters, projections, sort, this._connection, callback);
  }
 
  DocumentSession.prototype.index = function (index, parameters, projections, sort, callback) { 
    _index(index, parameters, projections, sort, this._connection, callback);
  }

  DocumentSession.prototype.store = function (documents) { 
    _store(documents, this._conventions, this._changes, this._store); 
  };
  
  DocumentSession.prototype.save = function (callback) { 
    _save(this._cache, this._changes, this._store, this._connection, this.Advanced.UseOptimisticConcurrency, callback); 
  };

  DocumentSession.prototype.delete = function (document, callback) {
    _delete(document, undefined, this._connection, this.Advanced.UseOptimisticConcurrency, this._cache, this._changes, callback); 
  };

  return DocumentSession;
})();
