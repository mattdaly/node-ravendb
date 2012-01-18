should = require 'should'
Document = require './../lib/objects/document'

describe 'document ->', ->
  describe 'creating a document type ->', ->
    it 'throws an error when no type is passed as an argument', ->
      (-> new DocumentType()).should.throw()
    it 'throws an error when passed argument is not a string', ->
      (-> new DocumentType(3)).should.throw()

  describe 'creating a new document ->', ->
    Reindeer = new Document('Reindeer')
    Reindeer::init = (@name) ->

    document = null

    beforeEach -> document = new Reindeer('Rudolph')

    it 'sets `Raven-Clr-Type` in `@metadata` object to document type', ->
      should.exist(document['@metadata']['Raven-Clr-Type'])
      document['@metadata']['Raven-Clr-Type'].should.equal('Reindeer')
    it 'sets `Raven-Entity-Name` in `@metadata` object to plural of document type', ->
      should.exist(document['@metadata']['Raven-Entity-Name'])
      document['@metadata']['Raven-Entity-Name'].should.equal('Reindeers')
    it 'should be able to set an id using a function', ->
      document.Id('rudolph')
      document['@metadata']['@id'].should.equal('rudolph')
    it 'should be retrieve the id using a function', ->
      document.Id('rudolph')
      document.Id().should.equal('rudolph')
    it 'should be able to set an identity parts separator using a function', ->
      document.IdentityPartsSeparator('-')
      document['@conventions']['IdentityPartsSeparator'].should.equal('-')
    it 'should be retrieve the identity parts separator using a function', ->
      document.IdentityPartsSeparator('-')
      document.IdentityPartsSeparator().should.equal('-')
    it 'should be able to set an document key strategy using a function', ->
      document.GenerateDocumentKey('guid')
      document['@conventions']['GenerateDocumentKey'].should.equal('guid')
    it 'should be retrieve the document key strategy using a function', ->
      document.GenerateDocumentKey('guid')
      document.GenerateDocumentKey().should.equal('guid')
