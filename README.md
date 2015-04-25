nEDM-Interface
==============

nEDM User Interface for sub systems, also an interface for slow-control systems

Build instructions
------------------

1.  Install kanso (http://kan.so/install).
2.  ```cd head; kanso install``` (This only needs to be done at the beginning, and when you update kanso packages.
3.  To push everything to DB, type at the base directory:

`python push_to_db.py`

This will push to a local coucdhdb server.  It will prompt for
username/passwords if password protected.  This script wraps various kanso
commands.

It is possible to save setting in a .nedmrc file, e.g.:

```
% cat .nedmrc
{
  local: {
    username : "myusername",
    password : "mypwd",
    server   : "localhost:5984"
  },
  deployed: {
    username : "mydeployedusername",
    password : "mydeployedpwd",
    server   : "deployed_host:5984"
  }
  ...
  default : "local"
}

```
where the default indicates which will be used normally.  ```jshint``` is an additional dependency:

```
npm install -g jshint
```

## Notes for developers


*Note:*  The best mechanism for testing your interface is setting up a local
server and pushing to it.  You will also need to set your configuration to
allow "insecure" rewrites. At the
configuration site (http://127.0.0.1:5984/_utils/config.html), make sure that
```httpd : secure_rewrites``` is set to ```false```.  Once you do this and push
to the local server, you will be able to reach the main page at:

http://127.0.0.1:5984/nedm_head/_design/nedm_head/_rewrite

Each subsystem in the nEDM interface occupies a single database.  In addition,
each kanso app produces a single design document on the CouchDB server.  Each
subsystem (e.g. sub-folders in the subsystem directory) automatically receives
the design document from the \_default directory.  This allows general
interface changes or general views to be added to this directory and
automatically propagated to the other databases.  Users requiring additional
modules from kanso, or additional javascript dependencies should add these to
the head/ directory.

### Setting up to read from DB
Most of the time, you will want to be able to have "real" data on your system,
as well as see real-time updates.  To do this, you need to set up replication
with the database server, but *please* use the secondary server (10.155.59.15),
which is accessible with the normal TUM VPN.

1. Make an aggregate DB if not already on your system (after a push_to_db.py):
`nedm/aggregate`
1. Add continuous replication for `nedm/aggregate`, add the document to the
`_replicate` database:
```
{
  "owner" : "your_id",
  "source" : "http://UN:PW@10.155.59.15:5984/nedm%2Faggregate",
  "target" : "nedm/aggregate",
  "continuous" : true
}
```
Swap out UN and PW (standard nEDM read-only values)
1. Add continuous replication for your DB of choice (e.g. `nedm/cs_laser`),
by modifying the above as necessary and submitting a new document.





## Dealing with Commands


Every interface will in principal have controls.  To facilitate this, the nEDM
interface looks for documents of type "control", e.g.:

    doc = {
        "_id": "name_of_control",         # Required
        "type" : "control",               # Required
        "html" : "...",                   # Optional, gives html that will be
                                          # used to show control

        "pageevents" : {                  # Optional, allows functions to be
                                          # called on page events.  This is
                                          # useful, for example, to call
                                          # shutdown functions.  Allowed events
                                          # are those given in the
                                          # jquery-mobile framework.  Takes
                                          # javascript.

            "pagehide" : " javascript"
        },
        "script" : "javascript script",   # Script that will be run during
                                          # loading of the controls on the
                                          # webpage.

        ...
    }


There are several templates that one can derive from by using

```
doc = {
   ...
  "template" : "/nedm_head/switch_template",
  ...
}
```

This allows users to specify that this is e.g. a switch type.  See the various
template objects in head/data/*.json.  There is further documentation in that
directory.

