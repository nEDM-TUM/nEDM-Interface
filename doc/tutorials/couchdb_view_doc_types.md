## [`_design/document_type`](https://github.com/nEDM-TUM/nEDM-Interface/blob/master/_default_data/document_type.json)

These are two views to allow querying based upon document type in the database.
With this view, we can get all documents of a certain type, or documents of a
certain type in a data range.

### `document_type`

This view emits as key: `[doc_type, Y, M, D, H, M, S]`.

* `map`
```javascript
function(doc) {
   if (!doc.type || !doc.timestamp) return;
   var then = new Date(Date.parse(doc.timestamp));
   emit([doc.type,
         then.getUTCFullYear(), then.getUTCMonth(),
         then.getUTCDate(), then.getUTCHours(),
         then.getUTCMinutes(), then.getUTCSeconds()], 1);
}
```
* `reduce`: [`_stats`](http://docs.couchdb.org/en/1.6.1/couchapp/ddocs.html#reducefun-builtin)

#### `document_type_label`

This view simply reverses the ordering of the output key, so: `[Y, M, D, H, M, S, doc_type]`.

* `map`
```javascript
function(doc) {
   if (!doc.type || !doc.timestamp) return;
   var then = new Date(Date.parse(doc.timestamp));
   emit([doc.type,
         then.getUTCFullYear(), then.getUTCMonth(),
         then.getUTCDate(), then.getUTCHours(),
         then.getUTCMinutes(), then.getUTCSeconds()], 1);
}
```
* `reduce`
[`_stats`](http://docs.couchdb.org/en/1.6.1/couchapp/ddocs.html#reducefun-builtin)

### Query examples

* In nEDM Interface:
```javascript
// Grab all heartbeat documents
nedm.get_database().getView(
   'document_type',
   'document_type',
   { opts :
                {
                  reduce : false,
                  endkey : ['heartbeat'],
                  startkey : ['heartbeat', {}],
                  descending : true
                }
   },
         function(e, o) {
     // .. handle results
   });
```
* In `pynedm`:


