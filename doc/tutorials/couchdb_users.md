Adding a user to the nEDM-Interface is as simple as adding an entry to the
`"_users"` database.

Ideally, one does the following:

1.  The new user chooses a name and password by going to the [login
window](http://db.nedm1) and ensuring that `New user` is checked.
2.  The administrator edits then the corresponding document in the
[`users`](http://raid.nedm1/_utils/database.html?_users) database, adding the
`"nedm_user_role"` to the set of roles.  (This allows read-access to all nedm
databases.)
3.  If other roles are necessary, e.g. the user should have write access to
other systems, then the administrator must add the relevant roles.  For
example, for write access to the `"nedm/cs_laser"` system, the user would need
to have the role `"cs_laser_writer"`.  For more details see the
[security documentation]{@tutorial couchdb_validate}.

#### Raspberry Pis

Raspberry Pi devices need to have user with roles:

```javascript
[
  "rasperries_writer",
  "nedm_user_role"
]
```

