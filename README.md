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

For a general overview, see the
[presentation](https://www.dropbox.com/s/8xfayj9zi67o3ao/GroupMeeting_23Oct2014.pdf?dl=0)
describing the basic functionality of the system.

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
  "continuous" : true,
  "user_ctx" : {
    "name" : "your_id",
    "roles" : [ "_admin"]
  }
}
```
Swap out UN and PW (standard nEDM read-only values)

1. Add continuous replication for your DB of choice (e.g. `nedm/cs_laser`),
by modifying the above as necessary and submitting a new document.  The filter
field ensures that only data documents are replicated, which is generally what
you want.  To get only the results *since now*, grab the recent `update_seq`
number, e.g.: 
```
> curl  "http://UN:PW@10.155.59.15:5984/nedm%2Fcs_laser" 
{"db_name":"nedm/cs_laser","doc_count":4558162,"doc_del_count":242,"update_seq":4558974,"purge_seq":0,"compact_running":false,"disk_size":1415667831,"data_size":1393833154,"instance_start_time":"1429621582837885","disk_format_version":6,"committed_update_seq":4558974}
```
and input it into your replication `since_seq`.
```
{
  "owner" : "your_id",
  "source" : "http://UN:PW@10.155.59.15:5984/nedm%2Fcs_laser",
  "target" : "nedm/cs_laser",
  "continuous" : true,
  "filter" : "nedm_default/doc_type",
  "query_params" : {
    "type" : "data"
  },
  "since_seq" : 4558974,
  "user_ctx" : {
    "name" : "your_id",
    "roles" : [ "_admin"]
  }
}
```


## Dealing with Commands


Every interface will in principal have controls.  To facilitate this, the nEDM
interface looks for documents of type "control", e.g.:

```
    doc = {
        "_id": "name_of_control",         # Required
        "type" : "control",               # Required
        "html" : """...""",               # Optional, gives html that will be
                                          # used to show control

        "script" : """                    # Script that will be run during
  function($theDOM, docobj) {             # loading of the controls on the
	...                                   # webpage (during the jQuery-Mobile
										  # event 'pagecreate').  '$theDOM' is
										  # the DOM object }""" where the
										  # control is inserted.  'docobj' is
										  # the JSON document inserted in to
										  # the DB, allowing customization
										  # based upon fields in the JSON.
    }
"""
}
```


There are several templates that one can derive from by using

```
doc = {
   ...
  "template" : "/nedm_head/switch_template",
  ...
}
```

This allows users to specify that this is e.g. a switch type.  See the various
template objects in _default_data/*.json.  There is further documentation in that
directory.

