var util = require('util');
var Session = require('./session');

var Store = module.exports = (function() {
  function Store(connection) {
    if (!connection) {
      throw new Error('Cannot create a Store without providing a connection object');
    }

    this._on = { };
    this._connection = connection;

    Object.freeze(this._connection);

    this.conventions = { 
      idSeparator: '/', 
      idGenerationStrategy: 'auto' 
    };

    this.options = { 
      cache: true, 
      useOptimisticConcurrency: false
    };
  }

  Store.prototype.initialize = function () {
    Object.freeze(this._on);
    Object.freeze(this.conventions);
    Object.freeze(this.options);

    return this;
  };

  Store.prototype.on = function (name, listener) {      
    if (typeof name === 'string' && typeof listener === 'function') {
      this._on[name] = listener;
    }
  };

  Store.prototype.openSession = function () {
    if (!Object.isFrozen(this.conventions) || !Object.isFrozen(this.options)) {
      throw new Error('You must initialize the Store before opening a session.');
    }

    var session = new Session();

    session._connection = {
      host: this._connection.host,  
      port: this._connection.port,
      path: util.format('/databases/%s', this._connection.database)
    };

    session.conventions = { 
        idSeparator: this.conventions.idSeparator,
        idGenerationStrategy: this.conventions.idGenerationStrategy
    };

    session.options = {
      cache: this.options.cache,
      useOptimisticConcurrency: this.options.useOptimisticConcurrency
    };
    
    var key;

    for (key in this._on) {
      if (this._on.hasOwnProperty(key)) {
        var value = this._on[key];

        if (typeof value === 'function') {  
          session.addListener(key, value);
        }
      }
    }

    Object.freeze(session._connection);

    return session;
  };

  return Store;
})();
