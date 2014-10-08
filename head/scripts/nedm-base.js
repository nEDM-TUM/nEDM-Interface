var session = require("session");
var db = require("db");
var handlebars = require("handlebars");
var dygraphs = require("dygraph-combined");
$ = require("jquery");
require("jquery-cookie");
$.cookie.json = true;
var ace = require("ace");
var jqm_cal = require("jqm-calendar");
ace.config.set("basePath", "/nedm_head/_design/nedm_head/ace/");
bs = function(haystack, needle, comparator, alow, ahigh) {
  if(!Array.isArray(haystack))
    throw new TypeError("first argument to binary search is not an array");

  if(typeof comparator !== "function")
    throw new TypeError("third argument to binary search is not a function");

  var low  = alow;
  var mid  = 0;
  var high = ahigh;
  var cmp  = 0;

  while(low <= high) {
    /* Note that "(low + high) >>> 1" may overflow, and results in a typecast
     * to double (which gives the wrong results). */
    mid = low + (high - low >> 1);
    cmp = comparator(haystack[mid], needle);

    /* Too low. */
    if(cmp < 0)
      low  = mid + 1;

    /* Too high. */
    else if(cmp > 0)
      high = mid - 1;

    /* Key found. */
    else
      return mid;
  }

  /* Key not found. */
  return ~low;
};

var nedm = nedm || {};
nedm.logged_in_as = null;


session.on('change', function(userCtx) {
  nedm.set_user_name(userCtx);
  nedm.update_buttons();
  //nedm.update_header();
  nedm.buildDBList();
});




// Fix db guessCurrent
require("db").guessCurrent = function (loc1) {
    var loc = loc1 || window.location;

    /**
     * A database must be named with all lowercase letters (a-z), digits (0-9),
     * or any of the _$()+-/ characters and must end with a slash in the URL.
     * The name has to start with a lowercase letter (a-z).
     *
     * http://wiki.apache.org/couchdb/HTTP_database_API
     */

    var re = /\/([a-z][a-z0-9_(%2F)\$\(\)\+-\/]*)\/_design\/([^\/]+)\//;
    var match = re.exec(loc.pathname);

    if (match) {
        return {
            db: match[1],
            design_doc: match[2],
            root: '/nedm_head/_design/nedm_head/_rewrite/_couchdb/'
        };
    }
    return null;
};

nedm.getNumberParts = function (x) {
    var sig = x > 0 ? 1 : -1;
    x = Math.abs(x);
    var exp = Math.floor(Math.log(x)/Math.LN10);
    var man = x/Math.pow(10, exp);
    return {mantissa: sig*man, exponent: exp};
};

nedm.build_url = function(options) {
    var url = "";

    var first = true;
    for(var key in options) {
        if (!first) url += "&";
        else url = "?";
        first = false;
        url += key + "=";
        if (typeof options[key] === 'string') url += options[key];
        else url += JSON.stringify(options[key]);
    }
    return encodeURI(url);
};

nedm.available_database = {};

nedm.get_current_db_name = function(pathname) {
    var pth = pathname || document.location.pathname;
    var temp = pth.split("/");
	// Following gets rid of nedm%2F for those browsers that don't
	// automatically convert to /
	temp = temp[temp.length-1].split("%2F");
    return "nedm%2F" + temp[temp.length-1];
};

nedm.get_database = function(name) {
    if (name === undefined) {
      name = nedm.get_current_db_name();
    }
    if (!(name in nedm.available_database)) {
        nedm.available_database[name] = db.use('nedm_head/_design/nedm_head/_rewrite/_couchdb/' + name);
    }
    return nedm.available_database[name];
};

nedm.set_database = function(name) {
};

nedm.open_changes_feeds = { taglist: {}, urllist: {}};

nedm.listen_to_changes_feed = function(db, tag, callback, options) {
    options.feed = "eventsource";
    var url = db.url + "/_changes" + nedm.build_url(options);

    if (!(url in nedm.open_changes_feeds.urllist)) {
        // start a new listener
        var listener = new EventSource(url);
        nedm.open_changes_feeds.urllist[url] = {src: listener, taglist: {}};

    }
    if (tag in nedm.open_changes_feeds.taglist) {
        console.log("Warning: removing tag '" + tag +"'");
        nedm.cancel_changes_feed(db, tag);
    }
    nedm.open_changes_feeds.taglist[tag] = {callb: callback, url: url};
    nedm.open_changes_feeds.urllist[url].src.addEventListener("message", callback, false);
    nedm.open_changes_feeds.urllist[url].taglist[tag] = {};
};

