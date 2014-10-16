// Global variables, to be exported and used by user code
$ = require("jquery");
require("jquery-cookie");
$.cookie.json = true;
var ace = require("ace");
var jqm_cal = require("jqm-calendar");

ace.config.set("basePath", "/nedm_head/_design/nedm_head/ace/");

var nedm = nedm || {};

(function() {

var handlebars = require("handlebars");
var events = require("events");
var db = require("db");
var dygraphs = require("dygraph-combined");

/**
 * binary search function to find an index in an array
 *
 * @param {Array} haystack
 * @param {Object,Number} needle, key being searched for
 * @param {Function} comparator
 * @param {Number} alow - low guess (index) where the needle is
 * @param {Number} ahigh - high guess (index) where the needle is
 * @returs {Number} index when found, otherwise ~low
 * @api private
 */

function bs(haystack, needle, comparator, alow, ahigh) {
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
}

/**
 * Returns mantissa, exponent from a float
 *
 * @param {Float} x
 * @return {Object} mantissa, exponent
 * @api private
 */

function GetNumberParts(x) {
    var sig = x > 0 ? 1 : -1;
    x = Math.abs(x);
    var exp = Math.floor(Math.log(x)/Math.LN10);
    var man = x/Math.pow(10, exp);
    return {mantissa: sig*man, exponent: exp};
}

/**
 * Builds parameter string for URL out of options
 *
 * @param {Object} options
 * @return {String} parameter string
 * @api private
 */

function BuildURL(options) {
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
}

/**
 * Adds/updates several functions to the DB object
 *
 * Note, the DB object is private which is why we can't necessarily inherit
 * from it.
 *
 * @param {Object} db, DB object
 * @api private
 */

function UpdateDBInterface(db) {
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
    // Fix db guessCurrent
    db.guessCurrent = function (loc1) {
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
                '/_changes' + BuildURL(options),
            type: "GET",
            expect_json: true
        };

        return this.request(req, callback);
    };

    var _called_views = {};
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
                '/_view/' + viewname + BuildURL(options.opts),
            data: data,
            type: theType,
            expect_json: true
        };

        var thisdb = this;
        // Inform the user if the view takes a while to load
        if (!(name in _called_views)) {
            _called_views[name] = {
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
        var cur_view = _called_views[name];
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

    var open_changes_feeds = { taglist: {}, urllist: {}};

    /**
     * Listen to changes feed of a particular database.  If feed is already open,
     * then add a listener to that feed.  *This should be used sparingly!*  Chances
     * are, the same functionality can be gained by listening to aggregate changes
     * (see nedm.on_db_updates).
     *
     * @param {String} tag - unique tag
     * @param {Function} callback(EventSource) - gets message from EventSource object
     * @options {Object} options - Options to pass to changes feed
     * @api public
     */

    db.listen_to_changes_feed = function(tag, callback, options) {
        options.feed = "eventsource";
        var url = this.url + "/_changes" + BuildURL(options);

        if (!(url in open_changes_feeds.urllist)) {
            // start a new listener
            var listener = new EventSource(url);
            open_changes_feeds.urllist[url] = {src: listener, taglist: {}};

        }
        if (tag in open_changes_feeds.taglist) {
            console.log("Warning: removing tag '" + tag +"'");
            this.cancel_changes_feed(tag);
        }
        open_changes_feeds.taglist[tag] = {callb: callback, url: url};
        open_changes_feeds.urllist[url].src.addEventListener("message", callback, false);
        open_changes_feeds.urllist[url].taglist[tag] = {};
    };

    /**
     * Cancel previous changes feed opened by nedm.listen_to_changes_feed
     *
     * @param {String} tag - unique tag
     * @api public
     */

    db.cancel_changes_feed = function(tag) {
        if (!(tag in open_changes_feeds.taglist)) return;

        var obj = open_changes_feeds.taglist[tag];
        var src = open_changes_feeds.urllist[obj.url].src;

        src.removeEventListener("message", obj.callb, false);

        delete open_changes_feeds.urllist[obj.url].taglist[tag];
        if ( Object.keys( open_changes_feeds.urllist[obj.url].taglist ).length === 0 ) {
            src.close();
            delete open_changes_feeds.urllist[obj.url];
        }
        delete open_changes_feeds.taglist[tag];
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

    db.db_name = function() {
      var arr = this.url.split('/');
      return arr[arr.length-1].split('%2F')[1];
    };

    var _callback_emitters = new events.EventEmitter();
    var db_name = db.db_name();

    function GenerateCallback(msg) {
      if (db_name !== msg.db) return;
      _callback_emitters.emit(msg.type, msg);
      _callback_emitters.emit("both", msg);
    }

    db.on = function(type, callback) {
      if (!callback) {
        callback = type;
        type = "both";
      }
      _callback_emitters.removeListener(type, callback);
      _callback_emitters.addListener(type, callback);
      nedm.on_db_updates(GenerateCallback);
    };

    db.off = function(type, callback) {
      if (!callback) {
        callback = type;
        type = "both";
      }
      _callback_emitters.removeListener(type, callback);
      if (_callback_emitters._events && Object.keys(_callback_emitters._events).length === 0) nedm.remove_db_updates(GenerateCallback);
    };
}


var old_use = db.use;
/**
 * UseDB internal function (fixes db.use and updates the DB interface with additional functions)
 *
 * @param {String} url - url to database
 * @api private
 */

function UseDB(url) {
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
    var myDB = old_use(url);

    // hack to fix version 0.13 of db
    if (myDB.url[0] =='/') myDB.url = myDB.url.substr(1);

    UpdateDBInterface(myDB);

    return myDB;
}
db.use = UseDB;

/**
 * Updates the login/logout buttons and user status.  Called during session
 * changes
 *
 * @api private
 */

function UpdateButtons() {
    CheckUserStatus( function(user_status) {
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
      $("a[id*=homebtn]").attr("href", using_prefix);
    });
}

/**
 * Adds DB "flash" button to the header toolbar.  This can be blinked to
 * indicate DB activity.
 *
 * @param {DOM Object} $header_left - header portion on the left side
 * @return {String} adb - db name
 * @return {String} prettyname - db name, pretty version
 * @api private
 */

function AddDBButtonToHeader( $header_left, adb, prettyname ) {
  if (!prettyname) {
    prettyname = adb;
    adb = $header_left;
    $header_left = $('.left_header');
  }
  if ($header_left.find('.' + adb + '-status').length !== 0) return;
  var txt = "";
  var re = /[A-Z]/g;
  var m;
  while ((m = re.exec(prettyname))) {
    txt += m[0];
  }
  var new_b = $('<button/>')
              .addClass("ui-btn ui-btn-icon-left " +
                        "ui-icon-nedm-status-button-g " + adb + "-status")
              .text(txt).addClass('ui-disabled');
  $header_left.append(new_b);
}


var shown_toastr_status;
/**
 * Updates showing the DB status as a toastr status
 *
 * @param {Object} ev, jQuery event
 * @param {Object} ui, jQuery info
 * @api private
 */

function UpdateDBStatus(ev, ui) {
  if (!shown_toastr_status) {
    // temp set to avoid anything else setting
    shown_toastr_status = true;
    var my_but = $(ev.currentTarget);
    my_but.addClass('ui-disabled');
    // Populate with DB info
    function getDBInfo(dbs) {
      var $new_div = $('<div/>').attr( { 'data-role' : 'controlgroup',
                                         'data-type' : 'horizontal',
                                         'data-mini' : 'true' } )
                                .addClass('nedm-db-status');
      for (db in dbs) {
        AddDBButtonToHeader( $new_div, db, dbs[db].prettyname );
      }
      shown_toastr_status = toastr.info($new_div, "Control Center",
      {
             iconClass : " ",
          tapToDismiss : false,
          hideDuration : 300,
               timeOut : 0,
       extendedTimeOut : 0,
             closeHtml : '<button>_</button>',
         positionClass : "toast-bottom-left",
              onHidden : function() { my_but.show().removeClass('ui-disabled');
                                      shown_toastr_status = null; }
      });
      $new_div.controlgroup();
      my_but.hide();
    }
    nedm.get_database_info(getDBInfo);
  }
};


/**
 * Updates header toolbar to show correct DB name.
 * Also calls through to UpdateButtons
 *
 * @param {Object} ev, jQuery event
 * @param {Object} ui, jQuery info
 * @api private
 */

function UpdateHeader(ev, ui) {

  var hC = $(ev.target).find(".headerChild");
  hC.load("/nedm_head/_design/nedm_head/header.html", function() {
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

      UpdateButtons();
      var stat = $(this).find('.db-status-button');
      stat.on('click', UpdateDBStatus);
      if (shown_toastr_status) stat.hide();
  });

}

/**
 * Builds database list (subsystems)
 *
 * @param {Object} ev, jQuery event
 * @param {Object} ui, jQuery info
 * @api private
 */

function BuildDBList(ev, id) {
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
                       ul.append($('<li/>').append($('<a/>').attr( { href : using_prefix + 'page/' + pg_name + '/' + esc_name } )
                                                            .append(pg)));
                   }
               }
               html.append(ul);
               db_list.append(html);
           }

           listDBs.trigger("create");
       });
   };}(ev,id));
}

