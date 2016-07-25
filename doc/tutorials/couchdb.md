### Introduction to CouchDB features in use in nEDM

The tutorials here introduce how the components of CouchDB are put to use in
the nEDM-Interface.  For more detailed information about the CouchDB API, see
the [documentation](http://docs.couchdb.org/en/1.6.1/).

The nEDM interface uses the following functions (links are to external documentation):

* [view functions](http://docs.couchdb.org/en/1.6.1/couchapp/views/intro.html) - query
information available in documents in the database.
* [show functions](http://docs.couchdb.org/en/1.6.1/couchapp/ddocs.html#show-functions) -
format documents to display e.g. html.
* [list functions](http://docs.couchdb.org/en/1.6.1/couchapp/ddocs.html#list-functions) -
format results from a view.
* [update functions](http://docs.couchdb.org/en/1.6.1/couchapp/ddocs.html#update-functions) -
update (or insert) new documents.
* [validate functions](http://docs.couchdb.org/en/1.6.1/couchapp/ddocs.html#validate-document-update-functions) -
provide security/limit types of changes to documents.
* [filter functions](http://docs.couchdb.org/en/1.6.1/couchapp/ddocs.html#filter-functions) -
filter results, e.g., for use in changes feeds.
* [changes feeds](http://docs.couchdb.org/en/1.6.1/api/database/changes.html) -
get information on current changes to the database.

Information on how these are implemented are available in the child pages to
this document.  These functions are user defined in `javascript` and saved in
[design documents](http://docs.couchdb.org/en/1.6.1/api/ddoc/index.html).


