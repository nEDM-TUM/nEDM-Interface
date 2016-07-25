The changes feed is an essential component of the nEDM system because it
provides notification services when a document in the database is created,
edited, or deleted.  This is used primarily for the following functions:

* Notification when a command arrives (e.g. for a device listening and waiting
for commands)
* Notification when `data` documents arrive.  This allows updates of plots in
the web interface, etc.
* Notification when `heartbeat` documents arrive.  This is used to ensure that
different systems are correctly running since they should save heartbeats in
the database every few seconds.  (These extra documents get deleted when a
database is compacted.)

### Problem

Because each system has its own database and each database has its own changes
feed, this can complicate the system for two reasons:

* To listen to all databases, a user would have to listen to the separate
changes feeds of *all* different systems.  This does not scale well.
* When multiple browser windows are open, each window (tab) would have its own
connection(s) to the server.  However, generally the number of open sockets to
a particular server is limited (<6 on Chrome) and, since changes feeds hold the
sockets open, the available connections will quickly be used up.

### Solution

The solution to this has two components:

* Setup an aggregate database that aggregates the changes from all other
databases.  This currently runs in the [CouchDB Docker](/CouchDB-Docker) as a
daemon.  The nEDM interface then only connects to the changes feed of this
*one* database and gets information on all databases.  (Note: CouchDB does have
a global changes feed, but it's protected for only admin users and doesn't
return all the information we would want.)
* In the web interface, when there are multiple windows/tabs open, then only
one of these is the 'Master' listener.  All other tabs get information about
the updated changes feed by using
[`localStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage),
which allows [events to be fired](https://developer.mozilla.org/en-US/docs/Web/Events/storage) when new
data is saved.  The code where this is done can be found [here]{@link module:lib/nedm~HandleDatabaseChanges}.