nedm.cancel_changes_feed = function(db, tag) {

    if (!(tag in nedm.open_changes_feeds.taglist)) return;

    var obj = nedm.open_changes_feeds.taglist[tag];
    var src = nedm.open_changes_feeds.urllist[obj.url].src;

    src.removeEventListener("message", obj.callb, false);

    delete nedm.open_changes_feeds.urllist[obj.url].taglist[tag];
    if ( Object.keys( nedm.open_changes_feeds.urllist[obj.url].taglist ).length === 0 ) {
        src.close();
        delete nedm.open_changes_feeds.urllist[obj.url];
    }
    delete nedm.open_changes_feeds.taglist[tag];
};


nedm.update_db_interface = function(db) {
    db.old_request = db.request;
    db.get_most_recent_value = function(var_name, callback) {
      return this.getView('slow_control_time', 'slow_control_time',
      { opts : {
          endkey : [var_name],
        startkey : [var_name, {}],
      descending : true,
          reduce : false,
           limit : 1}}, callback);
    };
    // Add updateDoc to the API
    db.updateDoc = function (doc, designname, updatename, callback) {
        var method, url = this.url;
        url += '/_design/' + designname + '/_update/' + updatename;
        if (doc._id === undefined) {
            method = "POST";
        }
        else {
            method = "PUT";
            url += '/' + doc._id;
        }
        var data;
        try {
            data = JSON.stringify(doc);
        }
        catch (e) {
            return callback(e);
        }
        var req = {
            type: method,
            url: url,
            data: data,
            processData: false,
            contentType: 'application/json',
            expect_json: true
        };
        this.request(req, callback);
    };
	// update the request to handle the possibility that callback has
	// progress/success requests
    db.request = function(req, callback) {
      if (!callback || typeof callback !== 'object') return this.old_request(req, callback);
      var cbck = callback;
      if (cbck.progress) {
        req.xhr = function() {
          var xhr = new XMLHttpRequest();
          if (cbck.progress) {
            xhr.upload.addEventListener("progress", cbck.progress, false);
          }
          cbck.xhr = xhr;
          return xhr;
        };
      }
      if (callback.success) callback = callback.success;
      else callback = null;
      return this.old_request(req, callback);
    };

    // Remove an attachment from a document
    db.removeAttachment = function(doc, file_name, callback) {
      var tthis = this;
      var req = {
        type : "DELETE",
        url : this.url + "/" + doc._id + "/" + file_name,
      };

      var exec_rem = function(rev) {
        req.url += "?rev=" + rev;
        tthis.request(req, callback);
      };
      if (doc._rev) {
        return exec_rem(doc._rev);
      } else {
        return tthis.getDoc(doc._id, function(err, obj) {
          if (err) return;
          exec_rem(obj._rev);
        });
      }
    };


    // Add an attachment to a document
    db.addAttachment = function(doc, file_object, callback) {
      var tthis = this;
      var req = {
        type : "PUT",
        url : this.url + "/" + doc._id + "/" + file_object.name,
        processData : false,
        data : file_object,
        contentType : file_object.type || "application/octet-stream"
      };

      var exec_upload = function(rev) {
        req.url += "?rev=" + rev;
        tthis.request(req, callback);
      };
      if (doc._rev) {
        return exec_upload(doc._rev);
      } else {
        return tthis.getDoc(doc._id, function(err, obj) {
          if (err) return;
          exec_upload(obj._rev);
        });
      }
    };

    db.changes = function(options, callback) {
        if (!callback) {
            callback = options;
            options = {};
        }
        var req = {
            url: this.url +
                '/_changes' + nedm.build_url(options),
            type: "GET",
            expect_json: true
        };

        return this.request(req, callback);
    };

    db._called_views = {};
    db.getView = function(name, view, options, callback) {
        if (!callback) {
            callback = options;
            options = {};
        }
        if (!options.keys) options.keys = {};
        if (!options.opts) options.opts = {};
        var viewname = this.encode(view);
        var theType = "POST";
        var data;
        try {
            data = JSON.stringify(options.keys);
            if ($.isEmptyObject(options.keys)) {
                data = "";
                theType = "GET";
            }
        }
        catch (e) {
            return callback(e);
        }
        var req = {
            url: this.url +
                '/_design/' + this.encode(name) +
                '/_view/' + viewname + nedm.build_url(options.opts),
            data: data,
            type: theType,
            expect_json: true
        };

        var thisdb = this;
        // Inform the user if the view takes a while to load
        if (!(name in this._called_views)) {
            this._called_views[name] = {
                timer_notify : function() {
                                   var base_text = "View (design doc " + name + ") is currently building: ";
                                   var tthis = this;
                                   thisdb.checkViewStatus(name, function(o) {
                                       if (o.done) {
                                          tthis.cancel();
                                          return;
                                       }
                                       if (!tthis.mytoastr) {
                                           tthis.initial_value = o.view_update_seq;
                                           tthis.total_diff = o.db_update_seq - tthis.initial_value;
                                           tthis.mytoastr = toastr.info(base_text + " ? of ?",
                                               "View building",
                                               { timeOut : -1,
                                        extendedTimeOut  : -1,
                                           positionClass : "toast-top-right",
                                             closeButton : false
                                               } );
                                       }
                                       var perc = (o.view_update_seq - tthis.initial_value)*100/tthis.total_diff;
                                       if (perc > 100) perc = 100;
                                       $(".toast-message", tthis.mytoastr).text(
                                         base_text + (o.view_update_seq - tthis.initial_value).toString() + " of " +
                                         tthis.total_diff.toString() + " (" + perc.toFixed(2) +
                                         "%)");
                                   });
                               },
                timeout : function() {
                    if (this.notify_view_building === undefined) {
                        this.notify_view_building = setTimeout(function(o) { return function() { o.timer_notify();}; }(this) , 3000);
                    }
                },
                cancel : function() {
                    if (this.notify_view_building) {
                      clearTimeout(this.notify_view_building);
                    }
                    if (this.mytoastr) this.mytoastr.remove();
                    this.notify_view_building = undefined;
                    this.mytoastr = undefined;
                },
                notify_view_building : undefined,
                mytoastr : undefined
            };
        }
        var cur_view = this._called_views[name];
        cur_view.timeout();
        var callback_wrapper = function(e, o) {
            // Clear the informational notice.
            cur_view.cancel();
            callback(e,o);
        };
        return this.request(req, callback_wrapper);
    };

    db.getViewInfo = function(view, callback) {
        var req = {
            url: this.url + "/_design/" + view + "/_info",
            expect_json: true,
        };
        return this.request(req, callback);
    };

    db.checkViewStatus = function(view, callback) {
        var obj = this;
        return this.info( function(e, o) {
            if (e) callback({ error: e });
            else {
                var cur_seq = o.update_seq;
                var view_status = function(e, o) {
                    if (e) callback({ error: e });
                    else {
                        var done = (o.view_index.update_seq >= cur_seq) || !o.view_index.updater_running;
                        callback( { done: done,
                                   view : o.name,
                         view_update_seq: o.view_index.update_seq,
                           db_update_seq: cur_seq } );
                        if (!done) {
                          setTimeout(function() { obj.getViewInfo(view, view_status); }, 2000);
                        }
                    }
                };
                obj.getViewInfo(view, view_status);
            }
        });
    };


    db.listen_to_changes_feed = function(tag, callback, options) {
        return nedm.listen_to_changes_feed(this, tag, callback, options);
    };

    db.cancel_changes_feed = function(tag) {
        return nedm.cancel_changes_feed(this, tag);
    };
    db.send_command = function(o) {
      var adoc = { type : 'command', execute : o.cmd_name };
      if ('arguments' in o) { adoc['arguments'] = o['arguments']; }
      var callback;
      var quiet;
      var timeout = 0;
      var that = this;
      if ('timeout' in o) timeout = o.timeout;
      if (timeout < 0) timeout = 0;
      if ('callback' in o) callback = o.callback;
      if ('quiet' in o) quiet = o.quiet;
      var abort_requested = false;
      var current_req = null;
      var ret_function = function(err, resp) {
        if (err) {
          if (callback) callback(err);
          if (!quiet) nedm.show_error_window(err.error, err.reason);
        } else {
          if (callback) callback(null, resp);
          if (!quiet) toastr.success(resp.toastr.msg, resp.toastr.title);
        }
      };
      function SubmitUpdateDoc() {
        var d = $.Deferred();
        current_req = that.updateDoc(adoc,
            'nedm_default', 'insert_with_timestamp', function(err, obj) {
               if (err) {
                 d.reject(err);
               } else {
                 d.resolve(obj);
               }
             });
        d.fail(ret_function);
        return d.promise();
      }
      function ResolveUpdateSubmission(obj) {
        var cmd_str = "Command submitted: " + o.cmd_name;
        var id = obj.id;
        if ('arguments' in adoc) {
            cmd_str += ", with args: " + JSON.stringify(adoc['arguments']);
        }
        if (!quiet) toastr.info(cmd_str, "");
        // Check for the return of the function...
        var total_timeout = timeout;
        var changes_opts = { doc_ids : [ id ], 
                              filter : "_doc_ids",
                                feed : "longpoll" };
        if (timeout === 0) {
            changes_opts.heartbeat = 5000;
        } else {
            changes_opts.timeout = timeout;
        }
        var d = $.Deferred();
        var has_cycled = false;
        function HandleChanges(err, o) {
           if (err) {
             d.reject(err);
           } else {
             // We first need to check if the revision is only the first
             var new_rev = false;
             if (o.results.length > 0) {
               var c = o.results[0].changes;
               for (var i=0;i<c.length;i++) {
                 if (c[i].rev.slice(0,2) !== "1-") {
                   new_rev = true;
                   break;
                 }
               }
             }
             if (!new_rev) { 
               if (!has_cycled) {
                 // Try cyclying again
                 has_cycled = true;
                 changes_opts.filter = '_view';
                 changes_opts.view = 'execute_commands/complete_commands';
                 changes_opts.since = o.last_seq; 
                 current_req = that.changes( changes_opts, HandleChanges );
               } else {
                 d.reject({ error  : "Timeout on reaction for command: " + adoc.execute,
                            reason :"Timeout" });
               }
             } else {
               d.resolve(id);
             }
           }
        }

        d.fail(ret_function);
        current_req = that.changes( changes_opts, HandleChanges ); 
        return d.promise();
      }

      function GetResults(anid) {
        current_req = that.getDoc(anid, function (err, obj) {
          current_req = null;
          if (err) return ret_function(err);
          var resp = obj.response;
          var resp_str = "Response for (" + o.cmd_name + "): " + resp.content + "\n" +
                         "    return value: " + JSON.stringify(resp['return']);
          if (!("ok" in resp)) {
              ret_function( { error : resp_str, reason : "Error" } );
          } else {
              resp.toastr = { msg : resp_str, title : "Success" };
              ret_function(null, resp);
          }
        });
      }
      return { 
         promise : SubmitUpdateDoc().then(ResolveUpdateSubmission).then(GetResults),
           abort : function() {
             if (current_req) current_req.abort();
             abort_requested = true;
         }
      };
    };
};


