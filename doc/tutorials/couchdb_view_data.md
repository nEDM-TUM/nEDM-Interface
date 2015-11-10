## [`_design/slow_control_time`](https://github.com/nEDM-TUM/nEDM-Interface/blob/master/_default_data/slow_control_time.json) and [`_design/slow_control_time_label`](https://github.com/nEDM-TUM/nEDM-Interface/blob/master/_default_data/slow_control_time_label.json)

These views are the main views for querying data (getting data from a database).  It works on documents that looks like:

```javascript
{
   "type" : "data",
   // ..
   "value" : {
     "data_1" : 1.23 // a number value
     // ..
   }
}
```

and emits for each data point (all keys in `"value"`).

### `slow_control_time`

This view emits as key: `[data_name, Y, M, D, H, M, S]`.

* `map`
```javascript
function(doc) {
     if (!doc.type || doc.type != 'data') return;
     var then = new Date(Date.parse(doc.timestamp));
     for (var key in doc.value) {
         emit([key,
               then.getUTCFullYear(), then.getUTCMonth(),
               then.getUTCDate(), then.getUTCHours(),
               then.getUTCMinutes(), then.getUTCSeconds()], Number(doc.value[key]));
     }
}
```
* `reduce`: [`_stats`](http://docs.couchdb.org/en/1.6.1/couchapp/ddocs.html#reducefun-builtin)

### `slow_control_time_label`

This view simply reverses the ordering of the output key, so: `[Y, M, D, H, M, S, data_name]`.

* `map`
```javascript
function(doc) {
     if (!doc.type || doc.type != 'data') return;
     var then = new Date(Date.parse(doc.timestamp));
     for (var key in doc.value) {
         emit([
               then.getUTCFullYear(), then.getUTCMonth(),
               then.getUTCDate(), then.getUTCHours(),
               then.getUTCMinutes(), then.getUTCSeconds(), key], doc.value[key]);
     }
}
```
* `reduce`
[`_stats`](http://docs.couchdb.org/en/1.6.1/couchapp/ddocs.html#reducefun-builtin)

### Query examples

* In nEDM Interface:
 - [nEDMDB]{@link module:lib/nedm~nEDMDatabase#get_most_recent_value}
 - [MonitoringGraph]{@link module:lib/monitoring_graph.MonitoringGraph#changeTimeRange}
* In `pynedm`:


