## Alarms page

[http://db.nedm1/page/alarms](http://db.nedm1/page/alarms)

This page provides an interface to define alarms, which are small scripts that
run periodically to check values of variables in the database.  The daemon in
charge of running this is part of the
[CouchDB Docker](/CouchDB-Docker/subsystems/Maintenance.html#alarm-daemon) and
the code to it may be found in that repository.

To learn about writing alarm code, [skip to that section](#writing).



### Interface

The front page of the interface collects all alarms from the different
subsystems and displays them:

![alarms front page](alarms.png)

By clicking on the `Info` button, one can get information about when recent
alarms have occurred:

![alarms more info](alarms_info.png)

One can click on the `Code` buttons to view a screen where one can see/edit the
code, title, description, and emails.  To edit an alarm document, one must
have write access to the relevant database.

![alarms edit](alarms_edit.png)


Submitting an alarm is similar to editing an old one, just open the collapsible
at the bottom of the page.  To submit an alarm document, one must have write
access to the relevant database.


![alarms new](alarms_new.png)

<a name="writing"></a>
### Writing alarm code

Example code for an alarm:

```python
_last_value = None
def main(db):
    global _last_value
    lv = _last_value
    _last_value = latest_value('run_status', 6)['rows'][0]['value']['max']
    if lv is None: return
    if lv == 0 and _last_value == 1:
        raise AlarmEvent('Coil run begun', 'run_status has changed')
```

Points to note:

* all alarms need to have a `main` function
* all alarms have access to the function `latest_value`, which grabs
information about a single variable from the database.  This function looks
like:
```python
def latest_value(var_name, group_level=100):
    """
    Get the latest value of a given variable, this returns the output from the
    _stat function, which will look like:
      { u'rows': [
                   {u'value': {u'count': 1,
                               u'max': 8.35961456298828,
                               u'sum': 8.35961456298828,
                               u'sumsqr': 69.88315564172574,
                               u'min': 8.35961456298828},
                    u'key': [u'Bx', 2014, 4, 4, 13, 7, 22]}
                 ]
      }
    If a group_level is given <=6, then the values will be agregated.  (This is an
    efficient way to look e.g. for extremes over the last minute/hour/day/etc.)
    """
```
* all alarms need to raise certain exceptions to notify a change in alarm
state.  The available exceptions (with rising levels of criticality):
 - `AlarmWarning`
 - `AlarmError`
 - `AlarmCritical`

All exceptions should be called like:

```python
if alarm_condition == True:
    AlarmError("error seen here", "More descriptive text about the error")
```

Alarm scripts should *always* raise exceptions if an alarm condition exists.
The alarm daemon keeps track of the state and only sends emails when the state
changes (e.g. an alarm appears, the criticality changes, or the alarm clears).

