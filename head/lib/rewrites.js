module.exports = [ 
  { "description": "Access to index"
  , "from": ""
  , "to"  : "index.html"
  }
, 
  { "description": "Access to favicon.ico"
  , "from": "favicon.ico"
  , "to"  : "favicon.ico"
  }
,
  { "description": "Access to _rewrite"
  , "from": "_rewrite/_couchdb/*"
  , "to"  : "../../../*"
  },
  { "description": "Access to pages"
  , "from": "_rewrite/page/monitor/*"
  , "to"  : "_show/page/monitor"
  },
  { "description": "Access to pages"
  , "from": "_rewrite/page/control/*"
  , "to"  : "_show/page/control"
  },
  { "description": "Access to pages"
  , "from": "page/monitor/*"
  , "to"  : "_show/page/monitor"
  },
  { "description": "Access to pages"
  , "from": "page/control/*"
  , "to"  : "_show/page/control"
  },
  { "description": "Access to pages"
  , "from": "page/*"
  , "to"  : "_show/page/*"
  },
  { "description": "Access to pages"
  , "from": "_rewrite/page/*"
  , "to"  : "_show/page/*"
  },
  { "description": "Access to this database"
  , "from": "_db"
  , "to"  : "../.."
  }
, { "from": "_db/*"
  , "to"  : "../../*"
  }
, 
  { "description" : "Access design documents"
  , "from": "nedm_head/_design/*"
  , "to"  : "../*"
  }
,
  { "description" : "Access design documents"
  , "from": "nedm_head/*"
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
, { "from": "_couchdb/*"
  , "to"  : "../../../*"
  }


];
