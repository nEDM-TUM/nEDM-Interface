## [`_design/log`](https://github.com/nEDM-TUM/nEDM-Interface/blob/master/_default_data/log.json)

This view handles log that are associated with documents, or conversely
documents that are associated with logs.  For example, a log document may be
associated with data documents like:

```javascript
{
    "type" : "log",
    "dataids" : [
      // .. this is a list of ids of data documents
    ]
    // ..
}
```

Any other document may be associated associated with log documents like:

```javascript
{
    "type" : "data",  // This could also be any other type
    "logids" : [
      // .. this is a list of ids of log documents
    ]
    // ..
}
```

This view then normalizes how one gets documents associated with a particular
log.

### `controls`

* `map`
```javascript
function(doc) {
   if (!doc.type) return;
   var i;
   if (doc.type === "log") {
     emit([doc._id, "log"], null);
     if (doc.dataids) {
       for(i = 0;i<doc.dataids.length;i++) {
         emit([doc._id, "data"], {_id : doc.dataids[i]});
       }
     }
   }
   if (!doc.logids) return;
   for(i = 0;i<doc.logids.length;i++) {
     emit([doc.logids[i], doc.type], null);
   }
}
```
* `reduce`: [`_count`](http://docs.couchdb.org/en/1.6.1/couchapp/ddocs.html#reducefun-builtin)

### Query examples

