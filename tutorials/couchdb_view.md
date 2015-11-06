View functions are the main tool used to query information about documents
in the database.  This page outlines which view functions are in use in the
nEDM interface.

## Global (used in all systems)

These views are used in all subsystems due to their generic nature.

### Document type [`_design/document_type`](https://github.com/nEDM-TUM/nEDM-Interface/blob/master/_default_data/document_type.json)

These are two views to allow querying based upon document type in the database.
With this view, we can get all documents of a certain type, or documents of a
certain type in a data range.

#### `document_type`

This view emits: `[doc_type, Y, M, D, H, M, S]`.

##### `map`
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
##### `reduce`
[`_stats`](http://docs.couchdb.org/en/1.6.1/couchapp/ddocs.html#reducefun-builtin)

#### Query (with `pynedm`)

#### `document_type_label`

This view simply reverses the ordering of the output, so: `[Y, M, D, H, M, S, doc_type]`.

##### `map`
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
##### `reduce`
[`_stats`](http://docs.couchdb.org/en/1.6.1/couchapp/ddocs.html#reducefun-builtin)



