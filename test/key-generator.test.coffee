should = require 'should'
DocumentKeyGenerator = require './../lib/util/key-generator'
Type = require './../lib/objects/type'

describe 'key generator ->', ->
  Reindeer = new Type('Reindeer')
  Reindeer.constructor = (id, seperator, strategy) ->
    @Id(id) if id
    @IdSeparator(seperator) if seperator
    @IdGenerationStrategy(strategy) if strategy

  seperator = '/'
  generator = 'auto'

  describe 'generating keys for documents ->', ->
    it 'returns an undefined id if no `Raven-Clr-Type` is defined', ->
      DocumentKeyGenerator.generate({ }, seperator, generator, (key) -> should.equal(undefined, key))

    describe 'strategy ->', ->
      it 'not setting an id returns id of the format `reindeers/`', ->
        DocumentKeyGenerator.generate(new Reindeer, seperator, generator, (key) -> key.should.equal('reindeers/'))
      it 'setting an id returns an id of the format `reindeers/rudolph', ->
        DocumentKeyGenerator.generate(new Reindeer('Rudolph'), seperator, generator, (key) -> key.should.equal('reindeers/rudolph'))
      it 'not setting an id and setting the strategy as `guid` returns a null key (for raven to generate a guid)', ->
        DocumentKeyGenerator.generate(new Reindeer(null, null, 'guid'), seperator, generator, (key) -> should.equal(null, key))
      it 'setting an id overrides and strategy that may be set', ->
        DocumentKeyGenerator.generate(new Reindeer('Rudolph', null, 'guid'), seperator, generator, (key) -> key.should.equal('reindeers/rudolph'))

    describe 'seperator ->', ->
      it 'any set seperator should be ignored when no id is set and revert to default with a forward slash', ->
        DocumentKeyGenerator.generate(new Reindeer(null, '-'), seperator, generator, (key) -> key.should.equal('reindeers/'))
      it 'setting an id and setting a seperator returns the default strategy using the provided seperator `reindeers-rudolph`', ->
        DocumentKeyGenerator.generate(new Reindeer('Rudolph', '-'), seperator, generator, (key) -> key.should.equal('reindeers-rudolph'))
      it 'setting a strategy overrides a seperator)', ->
        DocumentKeyGenerator.generate(new Reindeer(null, '-', 'guid'), seperator, generator, (key) -> should.equal(null, key))


    describe 'global conventions ->', ->
      it 'when no id is set, a custom global strategy should work when no document strategy is set', ->
        DocumentKeyGenerator.generate(new Reindeer, seperator, 'guid', (key) -> should.equal(null, key))
      it 'when no id is set, a document strategy should override a global strategy', ->
        DocumentKeyGenerator.generate(new Reindeer(null, null, 'auto'), seperator, 'guid', (key) -> key.should.equal('reindeers/'))
      it 'when an id is set, a custom global seperator should work when no document seperator is set', ->
        DocumentKeyGenerator.generate(new Reindeer('Rudolph'), '-', generator, (key) -> key.should.equal('reindeers-rudolph'))
      it 'when no id is set, a document seperator should override a global seperator', ->
        DocumentKeyGenerator.generate(new Reindeer('Rudolph', '_'), '-', generator, (key) -> key.should.equal('reindeers_rudolph'))
