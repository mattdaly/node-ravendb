should = require 'should'
Type = require './../lib/objects/type'
Queryable = require './../lib/objects/queryable'

describe 'queryable ->', ->
  Reindeer = new Type('Reindeer')
  Reindeer.constructor = (@name, @age) ->
    @Id(@name)
    @breed = 'Reindeer'

  rudolph = new Reindeer('Rudolph', 4)
  prancer = new Reindeer('Prancer', 7)
  vixen = new Reindeer('Vixen', 2)
  dasher = new Reindeer('Dasher', 7)

  documents = [ rudolph, prancer, vixen, dasher  ]

  describe 'creating a queryable array ->', ->
    it 'passing no documents to the queryable returns in an empty array', ->
      (-> new Queryable()).should.be.empty
    it 'passing an array of documents to the queryable returns a new queryable containing those documents', ->
      docs = new Queryable(documents)
      docs.length.should.equal(4)
 
  describe 'functions ->', ->
    docs = null
    beforeEach ->
      docs = new Queryable(documents)

    describe 'the all function ->', ->
      it 'should return true if all queryable elements match the provided expression', ->
        (docs.all((x) -> x.breed is 'Reindeer')).should.be.true
      it 'should return false if one or more queryable element does not match the provided expression', ->
        (docs.all((x) -> x.age is 4)).should.be.false

    describe 'the any function ->', ->
      it 'should return true if any queryable elements match the provided expression', ->
        (docs.any((x) -> x.age is 4)).should.be.true
      it 'should return false if no queryable elements match the provided expression', ->
        (docs.any((x) -> x.age is 3)).should.be.false

    describe 'the count function ->', ->
      it 'should return the length of the queryable when no expression is provided', ->
        (docs.count()).should.equal(4)
      it 'should return the number of the queryable elements that match the provided expression', ->
        (docs.count((x) -> x.age is 7)).should.equal(2)
      it 'should return zero when no queryable elements  match the provided expression', ->
        (docs.count((x) -> x.age is 9)).should.equal(0)

    describe 'the elementAt function ->', ->
      it 'should return the correct the correct queryable element when an index is provided', ->
        (docs.elementAt(1)).should.equal(prancer)
        
    describe 'the exists function ->', ->
      it 'should return true if any queryable elements match the provided expression', ->
        (docs.exists((x) -> x.age is 4)).should.be.true
      it 'should return false if no queryable elements match the provided expression', ->
        (docs.exists((x) -> x.age is 3)).should.be.false

    describe 'the first function ->', ->
      it 'should return the first element of the queryable when no expression is provided', ->
        (docs.first()).should.equal(rudolph)
      it 'should return the first element of the queryable that matches the provided expression', ->
        (docs.first((x) -> x.age is 7)).should.equal(prancer)
      it 'should return undefined when no queryable elements match the provided expression', ->
        should.not.exist((docs.first((x) -> x.age is 9)))
        
    describe 'the last function ->', ->
      it 'should return the last element of the queryable when no expression is provided', ->
        (docs.last()).should.equal(dasher)
      it 'should return the last element of the queryable that matches the provided expression', ->
        (docs.last((x) -> x.age is 7)).should.equal(dasher)
      it 'should return undefined when no queryable elements match the provided expression', ->
        should.not.exist((docs.last((x) -> x.age is 9)))
                
    describe 'the load function ->', ->
      it 'should return the element of the queryable whose id matches that specified', ->
        (docs.load('Rudolph')).should.equal(rudolph)
      it 'should return undefined when no queryable elements id matches that specified', ->
        should.not.exist(docs.load('Jeff'))
                
    describe 'the select function ->', ->
      it 'should return a new queryable containing the properties when specifiying a property name as a string', ->
        (docs.select('age')).should.eql([ 4, 7, 2, 7 ])
      it 'should return a new queryable containing the properties and their new values when specifiying a function to apply', ->
        (docs.select((x) -> x.age * 2)).should.eql([ 8, 14, 4, 14 ])
                
    describe 'the single function ->', ->
      it 'should return a single element from the queryable that matches the provided exprssion', ->
        (docs.single((x) -> x.name is 'Rudolph')).should.equal(rudolph)
      it 'should return undefined when no queryable elements match the provided exprssion', ->
        should.not.exist(docs.single((x) -> x.name is 'Jeff'))
      it 'should throw when more than one element matches the provided expression', ->
        (-> docs.single((x) -> x.age is 7)).should.throw()
        
    describe 'the where function ->', ->
      it 'should return all queryable elements that match the provided expression', ->
        (docs.where((x) -> x.age is 7)).should.eql([ prancer, dasher ])
      it 'should return an empty queryable if no  queryable element match the provided expression', ->
        (docs.where((x) -> x.age is 3)).should.be.empty

