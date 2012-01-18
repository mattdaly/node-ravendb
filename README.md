node-ravendb
============
A javascript based [Raven DB](http://ravendb.net/) client for node.js.

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

Installation
============
...


Documentation
=============
Detailed documentation and examples can be found [on the node-ravendb wiki pages](https://github.com/mattdaly/node-ravendb/wiki). A thorough example application is forthcoming.
