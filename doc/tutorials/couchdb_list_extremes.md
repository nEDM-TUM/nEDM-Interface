
## [`_default/extremes`](https://github.com/nEDM-TUM/nEDM-Interface/blob/master/_default_data/extremes.json)

The list function filters out extremes (e.g. latest/earliest values).  This is
simply a convenience function and moves some work to the server instead of the
browser.

```javascript
function(head, req) {
   provides("json", function() {
     var keys = {};
     var lab, row, extreme_time = null;
     while( (row = getRow()) ) {
       lab = row.key.pop();
       if (!extreme_time) {
         extreme_time = row.key;
       }
       if (keys[lab]) {
         continue;
       }
       keys[lab] = { value : row.value, time : row.key};
     }
     send(JSON.stringify({extreme_time : extreme_time, keys : keys}));
   });
}
```

## Example usage

See how it's used in {@link module:lib/update_db} to only get the most recent
values:

```javascript
// ..
db.getList("extremes", "extremes", "slow_control_time_label", "slow_control_time_label",
  opts,
  function(e, o) {
    if (e === null && o.extreme_time) {
      latest_time = o.extreme_time;
      latest_time.push({});
      _callback_emitters.emit("latest", o.keys);
    }
    latest_callback_called = false;
  }
);
// ..
```

