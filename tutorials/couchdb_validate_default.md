
## [`_default/nedm_default`](https://github.com/nEDM-TUM/nEDM-Interface/blob/master/_default_data/nedm_default.json)

The default validate function provides the basic security and data validation for all databases.

### Date

If the document has a timestamp, this function ensures that it corresponds to
[RFC1123](http://www.hackcraft.net/web/datetime/#rfc822) so that it can be
correctly interpreted.  This format is what is inserted when using the default
[update function]{@tutorial couchdb_update_default}.

### Data documents

Data documents, e.g. documents with

```javascript
{
  "type" : "data",
  "value" : {
    "data_pt1" : 123,
    "data_pt2" : 123.34,
    // ..
  },
  // ..
}
```

are validated to ensure that all points values with the field `value` map are
convertible to numbers.


### Security

The are three main roles that are considered for security.  These roles are
defined in the corresponding user documents in the
[`_user`](http://raid.nedm1/_utils/database.html?_users) database.  (Note, the
`_admin` role must be defined in the server configuration files e.g.
`local.ini`.  However, an admin for a database is defined in the `_security`
document [see here](https://github.com/nEDM-TUM/nEDM-Interface/blob/master/_default_data/_security.json).
Only admin users can update design documents.)

* `SERVER_ADMIN` - server or database administrator, user where the `_admin`
role is in the user profile, or where the user is included in the `admins` list
of the database.
* `DB_WRITER` - user with normal write access, that has the role
`[db_name]_writer` in the user profile where the `[db_name]` is the name of the
database with `nedm/` removed (if it exists).  For example, for the database
`nedm/measurements`, users with the role `measurements_writer` have normal
write access.  For database `nedm_default`, this would be
`nedm_default_writer`.
* `ALARM_WRITER` - This is a special user role that is only able to write
`alarm` documents.

These roles then have the following rights:
* `SERVER_ADMIN` - no limits
* `DB_WRITER` - can write new documents, but:
 - cannot change documents saved by other users unless the database is included in the list `dbs_allow_user_changes`.
 - can only save documents where the field `create_by` corresponds to the username.
* `ALARM_WRITER` - Can only write documents of type `alarm` or `triggered_alarm`.

