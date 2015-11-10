## [`_design/execute_commands`](https://github.com/nEDM-TUM/nEDM-Interface/blob/master/_default_data/execute_commands.json)

These views are used to track commands that are exported in the DB (available to be called).
It also tracks commands which have arrived and have not yet completed.

### `export_commands`

Commands which are available to be called in the database.

* `map`
```javascript
function(doc) {
    if (!doc.type || doc.type != 'export_commands') return;
    for (var k in doc.keys) {
      emit(k, [doc.keys[k].Info, doc.uuid, doc.log_servers]);
    }
}
```
* `reduce`: [`_count`](http://docs.couchdb.org/en/1.6.1/couchapp/ddocs.html#reducefun-builtin)

### `incomplete_commands`

Commands which have not yet been completed.

* `map`
```javascript
function(doc) {
    if (!doc.type || doc.type != 'command') return;
    if (doc.response) return;
    emit([doc.execute, doc._id], 1);
}
```
* `reduce`: [`_sum`](http://docs.couchdb.org/en/1.6.1/couchapp/ddocs.html#reducefun-builtin)


### `complete_commands`

Commands which have been completed (have a `response` field).

* `map`
```javascript
function(doc) {
    if (!doc.type || doc.type != 'command') return;
    if (!doc.response) return;
    emit([doc.execute, doc._id], 1);
}
```
* `reduce`: [`_sum`](http://docs.couchdb.org/en/1.6.1/couchapp/ddocs.html#reducefun-builtin)

### `export_commands`

* `map`
```javascript
function(doc) {
    if (!doc.type || doc.type != 'export_commands') return;
    for (var k in doc.keys) {
      emit(k, [doc.keys[k].Info, doc.uuid, doc.log_servers]);
    }
}
```
* `reduce`: [`_count`](http://docs.couchdb.org/en/1.6.1/couchapp/ddocs.html#reducefun-builtin)



### Query examples

* [Getting commands in nEDM Interface]{@link nEDMDB#getCommands}.
* [Sending commands in nEDM Interface]{@link nEDMDB#send_command} (uses `(in)complete_commands`).

