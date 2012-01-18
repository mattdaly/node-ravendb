node-ravendb
============

A javascript based [Raven DB](http://ravendb.net/) client for node.js.

```javascript
var raven = require('./node-ravendb-client');

var store = new raven.Store({ 
  host: '1.1.1.1', 
  port: 1234, 
  database: 'database' 
});
store.initialize();
var session = store.openSession();

var Reindeer = new raven.Document('Reindeer');
Reindeer.prototype.init = function (name) {
  this.name = name;
  this.Id(this.name);
};

session.store(new Reindeer('Rudolph'));
session.save(function (err, keys) {
  if (!err) console.log(keys);
});

session.load('reindeers/rudolph', function (err, rudolph) {
  if (!err) {
    rudolph.nose = 'red';
    session.save();
  }
});
```

`node-ravendb` is essentially a wrapper around Raven's HTTP API, however, it aims to replicate the Client API as closely as possible. Creating a document store provides you with the same functionality offered by the Client API - you configure your connection and you can set some conventions. Providing you have initialized the store, calling `openSession()` will provide you with a session object and the necessary functions to perform actions against your document store.

Check out the wiki pages for more information on how to use `node-ravendb`.

Installation
============
...
