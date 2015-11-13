## "Special" pages

These pages are special subsystems in the nEDM Interface:

* [Measurements](#measurements)
* [Raspberry Pis](#raspberries)
* [NMR Waveform generation](#waveform)

<a name="measurements"></a>
### Measurements

[http://db.nedm1/page/control/nedm/measurements](http://db.nedm1/page/control/nedm/measurements)

The measurements page provides an interface for:

* Viewing previously saved measurements
* Making new measurement "protocols" using commands from different subsystems
* Downloading files from measurements
* Editing/deleting previous measurements

There are two main controls, including a calendar and a single measurement interface.

![measurements calendar](measurement_calendar.png)

The calendar shows where particular measurements have occured.  Clicking on a
date will produce a list under the calendar.  Clicking on an entry in this list
will load the measurement in the single measurement interface.  _Note_ that by
selecting `Auto update`, the measurements page will reload new measurements
when they are uploaded to the database.

The single measurement interface looks like:

![measurements interface](measurement_single.png)

One sees on this page several entries including:

* Name - name of measurement
* Saved - document `"id"`
* Protocol - interface for creating/editing a protocol,
see the inline help on the measurements page for more information.
* Log - view/edit log and name of measurement
* All information - the full document saved in the database
* Attached files - files attached to this document

#### Interface to measurements with [`pynedm`](/Python-Slow-Control)

On the measurements page it is only possible to singly delete measurements
and download files one at a time.  It is also currently not possible to upload
files to the interface (this would be a valuable improvement of the interface).

However, all this functionality can be performed using
[`pynedm`](/Python-Slow-Control):

* Find many measurements: <script src="https://gist.github.com/mgmarino/a068d39ed9fdb501c72d.js"></script>
* Post files to a document: <script src="https://gist.github.com/mgmarino/04d92217d227dc99520d.js"></script>
* Deleting a measurement or more measurements: <script src="https://gist.github.com/mgmarino/991396f0ef26ae4b9e4d.js"></script>


<a name="raspberries"></a>
### Raspberry Pis

[http://db.nedm1/page/control/nedm/raspberries](http://db.nedm1/page/control/nedm/raspberries)

The Raspberry Pi page provides an interface for editing/creating code that will
be run on nEDM Raspberry Pis.  (To setup a Raspberry Pi to run with this system, see the
[documentation here](/System-Overview/subsystems/Raspberry-Pis.html#setup).)

The page looks like:

![raspberry front page](raspberry.png)

On this page, one has:

* a drop down select menu of the available Raspberry Pis (listed with their MAC ids)
* a status area showing when the last heartbeat from the device arrived
* a button to open a console
* list of the running code (green means script is running, red means it is not)
* log showing current logging information

#### Adding, editing code

A new script can be created by clicking on `New script`.  One can edit this
script by opening the collapsible, which looks like:

![raspberry editing](raspberry_scripts.png)

In this view one sees the name of the script, and the code to be edited.  There
is a drop-down menu where one can select the particular python module to be
edited.  Removing a module can be done by clicking on `Remove module`.
(_Note_, there must always be a module named `main` with a function named
`main` inside.)

Adding a new module is done by:

1.  Typing the name into the text field.
2.  Clicking on `New module with name:`

Selecting `Export modules globally` makes the modules in this script available
to other scripts on the same Raspberry Pi.  This can be useful if a class is
used by many different scripts.

`Save` saves the script (and restarts *all* scripts on the particular Raspberry Pi).
`Remove` removes the scripts (and restarts *all* scripts on the particular Raspberry Pi).

Note that one needs write access to the raspberries database to do this, and
that it is stronly recommended to give the user only write access to the
Raspberry Pis s/he needs.  See the documentation here:

* [Limited Users]{@tutorial couchdb_validate_raspberry}
* [General]{@tutorial couchdb_users}

#### Accessing the Raspberry Pi terminal

By clicking on `Launch Terminal`, one has access to an `ssh`-like session.
This can be useful for updating the software on the Raspberry Pis (remembering
that they all use a Netboot system, see
[here](/System-Overview/subsystems/Raspberry-Pis.html#netbooting) and
[here](/System-Overview/subsystems/Raspberry-Pis.html#running)).

![raspberry terminal](raspberry_console.png)

<a name="waveform"></a>
### NMR Waveform generation

[http://db.nedm1/page/control/nedm/waveform](http://db.nedm1/page/control/nedm/waveform)
