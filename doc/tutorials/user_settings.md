## Settings page

[http://db.nedm1/page/settings](http://db.nedm1/page/settings)

The settings page provides a central location to see a summary of information
contained in the different databases/subsystems.  The following information is
presented on the site:

* Name of subsystem (full name)
* Variables (e.g. those in `"data"` documents) available in the database.
* Available command names
* [Listeners](#listeners)

_Note_ that the information on this page is always up-to-date.  This can lead
to slow load times for some of the databases.

An example of the page:

![settings screen shot](settings.png)

<a name="listeners"></a>
### Listeners

Listeners are devices that are listening (i.e. via
[`pynedm`](/Python-Slow-Control/#logging-server) and are exporting their
logging information via WebSocket (see
[the pynedm API docs](/Python-Slow-Control/api/html/log.html#pynedm.log.BroadcastLogHandler)
for more details).

Logging data shows up in the `Status` window on the right side (which appears
by clicking on `Status` in the toolbar), and will continue showing up even if
one navigates away from the "Settings" page.  The status of the loggers (i.e.
whether the browser has subscribed to the WebSocket) is saved in
`localStorage`, meaning it is preserved when the browser is restarted.

An example of what this looks like in the wild:

![settings screen shot w/ logging](settings_log_info.png)
