## [`_design/nedm_default`](https://github.com/nEDM-TUM/nEDM-Interface/blob/master/_default_data/nedm_default.json)

This is a default set of update functions that *all* databases share.

### `insert_with_timestamp`

This is a default function which should always be used when inserting documents
in the database.  It does the following:

* If the document does *not* exist:
 - Add a timestamp
 - Add the field `created_by` (if it doesn't exist)
 - Save in the database
* If the document *does* exist:
 - If `?overwrite=true` was passed in then remove old information in document
 - Otherwise update the document with information from the request body.
 - Update the timestamp

* Usage:
 - It is used inside of [`pyendm.ProcessObject.write_document_to_db`](/Python-Slow-Control/api/html/utils.html#pynedm.utils.ProcessObject.write_document_to_db).

### `attachment`

This is used by the python backend of the [File Server](/FileServer-Docker) to
associate new files with a particular document.  See its usage in [this code](https://github.com/nEDM-TUM/FileServer-Docker/blob/master/handle_req.py).