//////////////////////////
// Event handling for nedm
//////////////////////////

// Internal EventEmitter object
var _emitter = new events.EventEmitter();

/**
 * Handles aggregate database messages (changes feed)
 * emits "db_update" events, which can be listened to (see nedm.on_db_updates)
 *
 * @param {Object} msg, Message from EventSource
 * @api private
 */

function HandleDatabaseChanges(msg) {
    var dat = JSON.parse(msg.data);
    var id = dat.id.split(':');
    _emitter.emit("db_update", { db  : id[0].split('/')[1],
                                type : id[1] });
}

/**
 * Turns on listening to aggregate DB changes.
 * Called by a session change.
 *
 * @api private
 */

function ListenToDBChanges() {
    var aggr = nedm.get_database('nedm%2Faggregate');
    aggr.cancel_changes_feed('db_status');
    aggr.listen_to_changes_feed("db_status",
      HandleDatabaseChanges, { since : "now" });
}

/**
 * Listen for changes from aggregate database
 *
 * @param {Function} callback(obj) - obj is { db : "db_name", type : "atype" }
 *   'type' can be "data" or "heartbeat".
 *   'db' is the database name *without* the preceding 'nedm%2F'.
 * @api public
 */

nedm.on_db_updates = function(callback) {
  nedm.remove_db_updates(callback);
  _emitter.on("db_update", callback);
};