// Fix db function use
nedm.old_use = require("db").use;
// overwrite faulty db functions
require("db").use = function (url) {
    /* Force leading slash; make absolute path. */

    // From https://gist.github.com/jlong/2428561
    // We use the DOM to get us info about the url
    var parse = document.createElement('a');
    parse.href = url;

    // First check if it's already absolute:
    if (parse.href != url) {
        // We are on the same host
        // Now ensure we have a relative root-path
        if (url[0] != '/') parse.href = '/' + url;
    }

    // Make absolute path
    url = parse.href;
    var db = nedm.old_use(url);

    // hack to fix version 0.13 of db
    if (db.url[0] =='/') db.url = db.url.substr(1);

    nedm.update_db_interface(db);

    return db;
};


nedm.namespace = function(namespaceString) {
    var parts = namespaceString.split('.'),
    parent = window,
    currentPart = '';
    for(var i = 0, length = parts.length; i < length; i++) {
        currentPart = parts[i];
        parent[currentPart] = parent[currentPart] || {};
        parent = parent[currentPart];
    }
    return parent;
};


nedm.update_buttons = function() {
    var user_status = nedm.check_user_status();
    var loginbtn = $("a[id*=loginbtn]");
    var logoutbtn = $("a[id*=logoutbtn]");
    if (user_status === null) {
        loginbtn.show();
        logoutbtn.hide();
    } else {
        logoutbtn.text("Logout (" + user_status + ")");
        logoutbtn.show();
        loginbtn.hide();
    }
    $("a[id*=homebtn]").attr("href", nedm.using_prefix);
};

