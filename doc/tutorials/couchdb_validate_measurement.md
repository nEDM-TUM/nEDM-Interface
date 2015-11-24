## [`_default/measurements`](https://github.com/nEDM-TUM/nEDM-Interface/blob/master/subsystems/measurements/data/measurements.json)

This validate function is used only in the `measurements` subsystem.  As
consistent with all validation functions, it is run *as well as* the [default
validation function]{@tutorial couchdb_validate_default}.  The purpose of this
validation function is to allow users to submit measurements of particular
types to the measurements system.

### Security

This validation function simply checks to see if the user is a *limited* user,
meaning the user has the role: `"measurements_lmtd"`.  (The user must also have
`"measurements_writer"` to save in the database, but this is handled by the
default validation function.)

With this role, the user can only submit/edit/delete documents with the field
`measurement_type`, e.g.:

```javascript
{
  "measurement_type" : "mytype",
  // ..
}
```

*and* must have a user role corresponding to the `"measurement_type"`.  In this
example, the user must also have the user role: `"meas_type_mytype"` to be able
to perform writes/edits of this document.
