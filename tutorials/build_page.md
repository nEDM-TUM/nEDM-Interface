This tutorial gives an overview of how one builds a single page.  It is not
dissimilar to how one builds controls for the control site (see {@tutorial
build_control}).

When one builds a single page, one inserts a document into the database that
looks like:

```javascript
{
    "_id" : "unique_id",  // Must be unique
    "type" : "page",      // Must be "page"
    "title" : "My title", // Title of page
    "description" : "A description", // A description, *may* contain HTML!
    "body" : " ... ", // html
    "script" : "..." // script
}
```

This document will automatically be translated to an html page using a CouchDB
{@link
http://docs.couchdb.org/en/latest/couchapp/ddocs.html#show-functions|show
function}.  What this show function essentially does is take the document and
add the necessary boilerplate (e.g. headers, script imports, etc.) so that the
page fits in the overall experimental page scheme.

A final step is necessary to ensure that this page is listed in the side toolbar.
Edit the `subsystem_information.json` file/document to add the particular page:

```javascript
{
  "_id" : "subsystem_information", // id of document defining information for this system.
  "prettyname" : "He-Xe EDM",
  "pages" : {
        "My new page" : "unique_id", // Must be the id of the page added
        "DAQ Control" : "control",
        "Monitor" : "monitor",
        "Slow control" : "slowcontrol"
  }
}
```