/**
 * Remove changes callback
 *
 * @param {Function} callback(obj) - see nedm.on_db_updates
 * @api public
 */

nedm.remove_db_updates = function(callback) {
  _emitter.removeListener("db_update", callback);
};

var logged_in_as = null;
function SetUserName(userCtx) {
    logged_in_as = userCtx.name;
}

//////////////////////////
// Session handling
//////////////////////////

var session = require("session");

/**
 * Check current user status
 *
 * @param {Function} callback(login_name)
 * @api private
 */

function CheckUserStatus(callback) {
    session.info(function(err, info) {
       if (info) SetUserName(info.userCtx);
       callback(logged_in_as);
    });
}

/**
 * Logout from server
 *
 * @api public
 */

nedm.logout = function() {
    session.logout();
};

/**
 * Login to server
 *
 * @param {String} un - username
 * @param {String} pw - password
 * @param {Function} callback(Boolean) - called with status of login.
 * @api public
 */

nedm.validate = function(un, pw, callback) {
    session.login(un, pw,
            function(err, response) {
                var success = true;
                if(err) success = false;
                if (callback) callback(success);
            });
};

// Register handling changes in the session
session.on('change', function(userCtx) {
    SetUserName(userCtx);
    ListenToDBChanges();
    UpdateButtons();
    BuildDBList();
});

/**
 * Get current db name, guessed from either the path of the page, or the passed
 * in path
 *
 * @param {String} pathname (Optional)
 * @return {String} name of db (e.g. "nedm%2Fraspberries")
 * @api public
 */

nedm.get_current_db_name = function(pathname) {
    var pth = pathname || document.location.pathname;
    var temp = pth.split("/");
	// Following gets rid of nedm%2F for those browsers that don't
	// automatically convert to /
	temp = temp[temp.length-1].split("%2F");
    return "nedm%2F" + temp[temp.length-1];
};

var available_database = {};

/**
 * Get database by name
 *
 * @param {String} name (Optional) - name of database *or* return from nedm.get_current_db_name
 * @return {DB} database object (with updated interface)
 * @api public
 */

nedm.get_database = function(name) {
    if (name === undefined) {
      name = nedm.get_current_db_name();
    }
    if (!(name in available_database)) {
        available_database[name] = UseDB('nedm_head/_design/nedm_head/_rewrite/_couchdb/' + name);
    }
    return available_database[name];
};

/**
 * Wrapper for handlebars.compile
 *
 * @param {String} astr - string to be compiled
 * @return {Object} handlebars compiled object
 * @api public
 */

nedm.compile = function(astr) {
    return handlebars.compile(astr);
};

var all_db_listeners = {};

/**
 * DatabaseStatus object.  "Global" object designed to handle updating the
 * interface according to updates to DBs.
 *
 * @api private
 */

function DatabaseStatus() {
   var track_dbs = {};
   var map = { data : 'write_status', heartbeat : 'control_status' };
   function ResetToRed( $the_dom ) {
     return function() {
       $the_dom.removeClass('nedm-status-y')
               .removeClass('nedm-status-g')
               .addClass('nedm-status-r');
     };
   }

   function UpdateFunction( obj ) {
     function RemButton() {
       but.addClass('ui-disabled');
     }
     var $adom = $('.' + obj.db + ' .' + map[obj.type]);
     if (!track_dbs[obj.db]) track_dbs[obj.db] = {};
     if (track_dbs[obj.db][obj.type]) {
       // reset timeout
       clearTimeout(track_dbs[obj.db][obj.type]);
     }
     $adom.removeClass('nedm-status-y')
          .removeClass('nedm-status-r')
          .addClass('nedm-status-g');
     track_dbs[obj.db][obj.type] = setTimeout(ResetToRed($adom), 30000);
     if (obj.type === 'data') {
       // broadcast to all buttons
       var but = $('.' + obj.db + '-status');
       but.removeClass('ui-disabled');
       setTimeout(RemButton, 1000);
     }
   }

   nedm.on_db_updates( UpdateFunction );

   function db_stat( all_dbs ) {
       var tbody = $(".status_db_class tbody");
       tbody.empty();
       for (var adb in all_dbs) {
           if (adb in all_db_listeners) continue;
           var o = all_dbs[adb];
           var new_line = $('<tr/>').addClass(adb)
                                    .append($('<th/>').addClass("db_name").text(o.prettyname))
                                    .append($('<th/>').append(
                                      $('<div/>').addClass("nedm-status-y write_status")))
                                    .append($('<th/>').append($('<div/>').addClass("nedm-status-y control_status")));
           tbody.append(new_line);
           track_dbs[adb] = {
             data : setTimeout(ResetToRed($('.' + adb + ' .write_status')), 10000),
             heartbeat : setTimeout(ResetToRed($('.' + adb + ' .control_status')), 10000)
           };
       }
   }
   var _table_built = false;
   this.build_table = function() {
     if (_table_built) return;
     nedm.get_database_info( db_stat );
     _table_built = true;
   };
}

var _db_status = new DatabaseStatus();

/**
 * Build database status table.  This is called on index.html
 *
 * @api public
 */

nedm.database_status = function( ) {
    _db_status.build_table();
};



/**
 * Gets database information.
 *
 * @param {Function} callback(dbs) - dbs is an object with
 *   {
 *     db_name : { prettyname : "Pretty Name" ... }
 *   }
 *
 *   which is information stored in the subsystem_information document
 *
 * @api public
 */

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
                if (obj[1].hide) continue;
                current_database_info[obj[0]] = obj[1];
            }
            callback( current_database_info );
        });
    });


};

/**
 * Helper function, gets most recent value of a variable
 *
 * @param {String} var_name - name of variable
 * @param {Function} callback(err, obj) - Typical callback from view, see
 *   DB.getView
 *
 * @api public
 */

nedm.get_most_recent_value = function(var_name, callback) {
    nedm.get_database().get_most_recent_value(var_name, callback);
};

/**
 * Helper function, sends command to current database
 *
 * @param {Object} o - command, see DB.send_command
 * @return {jqXHR Object}
 * @api public
 */

nedm.send_command = function(o) {
    return nedm.get_database().send_command(o);
};


/**
 * Show toastr error window
 *
 * @param {String} error - Error type
 * @param {String} msg - More detailed message
 *
 * @api public
 */

nedm.show_error_window = function(error, msg) {
    toastr.error(msg, error);
};

/**
 * Get Date object from array
 *
 * @param {Array} arr - Array like ["name", YY, MM, DD, H, M, S] or [YY, MM, DD, H, M, S, "name"]
 * @return {Date Object}
 *
 * @api public
 */