nedm.update_header = function(ev, ui) {

  $(ev.target).find(".headerChild").load("/nedm_head/_design/nedm_head/header.html", function() {
      $(this).find("[data-role=header]").trigger("create").toolbar();
      var hn = $(this).find('#nedm_header_name');
      var callback = function(dbs) {
        if (nedm.get_current_db_name() === undefined) return;
        var db = /nedm%2F(.*)/.exec(nedm.get_current_db_name())[1];
        if (db in dbs) {
          hn.text("nEDM Interface: " + dbs[db].prettyname);
        }
      };
      nedm.get_database_info(callback);

      nedm.update_buttons();
  });

};

nedm.set_user_name = function(userCtx) {
       nedm.logged_in_as = userCtx.name;
};

nedm.check_user_status = function() {
    session.info(function(err, info) {
       if (info) nedm.set_user_name(info.userCtx);
    });
    return nedm.logged_in_as;
};

nedm.logout = function() {
    session.logout();
};

nedm.validate = function(un, pw, callback) {
    session.login(un, pw,
            function(err, response) {
                var success = true;
                if(err) success = false;
                if (callback) callback(success);
            });
};

nedm.compile = function(astr) {
    return handlebars.compile(astr);
};


nedm.all_db_listeners = {};
nedm.database_listener = function( adb ) {
    var adb = adb;
    if (adb in nedm.all_db_listeners) return;
    nedm.all_db_listeners[adb] = {};
    var update_function = function( atype ) {
        var adom = $('.' + adb + ' .' + atype);
        return function(e, o) {
               var text = "nedm-status-r";
               if (!e && o.rows.length == 1) {
                   var now = new Date();
                   var last_data = nedm.dateFromKey(o.rows[0].key);
                   if ( last_data > now || (now - last_data < 20000)) {
                       text = "nedm-status-g";
                   }
               }
               adom.removeClass('nedm-status-y').addClass(text);
               delete nedm.all_db_listeners[adb][atype];
               if (Object.keys(nedm.all_db_listeners[adb]).length === 0) {
                   delete nedm.all_db_listeners[adb];
                   setTimeout(function() { nedm.database_listener( adb ); }, 10000);
               }
               // Throttle, wait until we check again...
        };
    };
    var send = { heartbeat : 'control_status', data : 'write_status' };
    var thedb = nedm.get_database( "nedm%2F" + adb );
    for (var k in send) {
        thedb.getView("document_type", "document_type",
              { opts: { descending : true, reduce : false, limit : 1,
                        endkey : [k], startkey : [k, {}] } },
            update_function(send[k]));
            nedm.all_db_listeners[adb][send[k]] = true;
    }
};

