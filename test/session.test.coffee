should = require 'should'
Store = require './../lib/store'
Session = require './../lib/session'
Document = require './../lib/objects/document'

describe 'session ->', ->
  store = new Store({ host: 'address', port: 1234, database: 'database' })
  store.initialize()
  session = null

  beforeEach -> session = store.openSession()

  describe 'creating a session ->', ->
    it 'newing a session object without valid arguments throws an error', ->
      (-> new Session).should.throw()
    it 'a new session opened via the store should have connection settings', ->
      should.exist(session._connection)
    it 'a new session opened via the store should have conventions', ->
      should.exist(session._conventions)
      should.exist(session._conventions.IdentityPartsSeparator)
      should.exist(session._conventions.GenerateDocumentKey)

  describe 'advanced functions ->', ->
    it 'can enabled optimistic concurrency', ->
      should.exist(session.Advanced.UseOptimisticConcurrency)
      session.Advanced.UseOptimisticConcurrency = true
      session.Advanced.UseOptimisticConcurrency.should.be.true
    it 'can check a document exists by it\'s key', ->
      should.exist(session.Advanced.exists)
    it 'can delete a document by it\'s key', ->
      should.exist(session.Advanced.deleteByKey)
    it 'can perform patches', ->
      should.exist(session.Advanced.patch)

  describe 'storing a document ->', ->
    Reindeer = new Document('Reindeer')
    Reindeer::init = (@name) ->
        @Id(@name)

    session = null
    rudolph = null
    prancer = null
    vixen = null

    beforeEach ->
      session = store.openSession()
      rudolph = new Reindeer('Rudolph')
      prancer = new Reindeer('Prancer')
      vixen = new Reindeer('Vixen')

    it 'adds the specified document to the session tracker', ->
      session.store(rudolph)
      Object.keys(session._store).should.not.be.empty
    it 'documents should not be added to the tracker more than once', ->
      session.store(rudolph)
      session.store(rudolph)
      session.store(rudolph)
      Object.keys(session._store).length.should.equal(1)
    it 'stored documents should be tracked and any changes replicated in the tracking array', ->
      session.store(rudolph)
      id = rudolph.Id()
      session._store[id].name.should.equal('Rudolph')
      rudolph.name = 'Prancer'
      session._store[id].name.should.equal('Prancer')
    it 'does not throw if no document is passed to the store function', ->
      (-> session.store()).should.not.throw()
    it 'does not throw if an invalid document is passed (an object with no `Raven-Clr-Type` defined) to the store function', ->
      (-> session.store(3)).should.not.throw()
    it 'does not add to the tracker when no document is passed', ->
      session.store()
      Object.keys(session._store).should.be.empty
    it 'does not add to the tracker when an invalid document is passed', ->
      session.store(3)
      Object.keys(session._store).should.be.empty
    it 'the store function should should accept an array of documents', ->
      (-> session.store([ rudolph, prancer, vixen ])).should.not.throw()
    it 'storing an array of documents should add each document to the tracker', ->
      session.store([ rudolph, prancer, vixen ])
      Object.keys(session._store).length.should.equal(3)
    it 'does not throw if invalid objects (objects with no `Raven-Clr-Type` defined) are passed in an array', ->
      (-> session.store([ 1, 2, 3 ])).should.not.throw()
      Object.keys(session._store).should.be.empty
    it 'passing invalid objects (objects with no `Raven-Clr-Type` defined) in an array does not add them to the tracker', ->
      session.store([ 1, 2, 3 ])
      Object.keys(session._store).should.be.empty
    it 'when passed an array containing both valid and invalid objects, store should only add valid documents to the tracker', ->
      session.store([ rudolph, 2, 3 ])
      Object.keys(session._store).length.should.equal(1)
