/**
 * Builds parameter string for URL out of options
 *
 * @param {Object} options
 * @return {String} parameter string
 * @api private
 */

var events = require("events");
var toastr = require("toastr");
var on_cloudant;
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
    var tthis = db;
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
            xhr.addEventListener("progress", cbck.progress, false);
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
        var callback_wrapper = function(cbck) {
          return function(e, o) {
            // Clear the informational notice.
            cur_view.cancel();
            if (cbck) cbck(e,o);
          };
        };

        if (typeof callback === 'object') {
          var old_success = callback.success;
          callback.success = callback_wrapper(old_success);
        } else {
          callback = callback_wrapper(callback);
        }
        return this.request(req, callback);
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

    function OpenChangesFeed(url) {
      var hasOpened = false;
      var hasSeenError = false;
      var myURL = url;
      var myToastr;
      var use_event_source = !on_cloudant;
      function OnOpen(e) {
          hasOpened = true;
          if (hasSeenError) {
            toastr.success("Connection reestablished to: " + myURL, "Connection established");
            myToastr.remove();
          }
          hasSeenError = false;
      }
      function OnError(e) {
          if (hasSeenError) return;
          var msg = "";
          if (hasOpened) {
            msg = "Connection lost to: " + myURL;
          } else {
            msg = "Error making connection to: " + myURL;
          }
          hasSeenError = true;
          myToastr = toastr.error(msg, "Changes Feed Error", { timeOut : 0, extendedTimeOut : 0 });
      }
      var myEvents = new events.EventEmitter();

      var processed_length = 0;
      function EmitChangesFeedEvents(ev) {
        if (!ev.currentTarget || !ev.currentTarget.responseText) return;
        var rT = ev.currentTarget.responseText.slice(processed_length);
        if (rT.length === 0) return;
        var last_index = rT.lastIndexOf('\n');
        if (last_index === -1) return;
        var reqs = rT.split('\n');
        var goto_length = reqs.length;
        if (last_index !== rT.length - 1) {
          goto_length -= 1;
        }
        for (var i = 0;i<goto_length;i++) {
          if (reqs[i] === '') continue;
          myEvents.emit("message", { data : reqs[i] });
        }
        processed_length += last_index;
      }

      if (use_event_source) {
        var listener = new EventSource(url);
        listener.onerror = OnError;
        listener.onopen = OnOpen;
        this.addListener = function(callback) {
          this.removeListener(callback);
          listener.addEventListener("message", callback, false);
        };

        this.removeListener = function(callback) {
          listener.removeEventListener("message", callback, false);
        };
        this.close = function() {
          listener.close();
        };

      } else {
        // Much more limited interface!
        // here we can't use EventSource
        var req = {
            type: 'GET',
            url: url
        };
        var re = tthis.request(req, {
          progress : EmitChangesFeedEvents
        });
        this.removeListener = function(callback) {
          myEvents.removeListener("message", callback);
        };
        this.addListener = function(callback) {
          myEvents.addListener("message", callback);
        };
        this.close = function() {
          re.close();
        };
      }

    }

    var open_changes_feeds = { };
    var callback_functions = { urls : [], callbacks : []};

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

    db.listen_to_changes_feed = function(callback, options) {
        if (on_cloudant) {
          options.feed = "continuous";
        } else {
          options.feed = "eventsource";
        }
        if (!options.heartbeat) {
            options.heartbeat = 7000;
        }
        var url = this.url + "/_changes" + BuildURL(options);

        if (!(url in open_changes_feeds)) {
            // start a new listener
            open_changes_feeds[url] = new OpenChangesFeed(url);
        }
        open_changes_feeds[url].addListener(callback);
        callback_functions.urls.push(url);
        callback_functions.callbacks.push(callback);
    };

    /**
     * Cancel previous changes feed opened by nedm.listen_to_changes_feed
     *
     * @param {String} tag - unique tag
     * @api public
     */

    db.cancel_changes_feed = function(callback) {
        var index = callback_functions.callbacks.indexOf(callback);
        if ( index === -1 ) return;

        var url = callback_functions.urls[index];
        open_changes_feeds[url].removeListener(callback);
        callback_functions.callbacks.splice(index, 1);
        callback_functions.urls.splice(index, 1);
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


var old_db = require("db");
var old_use = old_db.use;
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
old_db.use = UseDB;
exports.UseDB = UseDB;
exports.on_cloudant = function(avar) {
  on_cloudant = avar;
};

