
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

### Add users

See [here]{@tutorial couchdb_users}.

<a name="build_documentation"></a>
### Build documentation
The easiest way to build/update the documentation is to clone this repository
in another folder and checkout the `gh-pages` branch.

For example:

```bash
$ pwd
/path/to/nEDM-Interface
$ cd ..
$ git clone git@github.com:nEDM-TUM/nEDM-Interface.git nEDM-Interface-Docs
$ cd nEDM-Interface-Docs
$ git checkout gh-pages
```

Then, update the documentation, tutorials, etc. and update the documentation:

```bash
$ pwd
/path/to/nEDM-Interface
$ ./build-documentation.sh ../nEDM-Interface-Docs
$ cd ../nEDM-Interface-Docs
$ git add .
$ git commit -m 'Update documentation'
$ git push # publish to the website
```