nedm.dateFromKey = function(arr) {
  var start = 0;
  var end = 1;
  if (typeof arr[0] === "string") {
    start = 1;
    end = 0;
  }
  return new Date(Date.UTC.apply(this, arr.slice(start, arr.length-end)));
};

/**
 * Get Array from Date Object, assumes Date is UTC
 *
 * @param {Date Object} date
 * @return {Array} arr - [YY, MM, DD, H, M, S]
 * @api public
 */

nedm.keyFromUTCDate = function(date) {
  return [date.getUTCFullYear(), date.getUTCMonth(),
          date.getUTCDate(),     date.getUTCHours(),
          date.getUTCMinutes(),  date.getUTCSeconds()];
};

/**
 * Get Array from Date Object, not UTC
 *
 * @param {Date Object} date
 * @return {Array} arr - [YY, MM, DD, H, M, S]
 * @api public
 */

nedm.keyFromDate = function(date) {
  return [date.getFullYear(), date.getMonth(),
          date.getDate(),     date.getHours(),
          date.getMinutes(),  date.getSeconds()];
};

/**
 * MonitoringGraph provides an interface to the dygraph functionality
 *
 * @param {DOM Object} $adiv - where the graph should show up
 * @param {String or Array} data_name - name or list of data names
 * @param {Number} since_time_in_secs - grab since a time seconds from 'now'
 * @param {DB Object} database object
 * @api public
 */

