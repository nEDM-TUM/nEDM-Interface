## [`_design/measurements`](https://github.com/nEDM-TUM/nEDM-Interface/blob/master/subsystems/measurements/data/measurements.json)

This view is only used in the `measurements` subsystem.

Both views find only measurement documents (`"type" === "measurement"`).

### `measurements`

Emits `[measurement_name, Y, M, D, H, M, S]` as key and the log as value.

* `map`
```javascript
function(doc) {
   if (!doc.type || !doc.timestamp) return;
   if (doc.type !== "measurement") return;
   var then = new Date(Date.parse(doc.timestamp));
   var the_log = doc.log || "No log";
   emit([doc.measurement_name || "Unknown",
         then.getUTCFullYear(), then.getUTCMonth(),
         then.getUTCDate(), then.getUTCHours(),
         then.getUTCMinutes(), then.getUTCSeconds()], the_log.trim());
}
```
* `reduce`: [`_count`](http://docs.couchdb.org/en/1.6.1/couchapp/ddocs.html#reducefun-builtin)

### `measurements_label`

Emits `[Y, M, D, H, M, S, measurement_namee]` as key and the log as value.

* `map`
```javascript
function(doc) {
   if (!doc.type || !doc.timestamp) return;
   if (doc.type !== "measurement") return;
   var then = new Date(Date.parse(doc.timestamp));
   var the_log = doc.log || "No log";
   emit([then.getUTCFullYear(), then.getUTCMonth(),
         then.getUTCDate(), then.getUTCHours(),
         then.getUTCMinutes(), then.getUTCSeconds(),
         doc.measurement_name || "Unknown"], the_log.trim());
}
```
* `reduce`: [`_count`](http://docs.couchdb.org/en/1.6.1/couchapp/ddocs.html#reducefun-builtin)

### Query examples

This is only used on the measurement site in the [calendar view](https://github.com/nEDM-TUM/nEDM-Interface/blob/master/subsystems/measurements/data/view_measurements.json).

