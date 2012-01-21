var DocumentSession = require('./session');

var DocumentStore = module.exports = (function() {
  function DocumentStore(connection) {
    if (!connection) {
      throw new Error('Cannot create a DocumentStore without providing a configuration object');
    }

    this._connection = connection;
    this.Conventions = {
      IdentityPartsSeparator: '/',
      GenerateDocumentKey: 'auto'
    };

    Object.freeze(this._connection);
  }

  DocumentStore.prototype.initialize = function () {
    Object.freeze(this.Conventions);
    return this;
  };

  DocumentStore.prototype.openSession = function () {
    if (!Object.isFrozen(this.Conventions)) {
      throw new Error('You must initialize the DocumentStore before opening a session.');
    }

    return new DocumentSession(this._connection, this.Conventions);
  };

  return DocumentStore;
})();
