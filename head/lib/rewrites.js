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
, { "description": "Access to the main CouchDB API; requires _config/httpd/secure_rewrites = false"
  , "from": "_couchdb"
  , "to"  : "../../.."
  }
, { "from": "_couchdb/*"
  , "to"  : "../../../*"
  }
, { "from": "_couchdb/*"
  , "to"  : "../../../*"
  },
  { "description": "Access to pages"
  , "from": "_rewrite/page/monitor/*"
  , "to"  : "_rewrite/_db/_design/page/_show/page/monitor"
  },
  { "description": "Access to pages"
  , "from": "_rewrite/page/control/*"
  , "to"  : "_rewrite/_db/_design/page/_show/page/control"
  },
  { "description": "Access to pages"
  , "from": "page/monitor/*"
  , "to"  : "_rewrite/_db/_design/page/_show/page/monitor"
  },
  { "description": "Access to pages"
  , "from": "page/control/*"
  , "to"  : "_rewrite/_db/_design/page/_show/page/control"
  },
  { "description": "Access to system pages"
  , "from": "_rewrite/page/:page/:foo"
  , "to"  : "_rewrite/_couchdb/:foo/_design/page/_show/page/:page"
  },
  { "description": "Access to generic pages"
  , "from": "page/:page/:foo"
  , "to"  : "_rewrite/_couchdb/:foo/_design/page/_show/page/:page"
  },
  { "description": "Access to pages"
  , "from": "page/:foo"
  , "to"  : "_rewrite/_db/_design/page/_show/page/:foo"
  },
  { "description": "Access to pages"
  , "from": "_rewrite/page/:foo"
  , "to"  : "_rewrite/_db/page/_show/page/:foo"
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

];
