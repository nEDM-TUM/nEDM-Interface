
### Pushing updates to production server

Updates should be pushed to the `master` branch of the repository.  Pushing
these updates can be done in principle from any machine with access to
http://raid.nedm1, but it is best done from the Osthalle local network to avoid
issues with network latency.  In addition, one should use a fresh folder (where
no user changes are present) to avoid the accidental pushing of
non-production-ready code. Such a fresh folder is available on `mini.nedm1`.
Basic steps to update:

```bash
> ssh nedmdaq@mini.nedm1
$ cd Interface/nEDM-Interface 
$ git checkout master
$ git pull # pulls most recent changes from github
$ python push_to_db.py raid.nedm1
No .nedmrc file found in current directory
Pushing to:  subsystems/active_coil_compensation
    Checking sec/data
Username: 
Password:
...
```
You must enter the Username (e.g. `"admin"`) and the correspond Password once.

