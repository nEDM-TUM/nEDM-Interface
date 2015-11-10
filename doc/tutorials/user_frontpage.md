### Front page

The front page provides the main access point to the rest of the interface.

![front page](frontpage.png)

In particular, the *lights* indicate the status of each database/system:

  * Yellow - not yet determined
  * Green - Control active (heartbeat has been written in the last 10 seconds),
Writing active (a document with `type="data"` has been written in the last 10
seconds.
  * Red - Control and/or Writing not active

Logging in and out can be done using the button in the upper right hand corner.

Other buttons of interest:

* `Home` - returns to the front page
* `Refresh live updates` - if live updates are no longer occuring (perhaps
another browser window was closed and the [changes feed]{@tutorial couchdb_changes}
 is not responding any more), then this will reset them.
* `Toggle sidebar` - hide/show the sidebar.  This allows more screen to be used
for e.g. plotting, which can be useful for smaller screened devices.
* `Status` - show the status screen.  This shows *live* which databases are
writing in addition to any log messages from `pynedm` devices (see the
[settings page]{@tutorial user_settings}).

The status screen is shown:

![front page w/ status](frontpage_status.png)

It may be 'minimized' with the minimize button on its upper right hand corner.

The toolbar has been toggled and the live updates have been refreshed:
(_Master_ windows, or those listening to the changes feeds directly have the
down-pointing arrow in the upper toolbar.)

![front page w/ toggled toolbar, changes feed](frontpage_toggle_live.png)
