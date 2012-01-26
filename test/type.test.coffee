should = require 'should'
Type = require './../lib/objects/type'

describe 'document ->', ->
  describe 'creating a document type ->', ->
    it 'throws an error when no type is passed as an argument', ->
      (-> new Type()).should.throw()
    it 'throws an error when passed argument is not a string', ->
      (-> new Type(3)).should.throw()

  describe 'creating a new document ->', ->
    Reindeer = new Type('Reindeer')
    Reindeer.constructor = (@name, id, seperator, strategy) ->
      @Id(id) if id
      @IdSeparator(seperator) if seperator
      @IdGenerationStrategy(strategy) if strategy

    class Dog extends Type.Base
      constructor: (@name) ->
        super
        @Id(@name)

    it 'sets `Raven-Clr-Type` in `@metadata` object to document type', ->
      document = new Reindeer('Rudolph')
      should.exist(document['@metadata']['Raven-Clr-Type'])
      document['@metadata']['Raven-Clr-Type'].should.equal('Reindeer')
    it 'sets `Raven-Entity-Name` in `@metadata` object to plural of document type', ->
      document = new Reindeer('Rudolph')
      should.exist(document['@metadata']['Raven-Entity-Name'])
      document['@metadata']['Raven-Entity-Name'].should.equal('Reindeers')
    it 'should be able to set an id using a function', ->
      document = new Reindeer('Rudolph', 'rudolph')
      document['@metadata']['@id'].should.equal('rudolph')
    it 'should be able to retrieve the id using a function', ->
      document = new Reindeer('Rudolph', 'rudolph')
      document.Id().should.equal('rudolph')
    it 'should be able to set an identity parts separator using a function', ->
      document = new Reindeer('Rudolph', undefined, '-')
      document['@conventions']['idSeparator'].should.equal('-')
    it 'should be able to retrieve the identity parts separator using a function', ->
      document = new Reindeer('Rudolph', undefined, '-')
      document.IdSeparator().should.equal('-')
    it 'should be able to set a document key strategy using a function', ->
      document = new Reindeer('Rudolph', undefined, undefined, 'guid')
      document['@conventions']['idGenerationStrategy'].should.equal('guid')
    it 'should be able to retrieve the document key strategy using a function', ->
      document = new Reindeer('Rudolph', undefined, undefined, 'guid')
      document.IdGenerationStrategy().should.equal('guid')

    it 'using coffeescript class and extends syntax', ->
      document = new Dog('Max')
      document.Id().should.equal('Max')
