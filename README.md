nEDM-Interface
==============

nEDM User Interface for sub systems, also an interface for slow-control systems

Build instructions
------------------

1.  Enter \_default, type `kanso install` 
2.  Enter head, type `kanso install`
3.  To push everything to DB, type:

`python push_to_db.py`

This will push to a local coucdhdb server.  It will prompt for username/passwords if password protected.


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

