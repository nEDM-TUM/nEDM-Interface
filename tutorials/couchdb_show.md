Show functions are used to take document in the CouchDB database and format it
somehow, e.g. in HTML.  The nEDM Interface uses only one `show` function and
it's used to normalized the html output of the interface.  (See, e.g. the other
tutorials concerning build pages: {@tutorial build_page}).

The show function `page` is located in the
[`_design/page`](https://github.com/nEDM-TUM/nEDM-Interface/blob/master/_default_data/page.json)
design document.  It adds the necessary header/html information to ensure that
all pages look the same on the interface.  Any global changes to pages should
happen here.

