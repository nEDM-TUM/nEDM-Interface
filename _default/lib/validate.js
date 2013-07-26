var couchtypes = require('couchtypes/types'),
    types = require('./types');


module.exports = function(newDoc, oldDoc, userCtx, secObj) {
  var ddoc = this;

  secObj.admins  = secObj.admins || {};
  secObj.admins.names = secObj.admins.names || [];
  secObj.admins.roles = secObj.admins.roles || [];

  var IS_SERVER_ADMIN = false;
  var IS_DB_WRITER = false;
  if(~ userCtx.roles.indexOf('_admin')) {
    IS_SERVER_ADMIN = true;
  }
  if(~ secObj.admins.names.indexOf(userCtx.name)) {
    IS_DB_WRITER = true;
  }
  for(var i = 0; i < userCtx.roles; i++) {
    if(~ secObj.admins.roles.indexOf(userCtx.roles[i])) {
      IS_DB_WRITER = true;
    }
  }

  if(ddoc.access && ddoc.access.read_only ) {
    if(IS_SERVER_ADMIN) {
      log('Admin change on read-only db: ' + newDoc._id);
    } else {
      throw {'forbidden':'This database is read-only, only may be changed by server admin'};
    }
  }
  if (!IS_SERVER_ADMIN && !IS_DB_WRITER) {
    throw { 'forbidden' : 'Must be a server admin or DB writer' };
  }

  //require_field('created_by');

  if (newDoc.create_by != userCtx.name && !IS_SERVER_ADMIN) {
    throw { 'user_wrong' : 'User may not save as another user' };
  }
  
  function require_field(field) {
    if (!newDoc[field]) throw {'required_field' : "'" + field + "' is required" };
  }

  if (newDoc.timestamp) {
    // ensure that we have an RFC 1132 compliant data string
    var verifyDate = /\w{3},\s[0-9]{2}\s\w{3}\s[0-9]{4}\s[0-9]{2}:[0-9]{2}:[0-9]{2}\s\w{3}/;
    if (verifyDate.exec(newDoc.timestamp) == null) {
        throw {'bad_date_format' : "Date must be in RFC-1123 format: DAY, DD-MON-YYYY hh:mm:ss GMT"};
    }
  }

  couchtypes.validate_doc_update(types, newDoc, oldDoc, userCtx);

}
