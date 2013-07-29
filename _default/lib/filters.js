
// Typical req.query (at a minimum, the "filter" parameter will be there):
//
// { "filter": "couchdb/refilter"
// , "field" : "_id"
// , "regex" : "^a"
// , "log"   : true
// }

exports.doc_type = function(doc,req) {
  if (doc.type && doc.type == req.query.type) return true;
  return false;
}

exports.refilter = function(doc, req) {
  var field = req.query.field
    , regex = req.query.regex
    , is_ddocs = (req.query.ddocs == 'true' || req.query.ddocs == true)

  logger('Running: id=%s req=%o', doc._id, req)

  if(is_ddocs && doc._id.match(/^_design\//)) {
    logger('Passing design doc: %s', doc._id)
    return true
  }

  // It seems like throw causes a 500 in CouchDB.
  if(typeof field != 'string') {
    //throw new Error('Required "field" string parameter')
    log('ERROR: invalid_query: Required "field" string parameter')
    return false
  }

  if(typeof regex != 'string') {
    //throw new Error('Required "regex" string parameter')
    log('ERROR: invalid_query: Required "regex" string parameter')
    return false
  }

  logger('field=%s regex=%s', field, regex)

  var value = doc[field]

  if(typeof value == 'undefined') {
    logger('Doc %s has no field %s', doc._id, field)
    return false
  }

  if(typeof value != 'string') {
    logger('Doc %s field %s is not a string: %o', doc._id, field, value)
    return false
  }

  logger("Testing '%s' to '%s'", value, regex)
  regex = new RegExp(regex)
  if(! value.match(regex)) {
    logger('No match: %s', doc._id)
    return false
  } else {
    logger('Match: %s', doc._id)
    return true
  }

  function logger(message) {
    if(!req.query.log)
      return

    var params = Array.prototype.slice.apply(arguments, [1])
    if(params.length > 0)
      message += ' <- ' + JSON.stringify(params)

    log(message)
  }
};

// vim: sts=2 sw=2 et

exports.subset = function(doc, req) {
  // Return a consistent, random subset: between 0% to 100% of the documents. (Design documents and deletes always pass.)
  //

  if(/^_design\//.test(doc._id))
    return true;

  if(doc._deleted)
    return true;

  var p;

  if(req.query.p) {
    p = parseFloat(req.query.p);
    if(!(p >= 0.0 && p <= 1.0)) // Also catches NaN
      throw new Error("Parameter 'p' must be fraction of documents to pass [0.0-1.0]");
  }
  else if(req.query.expect || req.query.e) {
    // Set the fraction to that which will produce the expected document count.
    p = parseInt(req.query.expect || req.query.e);
    if(!(p <= 0) && !(p >= 0)) // NaN
      throw new Error("Parameter 'e' must be fraction of documents to pass [0.0-1.0]");

    p = Math.floor(p);
    if(p > req.info.doc_count)
      throw new Error("DB has " + req.info.doc_count + " docs, not expected " + p);

    // Set it to the needed percentage.
    p = p / req.info.doc_count;
  }
  else
    throw new Error("Required 'p' parameter (fraction [0.0-1.0]) or 'expect' parameter (desired doc count)");

  // Consider the first 8 characters of the doc checksum (for now, taken from _rev) as a real number
  // on the range [0.0, 1.0), i.e. ["00000000", "ffffffff"].
  var doc_key = req.query.key || '_rev';
  var doc_val = doc[doc_key];
  var hex_re  = req.query.re || (doc_key === '_rev' ? /^\d+-([0-9a-f]{8})/ : /^([0-9a-f]{8})/);

  if(typeof hex_re === 'string')
    hex_re = new RegExp(hex_re);

  doc_val = parseInt(hex_re.exec(doc_val)[1], 16);

  var ONE = 4294967295; // parseInt("ffffffff", 16);
  return doc_val <= (ONE * p);
};