nedm.database_status = function( ) {
   var db_stat = function( all_dbs ) {
       var tbody = $(".status_db_class tbody");
       tbody.empty();
       for (var adb in all_dbs) {
           if (adb in nedm.all_db_listeners) continue;
           var o = all_dbs[adb];
           var new_line = $('<tr/>').addClass(adb)
                                    .append($('<th/>').addClass("db_name").text(o.prettyname))
                                    .append($('<th/>').append(
                                      $('<div/>').addClass("nedm-status-y write_status")))
                                    .append($('<th/>').append($('<div/>').addClass("nedm-status-y control_status")));
           tbody.append(new_line);
           nedm.database_listener( adb );
       }
   };
   nedm.get_database_info( db_stat );
};

// Returns all the most recent database info
nedm.get_database_info = function( callback ) {

    // First define a function to grab all the information
    function getDBInfo(db_name) {
           var esc_name = "nedm%2F" + db_name;
           var dfd = new $.Deferred();
           var callback = function (data, msg) {
               return [db_name, data, msg];
           };
           var json_subm = $.getJSON("/nedm_head/_design/nedm_head/_rewrite/_couchdb/" + esc_name + "/subsystem_information");
           json_subm.done( function(data) {
               dfd.resolve( callback(data, "found") );
           });
           json_subm.fail( function(data) {
               dfd.resolve( callback(data), "notfound" );
           });
           return dfd.promise();
    }

    $.getJSON('/nedm_head/_design/nedm_head/_rewrite/_couchdb/_all_dbs', function(data) {
        var patt = /^nedm\//;
        var db_infos = [];
        $.each(data, function(key, val) {
            if (patt.exec(val) !== null) {
                var db_name = val.substring(5);
                if ( db_name.localeCompare("head") === 0 ) return;
                db_infos.push(getDBInfo(db_name));
            }
        });
        $.when.apply($, db_infos).done(function() {
            var current_database_info = {};
            for(var i=0;i<arguments.length;i++) {
                var obj = arguments[i];
                if (obj[2] != "found") continue;
                current_database_info[obj[0]] = obj[1];
            }
            callback( current_database_info );
        });
    });


};

nedm.get_most_recent_value = function(var_name, callback) {
    nedm.get_database().get_most_recent_value(var_name, callback);
};

nedm.show_error_window = function(error, msg) {
    toastr.error(msg, error);
};

// We build the list of DBs to point to.  This is simply subsystems
nedm.buildDBList = function(ev, id) {
   nedm.get_database_info( function( x, y ) { return function( dbs ) {
       nedm.get_database("nedm_head").getDoc("sidebar", function(e, o ) {
           if (e) return;
           var listDBs = (x) ? $(x.target).find('.listofdbs') : $('.listofdbs');
           listDBs.empty();
           listDBs.append(o.body);
           var db_list = $('.all_dbs_list_class', $(listDBs));
           for(var key in dbs) {
               var esc_name = "nedm%2F" + key;
               var html = $('<div/>').attr({ 'data-role' : 'collapsible'})
                          .append($("<h3/>").append(dbs[key].prettyname));
               var ul = $('<ul/>').attr( { 'data-role' : 'listview', 'data-inset' : 'false' } );
               if ("pages" in dbs[key]) {
                   for(var pg in dbs[key].pages) {
                       var pg_name = /(.*)\.[^.]+$/.exec(dbs[key].pages[pg])[1];
                       ul.append($('<li/>').append($('<a/>').attr( { href : nedm.using_prefix + 'page/' + pg_name + '/' + esc_name } )
                                                            .append(pg)));
                   }
               }
               html.append(ul);
               db_list.append(html);
           }

           listDBs.trigger("create");
       });
   };}(ev,id));
};