nedm.MonitoringGraph = function ($adiv, data_name, since_time_in_secs, adb) {

    // Private variables
    var myDB = adb;
    var data = [];
    var graph = new dygraphs.Dygraph($adiv, data,
                {
                    drawPoints: true,
                    showRoller: false,
                        labels: ['Time'].concat(data_name),
        connectSeparatedPoints: true,
               xAxisLabelWidth: 60,
                        height: dygraphs.Dygraph.DEFAULT_HEIGHT, // explicitly set
                 zoomCallback : RecalcAxisLabels
                });

    var name = data_name;
    var group_level = 9;

    var tthis = this;
    var isSyncing = false;
    var wasLive = false;
    var isListening = false;
    var time_range;
    var until_time;
    var time_prev;
    var myBaseURL = $('.ui-page-active').data('url');

    /**
     * show the particular container (if hidden)
     *
     * @param {jQuery Event Object} ev
     * @param {jQuery User Object} ui
     * @api private
     */

    function ShowContainer(ev, ui) {
        if ($(ui.toPage).data("url") !== myBaseURL) return;
        if (wasLive) {
          BeginListening();
        }
    }

    /**
     * hide the particular container (if shown)
     *
     * @param {jQuery Event Object} ev
     * @param {jQuery User Object} ui
     * @api private
     */

    function HideContainer(ev, ui) {
        if ($(ui.prevPage).data("url") !== myBaseURL) return;
        if (isListening) {
          EndListening();
          wasLive = true;
        } else {
          wasLive = false;
        }
    }

    /**
     * Synchronize with the database, called by event handler
     *
     * @api private
     */

    function SyncFunction() {
        // don't sync too often...
        if (isSyncing) return;
        isSyncing = true;
        var total_length = name.length;
        function ViewClbk(e, o) {
            if (e !== null) return;
            var all_data = o.rows.map(DateFromKeyVal, tthis).filter( function(o) {
                if (o !== null) return true;
                return false;
            });
            var recv_length = all_data.length;
            if (recv_length !== 0) {
                MergeData(all_data);
            }
            total_length -= 1;
            if (total_length === 0) {
              if (data.length !== 0 && time_range !== 0) {
                  var time_before_now = new Date(data[data.length-1][0].getTime() - time_range*1000);
                  tthis.removeBeforeDate(time_before_now);
              }
              tthis.update();
              isSyncing = false;
            }
        }
        for (var i=0;i<name.length;i++) {
            myDB.getView('slow_control_time', 'slow_control_time',
              { opts : { descending : true,
                        group_level : tthis.groupLevel(),
                             reduce : true,
                             limit  : 1,
                           startkey : [ name[i], {} ] } },
              ViewClbk);
        }
    }

    /**
     * Handle listening
     *
     * @param {Object} msg - EventSource message
     * @api private
     */

    function HandleListening(msg) {
      SyncFunction();
    }

    /**
     * Prepend to the 'data' variable
     *
     * @param {Array} r - data to prepend
     * @api private
     */

    function PrependData(r) {
      for (var i=0;i<r.length;i++) {
          data.unshift(r[i]);
      }
    }

    /**
     * Append to the 'data' variable
     *
     * @param {Array} r - data to append
     * @api private
     */

    function AppendData(r) {
         var append = 0;
         for (var i=0;i<r.length;i++) {
             data.push(r[i]);
             append++;
         }
         return append;
    }

    /**
	 * Merge data in to data variable.  This will ensure that data is in
	 * chronological order.
     *
     * @param {Array} new_data - data to be merged in
     * @api private
     */

    function MergeData(new_data) {
      if (new_data.length === 0) return;
      var dt = data;
      if (dt.length === 0 || new_data[0][0] < dt[0][0]) {
        return PrependData(new_data);
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
      PrependData(new_data);
    }

    /**
	 * Recalculate what the axis labels should be.
     *
     * @api private
     */

    function RecalcAxisLabels() {
         var range = graph.yAxisRange();
         var one_side = GetNumberParts(range[1]);
         var subtract = GetNumberParts(range[1] - range[0]);
         var sfs = one_side.exponent - subtract.exponent + 2;
         graph.updateOptions({ axes : { y : { sigFigs : sfs } } });
    }

    /**
	 * Get Date object from Key
     *
     * @param {Array} obj - key like accepted by nedm.dateFromKey
     * @return {Date object}
     * @api private
     */

    function DateFromKeyVal(obj) {
         var outp = [ nedm.dateFromKey(obj.key) ];
         var seen = false;
         var data_name = name;
         for (var i=0;i<data_name.length;i++) {
             if (data_name[i] == obj.key[0]) {
                 outp.push(obj.value.sum/obj.value.count);
                 seen = true;
             } else outp.push(null);
         }
         if (!seen) return null;
         return outp;
    }

    /**
	 * Stop listening for changes
     *
     * @api private
     */

    function EndListening() {
      myDB.off("data", HandleListening);
      isSyncing = false;
      isListening = false;
    }

    /**
	 * Begin listening for changes
     *
     * @api private
     */

    function BeginListening() {
      EndListening();
      isListening = true;
      myDB.on("data", HandleListening);
    }

    // Public interface

    /**
	 * Return name (variables)
     *
     * @return {Number} group level
     * @api public
     */

    this.name = function() { return name; };


    /**
	 * Get group level
     *
     * @return {Number} group level
     * @api public
     */

    this.groupLevel = function() { return group_level; };

    /**
	 * Set group level
     *
     * @param {Number} gl - set group level
     * @api public
     */

    this.setGroupLevel = function(gl) { group_level = gl; };

    /**
	 * Update the graph with current data, settings, etc.
     *
     * @api public
     */

    this.update = function() {
         graph.updateOptions( { 'file': data, 'labels' : ['Time'].concat(name) } );
         RecalcAxisLabels();
    };

    /**
	 * Destroy the plot (like destructor).  Stops listening, removes event handlers
     *
     * @api public
     */

    this.destroy = function() {
      EndListening();
      $(document).off( { pagecontainershow : ShowContainer,
                         pagecontainerhide : HideContainer });
    };

    /**
	 * Destroy the plot (like destructor).  Stops listening, removes event handlers
     *
     * @param {Date object} prev_time - previous time
     * @param {Date object} until_t - go until time.
     * @param {Function} callback() - called once everything is completed
     * @api public
     */

    this.changeTimeRange = function (prev_time, until_t, callback) {

        time_prev = prev_time;
        if (typeof until_t === 'object' ) {
          // this means we go until a particular time
          if (prev_time > until_t) {
              toastr.error("Time incorrect: " + prev_time.toString() + " > " + until_t.toString(), "Time");
              if (callback) callback();
              return;
          }
          until_time = until_t;
          time_range = 0;
          EndListening();
        } else {
          until_time = 0;
          time_range = ((new Date()).getTime() - time_prev)/1000;
          BeginListening();
        }
        data.length = 0;
        // first determine what the earliest date is
        var last_key = [9999];
        if (until_time !== 0) {
            last_key = [
                     until_time.getUTCFullYear(), until_time.getUTCMonth(),
                     until_time.getUTCDate(), until_time.getUTCHours(),
                     until_time.getUTCMinutes(), until_time.getUTCSeconds()-1];
        }
        first_key = [
                     time_prev.getUTCFullYear(), time_prev.getUTCMonth(),
                     time_prev.getUTCDate(), time_prev.getUTCHours(),
                     time_prev.getUTCMinutes(), time_prev.getUTCSeconds()];

        if (name.length === 0 && callback) callback();
        var warning_shown = false;
        var limit = 3000;
        var names_to_check = name.length;
        function view_clbck(tl_entries, cr_name, local_opts) {
            return function(e, o) {
              if (e !== null) return;
              var all_data = o.rows.map(DateFromKeyVal, tthis).filter( function(o) {
                  if (o !== null) return true;
                  return false;
              });
              if (!warning_shown && tl_entries > 50000) {
                  toastr.warning("Data length is > 50000 entries, suggest setting averaging or selecting a smaller visualization range", "");
                  warning_shown = true;
              }
              var recv_length = all_data.length;
              if (recv_length !== 0) {
                  MergeData(all_data);
                  tl_entries += recv_length;
                  if (recv_length < limit) {
                      if (callback) {
                          // The callback can request that we stop loading
                          callback({ loaded : tl_entries,
                                   variable : cr_name,
                                       done : true });
                      }
                      names_to_check -= 1;
                      if (names_to_check <= 0) tthis.update();
                  } else {
                      local_opts.startkey = o.rows[o.rows.length-1].key;
                      local_opts.skip = 1;
                      if (callback) {
                          // The callback can request that we stop loading
                          if (!callback({ loaded : tl_entries,
                                        variable : cr_name,
                                            done : false })) {
                              names_to_check -= 1;
                              if (names_to_check <= 0) tthis.update();
                              return;
                          }
                      }
                      myDB.db.getView("slow_control_time", "slow_control_time",
                          { opts: local_opts }, view_clbck(tl_entries, cr_name, local_opts));
                  }
              } else if (callback) callback();
            };
        }

        for (var i=0;i<name.length;i++) {
            var new_first_key = first_key.slice();
            var new_last_key = last_key.slice();
            var curr_name = name[i];
            new_first_key.unshift(curr_name);
            new_last_key.unshift(curr_name);
            var opts = { descending: true,
                          startkey : new_last_key,
                            endkey : new_first_key,
                            reduce : true,
                            group_level : tthis.groupLevel(),
                            limit  : limit};
            myDB.getView("slow_control_time", "slow_control_time",
                  { opts : opts }, view_clbck(0, curr_name, opts));
        }

    };

    this.addDataName = function(aname) {
        if (!Array.isArray(aname)) aname = [ aname ];
        var retVal = false;
        var arr = name;
        aname.forEach(function(ev) {
          if (arr.indexOf(ev) == -1) {
            arr.push(ev);
            retVal = true;
          }
        });
        return retVal;
    };

    this.removeDataName = function(aname, callback) {
        if (!Array.isArray(aname)) {
          aname = [ aname ];
        }
        var wasRemoved = false;
        var arr = name;
        aname.forEach(function(ev) {
            var anIndex = arr.indexOf(ev);
            if (anIndex == -1 ) return;
            wasRemoved = true;
            arr.splice(anIndex, 1);
            data.every( function(o) { o.splice(anIndex+1, 1); return true; } );
        });
        if (!wasRemoved) return;
        tthis.update();
        if (callback) callback();
    };

    this.removeBeforeDate = function(adate) {
        if (data.length === 0) return 0;
        var j = 0;
        while (j < data.length && data[j][0].getTime() < adate.getTime()) j++;
        return data.splice(0, j);
    };

    // Function calls for setup
    this.changeTimeRange(since_time_in_secs, 0);

    $(document).on( { pagecontainershow : ShowContainer,
                      pagecontainerhide : HideContainer });


};

var using_prefix = "/";
$(document).on('mobileinit', function() {

  if (document.location.pathname != '/' &&
      document.location.pathname.substring(0,5) != '/page') {
      using_prefix = "/nedm_head/_design/nedm_head/_rewrite/";
  }
  $(document).on('pageinit', function(x, y) {
      UpdateHeader(x, y);
      BuildDBList(x, y);
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
}());
