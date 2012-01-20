node-ravendb
============
A node.js javascript client for [Raven DB](http://ravendb.net/).

Installation
============
...


Documentation
=============
Detailed documentation and examples can be found [on the node-ravendb wiki pages](https://github.com/mattdaly/node-ravendb/wiki). A thorough example application is forthcoming.

Sample Usage
=============
```javascript
var raven = require('./node-ravendb');

var store = new raven.Store({ 
  host: '1.1.1.1', 
  port: 1234, 
  database: 'Foo' 
});
store.initialize();

var session = store.openSession();

session.load('dogs/max', function (err, max) {
  if (!err) {
    max.age = 13;
    session.save();
  }
});
```