nedm.dateFromKey = function(arr) {
  var start = 0;
  var end = 1;
  if (typeof arr[0] === "string") {
    start = 1;
    end = 0;
  }
  return new Date(Date.UTC.apply(this, arr.slice(start, arr.length-end)));
};

nedm.keyFromUTCDate = function(date) {
  return [date.getUTCFullYear(), date.getUTCMonth(),
          date.getUTCDate(),     date.getUTCHours(),
          date.getUTCMinutes(),  date.getUTCSeconds()];
};

nedm.keyFromDate = function(date) {
  return [date.getFullYear(), date.getMonth(),
          date.getDate(),     date.getHours(),
          date.getMinutes(),  date.getSeconds()];
};


nedm.MonitoringGraph = function (adiv, data_name, since_time_in_secs, adb) {

    this.db = adb;
    this.data = [];
    this.graph = new dygraphs.Dygraph(adiv, this.data,
          {
              drawPoints: true,
              showRoller: false,
                  labels: ['Time'].concat(data_name),
  connectSeparatedPoints: true,
         xAxisLabelWidth: 60,
                  height: dygraphs.Dygraph.DEFAULT_HEIGHT, // explicitly set
           zoomCallback : function(o) { return function() { o.recalc_axis_labels(); }; }(this)
          });

    this.isSyncing = false;
    this.isListening = false;
    this.wasLive = false;
    this.name = data_name;
    this.uuid = Math.random().toString(36).substr(2,9);
    this.setGroupLevel(9);

    this.changeTimeRange(since_time_in_secs, 0);
    var tthis = this;
    var myBaseURL = $('.ui-page-active').data('url');
    function ShowContainer(ev, ui) {
        if ($(ui.toPage).data("url") !== myBaseURL) return;
        if (tthis.wasLive) {
          tthis.beginListening();
        }
    }
    function HideContainer(ev, ui) {
        if ($(ui.prevPage).data("url") !== myBaseURL) return;
        if (tthis.isListening) {
          tthis.endListening();
          tthis.wasLive = true;
        } else {
          tthis.wasLive = false;
        }
    }
    $(document).on( { pagecontainershow : ShowContainer,
                      pagecontainerhide : HideContainer });
    this.destroy = function() {
      tthis.endListening();
      $(document).off( { pagecontainershow : ShowContainer,
                         pagecontainerhide : HideContainer });
    };

};

nedm.MonitoringGraph.prototype.setGroupLevel = function(gl) {
    this.group_level = gl;
};

nedm.MonitoringGraph.prototype.prependData = function(r) {
     for (var i=0;i<r.length;i++) {
         this.data.unshift(r[i]);
     }
};

nedm.MonitoringGraph.prototype.recalc_axis_labels = function() {
     var range = this.graph.yAxisRange();
     var one_side = nedm.getNumberParts(range[1]);
     var subtract = nedm.getNumberParts(range[1] - range[0]);
     var sfs = one_side.exponent - subtract.exponent + 2;
     this.graph.updateOptions({ axes : { y : { sigFigs : sfs } } });
};

nedm.MonitoringGraph.prototype.update = function() {
     this.graph.updateOptions( { 'file': this.data, 'labels' : ['Time'].concat(this.name) } );
     this.recalc_axis_labels();
};

nedm.MonitoringGraph.prototype.dataFromKeyVal = function(obj) {
    var outp = [ nedm.dateFromKey(obj.key) ];
    var seen = false;
    var data_name = this.name;
    for (var i=0;i<data_name.length;i++) {
        if (data_name[i] == obj.key[0]) {
            outp.push(obj.value.sum/obj.value.count);
            seen = true;
        } else outp.push(null);
    }
    if (!seen) return null;
    return outp;
};

nedm.MonitoringGraph.prototype.appendData = function(r) {
     var append = 0;
     for (var i=0;i<r.length;i++) {
         this.data.push(r[i]);
         append++;
     }
     return append;
};

nedm.MonitoringGraph.prototype.addDataName = function(aname) {
    if (!Array.isArray(aname)) aname = [ aname ];
    var retVal = false;
    var arr = this.name;
    aname.forEach(function(ev) {
      if (arr.indexOf(ev) == -1) {
        arr.push(ev);
        retVal = true;
      }
    });
    return retVal;
};

