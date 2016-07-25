This update function is used to update documents in the `aggregate` database
(the database that aggregates all the changes feeds of the different DBs, see
e.g.
[here](/CouchDB-Docker/subsystems/Maintenance.html#view-updateraggregator)).

## [`aggregate`](https://github.com/nEDM-TUM/nEDM-Interface/blob/master/subsystems/aggregate/data/aggregate.json)

Updates documents in the aggregate database.  This update function is only
called by the [agreggator daemon](https://github.com/nEDM-TUM/CouchDB-Docker/blob/master/couchdb_updater.py).

