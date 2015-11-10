## [`_design/raspberry_def`](https://github.com/nEDM-TUM/nEDM-Interface/blob/master/subsystems/raspberries/data/raspberry_def.json)

This view is only used in the `raspberries` subsystem.

### `running_processes`

Only handles documents that have a field `running_ids`.  Allows efficient
finding of which raspberry pis are currently running.

* `map`
```javascript
function(doc) {
  if (!doc.running_ids) return;
  emit([doc.created_by, doc.timestamp, doc.ip], null);
  doc.running_ids.forEach( function(o) {
    emit([doc.created_by, doc.timestamp, null], { _id : o });
  });
}
```
* `reduce`: [`_count`](http://docs.couchdb.org/en/1.6.1/couchapp/ddocs.html#reducefun-builtin)

### Query examples

This is only used on the [raspberries site](https://github.com/nEDM-TUM/nEDM-Interface/blob/master/subsystems/raspberries/data/master_control.json).  (Search for `"running_processes"`.)

