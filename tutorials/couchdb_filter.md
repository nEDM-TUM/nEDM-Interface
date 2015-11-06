Filters are used for filtering results in changes feed functions.  This means
that the server will only ship information that passes the filter.

## [`_design/nedm_default`](https://github.com/nEDM-TUM/nEDM-Interface/blob/master/_default_data/nedm_default.json)

### `doc_type`

This filter only passes documents of a certain type or within a certain set.
Query parameters that may be sent to this filter are:

* `handle_delete` - `true` (will pass documents that have been deleted) or `false` (will not)
* `type` - either string or array of strings of types of documents to pass

* Example usage: this is used on the measurements site page to selectively
listen for new measurements arriving: see [here](https://github.com/nEDM-TUM/nEDM-Interface/blob/master/subsystems/measurements/data/view_measurements.json)

## [`_design/execute_commands`](https://github.com/nEDM-TUM/nEDM-Interface/blob/master/_default_data/execute_commands.json)

### `execute_commands`

This filter passes command documents (e.g. `"type" = "command"`).  It takes as a query parameter:

* `only_commands` - array of strings of command keys to pass

This is essential for [`pynedm`](/Python-Slow-Control) listeners that are only
listening for a select set of commands.

* Example usage: this is used in `pynedm` to listen for particular commands
arriving, see [here](/Python-Slow-Control/api/html/listen.html#pynedm.listen._watch_changes_feed)

