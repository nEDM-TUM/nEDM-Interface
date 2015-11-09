Validate functions are used in CouchDB to validate changes on an old document
or the insertion of a new document.  In this sense, they provide the security
for the system, allowing generally all users to read and only users with
particular rights to write or update documents.

See the child pages to see the particular validation functions used in the nEDM
Interface.  Note that, during insertion or update of a document, *all*
validation functions must return successfully.  As a performance consideration,
it's important to note that the validation functions are run over all documents
as they are posted/updated.  For this reason, the validate functions should be
kept as slim and quick as possible.

