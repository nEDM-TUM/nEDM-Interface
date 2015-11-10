## Overview page

This page has plots of variables that may come from all different subsystems
(databases) and so this provides a monitoring dashboard for the experiment.  It
is important to note that *which* variables are shown are determined by
documents in the respective databases (see the [later section](#adding-variables)].
However, the arrangement of the plots is saved in `localStorage`, meaning that
it will be preserved if the browser is closed and reopened.  A screenshot of
the overview page:

![overview page](overview.png)

### Adding variables

The page also provides an interface to add variables to be shown.  *However*,
the user must be an admin user (or a user with write access to the database
`nedm_head`) to be able to submit a new variable.

One additional way to add a "permanent" overview variable (i.e. one that cannot
be deleted), is by adding it to the `"overview_vars_default"` document in the
[repository](https://github.com/nEDM-TUM/nEDM-Interface/blob/master/head/data/overview_vars_default.json). 

