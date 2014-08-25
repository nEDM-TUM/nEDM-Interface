
module.exports = function(newDoc, oldDoc, userCtx, secObj) {
  var ddoc = this;

  var IS_SERVER_ADMIN = false;
  var IS_DB_WRITER = false;
  if(~ userCtx.roles.indexOf('_admin')) {
    IS_SERVER_ADMIN = true;
  }
  if(ddoc.access && ddoc.access.read_only ) {
    if(IS_SERVER_ADMIN) {
      log('Admin change on read-only db: ' + newDoc._id);
    } else {
      throw {'forbidden':'This database is read-only, only may be changed by server admin'};
    }
  }
  if (!IS_SERVER_ADMIN) {
    throw { 'forbidden' : 'Must be a server admin or DB writer' };
  }

}
