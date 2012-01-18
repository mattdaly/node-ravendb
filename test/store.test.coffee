should = require 'should'
Store = require './../lib/store'
Session = require './../lib/session'

describe 'store ->', ->
  connection = { host: 'address', port: 1234, database: 'database' }
  describe 'create a store ->', ->
    it 'throws an error when no configuration argument is passed', ->
      (-> new Store()).should.throw()
    it 'sets configuration properties when passed a connection argument', ->
      store = new Store(connection)
      store.should.be.an.instanceof(Store)
      store._connection.host.should.equal(connection.host)
      store._connection.port.should.equal(connection.port)
      store._connection.database.should.equal(connection.database)
    it 'sets a conventions object on construction', ->
        store = new Store(connection)
        store.Conventions.should.be.a('object')

  describe 'initializing a store ->', ->
    store = null
    beforeEach -> store = new Store(connection)
    it 'calling initialize should freeze the configuration object', ->
      store.initialize()
      Object.isFrozen(store._connection).should.be.true
    it 'calling initialize should freeze the conventions object', ->
      store.initialize()
      Object.isFrozen(store.Conventions).should.be.true
    it 'setting a convention prior to calling initialize should set it\'s value', ->
      store.Conventions.IdentityPartsSeparator.should.equal('/')
      store.Conventions.IdentityPartsSeparator = '-'
      store.initialize()
      store.Conventions.IdentityPartsSeparator.should.equal('-')
    it 'setting a convention after calling initialize should ignore not set a new value', ->
      store.Conventions.IdentityPartsSeparator.should.equal('/')
      store.initialize()
      store.Conventions.IdentityPartsSeparator = '-'
      store.Conventions.IdentityPartsSeparator.should.equal('/')
    it 'setting a convention prior to calling initialize should be reflected in the session', ->
      store.Conventions.IdentityPartsSeparator.should.equal('/')
      store.Conventions.IdentityPartsSeparator = '-'
      store.initialize()
      session = store.openSession()
      session._conventions.IdentityPartsSeparator.should.equal('-')
    it 'setting a convention after calling initialize should not be reflected in the session', ->
      store.Conventions.GenerateDocumentKey.should.equal('auto')
      store.initialize()
      store.Conventions.GenerateDocumentKey = 'guid'
      session = store.openSession()
      session._conventions.GenerateDocumentKey.should.equal('auto')

  describe 'requesting a session fom a store ->', ->
    store = null
    beforeEach -> store = new Store(connection)
    it 'throws an error when the store hasn\'t been initialized', ->
      (-> store.openSession()).should.throw()
    it 'returns a new Session when the store has been initialized', ->
      store.initialize()
      session = store.openSession()
      session.should.be.an.instanceof(Session)
