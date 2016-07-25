## [`_design/controls`](https://github.com/nEDM-TUM/nEDM-Interface/blob/master/_default_data/controls.json)

This view simple grabs all control documents (e.g. to make a control page) from
a database.  The reason we don't simply use `document_type` is because it needs
to handle templates as well.  (Template control documents are pushed into every
database.)  For this reason, this view correctly associates the templates with
the control documents that request them.  In addition, it allows ordering the
control documents by specifying an `order` field in the document.

### `controls`

* `map`
```javascript
function(doc) {
    if (!doc.type || doc.type !== "control") return;
    var order = doc._id;
    if (typeof doc.order !== "undefined") order = doc.order;
    if (doc.template) {
        emit([order,0], { _id : doc.template } );
    }
    emit([order,1], null);
}
```
* `reduce`: none

### Query examples

`controls` is generally only used when building control pages and is called
together with the list function `controls` in the `page` design document.  (See
[documentation for list functions]{@tutorial couchdb_list}.)  It is therefore
called directly in the HTTP API, e.g.:

```bash
/page/_list/controls/controls/controls
```