nedm.MonitoringGraph.prototype.removeDataName = function(aname, callback) {
    if (!Array.isArray(aname)) {
      aname = [ aname ];
    }
    var wasRemoved = false;
    var arr = this.name;
    var dat = this.data;
    aname.forEach(function(ev) {
        var anIndex = arr.indexOf(ev);
        if (anIndex == -1 ) return;
        wasRemoved = true;
        arr.splice(anIndex, 1);
        dat.every( function(o) { o.splice(anIndex+1, 1); return true; } );
    });
    if (!wasRemoved) return;
    this.update();
    if (callback) callback();
};

nedm.MonitoringGraph.prototype.removeBeforeDate = function(adate) {
    var data = this.data;
    if (data.length === 0) return 0;
    var j = 0;
    while (j < data.length && data[j][0].getTime() < adate.getTime()) j++;
    return data.splice(0, j);
};


nedm.MonitoringGraph.prototype.changeTimeRange = function (prev_time, until_time, callback) {

    this.time_prev = prev_time;
    if (typeof until_time === 'object' ) {
	  // this means we go until a particular time
      if (prev_time > until_time) {
          toastr.error("Time incorrect: " + prev_time.toString() + " > " + until_time.toString(), "Time");
          if (callback) callback();
          return;
      }
	  this.until_time = until_time;
      this.time_range = 0;
      this.endListening();
    } else {
      this.until_time = 0;
      this.time_range = ((new Date()).getTime() - this.time_prev)/1000;
      this.beginListening();
    }
    var data = this.data;
    data.length = 0;
    // first determine what the earliest date is
    var last_key = [9999];
    if (this.until_time !== 0) {
        last_key = [
                 this.until_time.getUTCFullYear(), this.until_time.getUTCMonth(),
                 this.until_time.getUTCDate(), this.until_time.getUTCHours(),
                 this.until_time.getUTCMinutes(), this.until_time.getUTCSeconds()-1];
    }
    first_key = [
                 this.time_prev.getUTCFullYear(), this.time_prev.getUTCMonth(),
                 this.time_prev.getUTCDate(), this.time_prev.getUTCHours(),
                 this.time_prev.getUTCMinutes(), this.time_prev.getUTCSeconds()];

    if (this.name.length === 0 && callback) callback();
    var warning_shown = false;
    var limit = 3000;
    var names_to_check = this.name.length;
    var view_clbck = function(obj, tl_entries, cr_name, local_opts) {
        return function(e, o) {
                  if (e !== null) return;
                  var all_data = o.rows.map(obj.dataFromKeyVal, obj).filter( function(o) {
                      if (o !== null) return true;
                      return false;
                  });
                  if (!warning_shown && tl_entries > 50000) {
                      toastr.warning("Data length is > 50000 entries, suggest setting averaging or selecting a smaller visualization range", "");
                      warning_shown = true;
                  }
                  var recv_length = all_data.length;
                  if (recv_length !== 0) {
                      obj.mergeData(all_data);
                      tl_entries += recv_length;
                      if (recv_length < limit) {
                          if (callback) {
                              // The callback can request that we stop loading
                              callback({ loaded : tl_entries,
                                       variable : cr_name,
                                           done : true });
                          }
                          names_to_check -= 1;
                          if (names_to_check <= 0) obj.update();
                      } else {
                          local_opts.startkey = o.rows[o.rows.length-1].key;
                          local_opts.skip = 1;
                          if (callback) {
                              // The callback can request that we stop loading
                              if (!callback({ loaded : tl_entries,
                                            variable : cr_name,
                                                done : false })) {
                                  names_to_check -= 1;
                                  if (names_to_check <= 0) obj.update();
                                  return;
                              }
                          }
                          obj.db.getView("slow_control_time", "slow_control_time",
                              { opts: local_opts }, view_clbck(obj, tl_entries, cr_name, local_opts));
                      }
                  } else if (callback) callback();
              };
    };


    for (var i=0;i<this.name.length;i++) {
        var new_first_key = first_key.slice();
        var new_last_key = last_key.slice();
        var curr_name = this.name[i];
        new_first_key.unshift(curr_name);
        new_last_key.unshift(curr_name);
        var opts = { descending: true,
                      startkey : new_last_key,
                        endkey : new_first_key,
                        reduce : true,
                        group_level : this.group_level,
                        limit  : limit};
        this.db.getView("slow_control_time", "slow_control_time",
              { opts : opts }, view_clbck(this, 0, curr_name, opts));
    }

};

