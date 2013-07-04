module.exports = [ 
  { "description": "Access to index"
  , "from": ""
  , "to"  : "index.html"
  }
,
  { "description": "Access to this database"
  , "from": "_db"
  , "to"  : "../.."
  }
, { "from": "_db/*"
  , "to"  : "../../*"
  }

, { "description": "Access to this design document"
  , "from": "_ddoc"
  , "to"  : ""
  }
, { "from": "_ddoc/*"
  , "to"  : "*"
  }

, { "description": "Access to the main CouchDB API; requires _config/httpd/secure_rewrites = false"
  , "from": "_couchdb"
  , "to"  : "../../.."
  }
, { "from": "_couchdb/*"
  , "to"  : "../../../*"
  }
];
