## [`_default/raspberry_def`](https://github.com/nEDM-TUM/nEDM-Interface/blob/master/subsystems/raspberries/data/raspberry_des.json)

This validate function is used only in the `rapsberries` subsystem.  As
consistent with all validation functions, it is run *as well as* the [default
validation function]{@tutorial couchdb_validate_default}.  The purpose of this
validation function is to allow users to only submit code/documents
corresponding to a *particular* Raspberry Pi.  See
[here](/System-Overview/subsystems/Raspberry-Pis.html) for more information on
how Raspberry Pis are used in the nEDM systems.

### Security

This validation function simply checks to see if the user is a *limited* user,
meaning the user has the role: `"raspberry_lmtd"`.  (The user must also have
`"raspberries_writer"` to save in the database, but this is handled by the
default validation function.)

In the raspberry database, documents have types corresponding to the mac id of
the device, e.g.

```javascript
{
  "type" : 202481600141232,
  // ..
}
```

*or*

```javascript
{
  "type" : "202481600141232_cmd",
  // ..
}
```

If a user has the `"raspberry_lmtd"` role, then it is also required that this
MAC ID is present in the user roles.  In other words, in this case, the user
would need to have the user role `"202481600141232"` to be able to
edit/post/delete the documents.


