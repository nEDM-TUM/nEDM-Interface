nEDM-Interface
==============

nEDM User Interface for sub systems, also an interface for slow-control systems

Build instructions
------------------

1.  Enter \_default, type `kanso install` 
2.  Enter head, type `kanso install`
3.  To push everything to DB, type:

`python push_to_db.py`

This will push to a local coucdhdb server.  It will prompt for
username/passwords if password protected.  This script wraps various kanso
commands.

It is possible to save setting in a .nedmrc file, e.g.:

``` 
% cat .nedmrc
{
  "username" : "myusername",
  "password" : "mypwd",
  "server"   : "localhost:5984"
}

``` 

Notes for developers
--------------------

Each subsystem in the nEDM interface occupies a single database.  In addition,
each kanso app produces a single design document on the CouchDB server.  Each
subsystem (e.g. sub-folders in the subsystem directory) automatically receives
the design document from the \_default directory.  This allows general
interface changes or general views to be added to this directory and
automatically propagated to the other databases.  Users requiring additional
modules from kanso, or additional javascript dependencies should add these to  
the head/ directory.

Dealing with Commands
---------------------

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
  "template" : "/nedm%2Fhead/switch_template",
  ...
}
```

This allows users to specify that this is e.g. a switch type.  See the various
template objects in head/data/*.json.  There is further documentation in that
directory.