nedm.MonitoringGraph.prototype.mergeData = function(new_data) {
   if (new_data.length === 0) return;
   var dt = this.data;
   if (dt.length === 0 || new_data[0][0] < dt[0][0]) {
     return this.prependData(new_data);
   }
   // otherwise we need to merge
   var curIndex = dt.length-1;
   var dIndex = 0;
   var comp_func = function(a,b) { return a[0] - b[0]; };
   while (dIndex < new_data.length && new_data[dIndex][0] >= dt[0][0]) {
       // find where we need to insert
       var cI = bs(dt, new_data[dIndex], comp_func, 0, curIndex);
       if (cI >= 0) {
           // means the value is already at an index
           curIndex = cI;
           for (var j=1;j<new_data[dIndex].length;j++) {
              if (new_data[dIndex][j] !== null) dt[curIndex][j] = new_data[dIndex][j];
           }
       } else {
           curIndex = ~cI;
           dt.splice(curIndex, 0, new_data[dIndex]);
       }
       dIndex += 1;
   }
   // Take care of the rest.
   new_data.splice(0, dIndex);
   this.prependData(new_data);
};

nedm.send_command = function(o) {
    return nedm.get_database().send_command(o);
};

nedm.MonitoringGraph.prototype.syncFunction = function () {
    // don't sync too often...
    if (this.isSyncing) return;
    this.isSyncing = true;
    var total_length = this.name.length;
    var view_clbck = function(obj) {
        return function(e, o) {
                  if (e !== null) return;
                  var all_data = o.rows.map(obj.dataFromKeyVal, obj).filter( function(o) {
                      if (o !== null) return true;
                      return false;
                  });
                  var recv_length = all_data.length;
                  if (recv_length !== 0) {
                      obj.mergeData(all_data);
                  }
                  total_length -= 1;
                  if (total_length === 0) {
                    if (obj.data.length !== 0 && obj.time_range !== 0) {
                        var time_before_now = new Date(obj.data[obj.data.length-1][0].getTime() - obj.time_range*1000);
                        obj.removeBeforeDate(time_before_now);
                    }
                    obj.update();
                    obj.isSyncing = false;
                  }
              };
    };
    for (var i=0;i<this.name.length;i++) {
        this.db.getView('slow_control_time', 'slow_control_time',
          { opts : { descending : true,
                    group_level : this.group_level,
                         reduce : true,
                         limit  : 1,
                       startkey : [ this.name[i], {} ] } },
          view_clbck(this));
    }
};

nedm.MonitoringGraph.prototype.beginListening = function () {
  this.endListening();
  this.isListening = true;
  this.db.listen_to_changes_feed(this.uuid,
          function(o) { return function(err, obj) { o.syncFunction(err,obj); }; } (this),
          {since : 'now', filter : 'nedm_default/doc_type', type : "data"});
};

nedm.MonitoringGraph.prototype.endListening = function () {
  this.db.cancel_changes_feed(this.uuid);
  this.isSyncing = false;
  this.isListening = false;
};

$(document).on('mobileinit', function() {

  nedm.using_prefix = "/";
  if (document.location.pathname != '/' &&
      document.location.pathname.substring(0,5) != '/page') {
      nedm.using_prefix = "/nedm_head/_design/nedm_head/_rewrite/";
  }
  $(document).on('pageinit', function(x, y) {
      nedm.update_header(x, y);
      nedm.buildDBList(x, y);
  });

  // Handle page load fails from couchDB, forward to error handling.
  $(document).on('pageloadfailed', function( event, data) {

    // Let the framework know we're going to handle things.
    event.preventDefault();

    // Remove loading message.
    setTimeout(function() {
                $.mobile.hidePageLoadingMsg();
    }, $.mobile.loadPage.defaults.loadMsgDelay);

    // parse the error/reason
    var error = escape(JSON.parse(data.xhr.responseText).error);
    var msg = escape(JSON.parse(data.xhr.responseText).reason);
    nedm.show_error_window(error, msg);

    // Resolve the deferred object.
    data.deferred.reject(data.absUrl, data.options);
  });

  $(document).on('pageload', function( event, data) {
    var cIndex = $.mobile.navigate.history.activeIndex;
    var stck = $.mobile.navigate.history.stack;
    if (cIndex < stck.length - 1 && /error\.html/.exec(stck[cIndex + 1].pageUrl) !== null) {
        // Ok, we moved back successfully after an error, Pop this page out
        stck.splice(cIndex+1, 1);

    }
  });

  require("jquery-mobile-datebox");
});

// Load jquery-mobile at the very end
require("jquery-mobile");
var toastr = require("toastr");
toastr.options = {
  positionClass: "toast-top-right",
    closeButton: true
};
