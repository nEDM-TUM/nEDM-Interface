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
