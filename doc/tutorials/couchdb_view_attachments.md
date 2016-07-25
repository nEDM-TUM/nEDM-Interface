## [`_design/attachments`](https://github.com/nEDM-TUM/nEDM-Interface/blob/master/_default_data/attachments.json)

This view allows determining which documents have attachments and how much data
is being taken up by those attachments.

### `all`

This handles documents attached using [CouchDB's attachment
mechanism](http://docs.couchdb.org/en/1.6.1/api/document/attachments.html)
(which generally should not be used in the nEDM systems) and those using the
[FileServer](/FileServer-Docker/subsystems/APIUsage.html).

* `map`
```javascript
function(doc) {
   var k;
   if (doc._attachments) {
     for (k in doc._attachments) {
       emit([doc._id, k], doc._attachments[k].length);
     }
   }
   if (doc.external_docs) {
     for (k in doc.external_docs) {
       emit([doc._id, k], doc.external_docs[k].size || 0);
     }
   }
}
```
* `reduce`: [`_stats`](http://docs.couchdb.org/en/1.6.1/couchapp/ddocs.html#reducefun-builtin)

### Query examples

This is generally only used for offline querying

* Get total attachment size in `nedm/measurements`:
  <a href="http://raid.nedm1/nedm%2Fmeasurements/_design/attachments/_view/all?stale=update_after">http://raid.nedm1/nedm%2Fmeasurements/_design/attachments/_view/all?stale=update_after</a>.
* In `pynedm`:


