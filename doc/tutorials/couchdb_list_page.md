## [`_default/page`](https://github.com/nEDM-TUM/nEDM-Interface/blob/master/_default_data/page.json)

### `controls`

Provides a list of control functions for a given database.  This is generally
never called directly from the browser, but rather is called during a rewrite.

This means, calling the following URL:

```
/page/control/adb
```

actual calls the URL endpoint:

```
/adb/_design/page/_list/controls/controls/controls
```

See the
[rewrites.js](https://github.com/nEDM-TUM/nEDM-Interface/blob/master/head/lib/rewrites.js)
document for more information.

