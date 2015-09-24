/**
 * @module lib/nedm
 *
 * @requires module:events
 * @requires module:dygraph-combined
 * @requires module:toastr
 * @requires module:js-cookie
 * @requires module:session
 * @requires module:lib/update_db
 * @requires module:lib/monitoring_graph
 * @requires module:jquery-mobile
 * @requires module:jquery-mobile-datebox
 *
 */

var events = require("events");
var dygraphs = require("dygraph-combined");
var toastr = require("toastr");
var cookie = require("js-cookie");
require("gridster-js");
cookie.json = true;

/**
 * Updates the login/logout buttons and user status.  Called during session
 * changes
 *
 * @private
 */
var using_prefix = "/";
function UpdateButtons() {
    CheckUserStatus( function(user_status) {
      var loginbtn = $("a[id*=loginbtn]");
      var logoutbtn = $("a[id*=logoutbtn]");
      if (user_status === null) {
          loginbtn.show();
          logoutbtn.hide();
          $('.db-updates-refresh').off()
                    .hide()
                    .prop("disabled", true);

      } else {
          logoutbtn.text("Logout (" + user_status + ")");
          logoutbtn.show();
          loginbtn.hide();
          $('.db-updates-refresh').prop("disabled", false)
                   .show()
                   .off()
                   .on("click", RefreshUpdates);
      }
      $("a[id*=homebtn]").attr("href", using_prefix);
    });
}

/**
 * Adds DB "flash" button to the header toolbar.  This can be blinked to
 * indicate DB activity.
 *
 * @param {Object} $header_left - header portion on the left side
 * @return {String} adb - db name
 * @return {String} prettyname - db name, pretty version
 * @private
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
              .addClass("ui-btn ui-btn-icon-left ui-shadow ui-mini ui-corner-all" +
                        " ui-icon-nedm-status-button-g " + adb + "-status db-status-blink")
              .text(txt).addClass('ui-disabled');
  $header_left.append(new_b);
}


var db_status = {
  shown_toastr_status : undefined,
      $toastr_content : undefined
};

/**
 * Updates showing the DB status as a toastr status
 *
 * @param {Object} ev, jQuery event
 * @param {Object} ui, jQuery info
 * @private
 */
function UpdateDBStatus(ev, ui) {
  function defineToasterStatus ($new_div) {
    db_status.shown_toastr_status = toastr.info($new_div, "Control Center",
    {
           iconClass : " ",
        tapToDismiss : false,
        containerId  : "db-status-id",
        hideDuration : 300,
             timeOut : 0,
     extendedTimeOut : 0,
           closeHtml : '<button>_</button>',
       positionClass : "toast-bottom-full-width",
            onHidden : function() {
              $('.db-status-button').show().removeClass('ui-disabled');
              db_status.shown_toastr_status = null; }
    });
    $new_div.controlgroup();
    var $blinkers = $new_div.find('.ui-controlgroup-controls');
    var width = $blinkers.width();
    var pos = $blinkers.position();
    $new_div.after($('<div/>').addClass('log').css({
      'left' : width + 20 + pos.left + 'px',
      'top' : pos.top + 'px',
      'height' : $blinkers.height() + 'px'
    }));
    $('.db-status-button').hide();
  }
  // Populate with DB info
  function getDBInfo(dbs) {
    db_status.$toastr_content =
                   $('<div/>').addClass('ui-grid-b nedm-db-status ui-controlgroup ui-controlgroup-vertical ui-corner-all');
    var tmp = [ "ui-block-a", "ui-block-b", "ui-block-c" ];
    var i = 0;
    for (var db in dbs) {
      var $n = $('<div/>').addClass(tmp[i % tmp.length]);
      AddDBButtonToHeader( $n, db, dbs[db].prettyname );
      db_status.$toastr_content.append($n);
      i += 1;
    }
    defineToasterStatus(db_status.$toastr_content);
  }


  if (!db_status.shown_toastr_status) {
    // temp set to avoid anything else setting
    db_status.shown_toastr_status = true;
    $('.db-status-button').addClass('ui-disabled');

    if (db_status.$toastr_content) {
      defineToasterStatus(db_status.$toastr_content);
    } else {
      get_database_info(getDBInfo);
    }
  }
}


/**
 * Updates header toolbar to show correct DB name.
 * Also calls through to UpdateButtons
 *
 * @param {Object} ev, jQuery event
 * @param {Object} ui, jQuery info
 * @private
 */

function UpdateHeader(ev, ui) {

  var hC = $(ev.target).find(".headerChild");
  hC.load("/nedm_head/_design/nedm_head/header.html", function() {
      $(this).find("[data-role=header]").trigger("create").toolbar();
      var hn = $(this).find('#nedm_header_name');
      var callback = function(dbs) {
        if (get_current_db_name() === undefined) return;
        var db = /nedm%2F(.*)/.exec(get_current_db_name())[1];
        if (db in dbs) {
          hn.text("nEDM Interface: " + dbs[db].prettyname);
        }
      };
      get_database_info(callback);

      UpdateButtons();
      var stat = $(this).find('.db-status-button');
      stat.on('click', UpdateDBStatus);
      if (db_status.shown_toastr_status) stat.hide();
  });

}


var $sidebar;
function GetSidebar( dbs, callback) {
  if ($sidebar) {
    callback($sidebar);
    return;
  }
  get_database("nedm_head").getDoc("sidebar", function(e, o ) {
      if (e) return;
      $sidebar = $('<div/>');
      $sidebar.append(o.body);
      if (using_prefix !== '/') {
        $('.overview,.alarms', $sidebar).each( function() {
          var ln = $(this);
          ln.attr('href', using_prefix + ln.attr('href'));
        });
      }
      var db_list = $('.all_dbs_list_class', $sidebar);
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
      callback($sidebar);
  });

}

/**
 * Builds database list (subsystems)
 *
 * @param {Object} ev, jQuery event
 * @param {Object} ui, jQuery info
 * @private
 */

function BuildDBList(ev, id) {
   var listDBs = (ev) ? $(ev.target).find('.listofdbs') : $('.listofdbs');
   get_database_info( function( dbs ) {
       GetSidebar( dbs, function($asid) {
           listDBs.empty();
           listDBs.append($asid.clone());
           listDBs.trigger('create');
       });
   });
}


//////////////////////////
// Event handling for nedm
//////////////////////////

var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
var aggregate_db;
var useLocalStorage = false;
var iAmActiveListener = false;

function OpenLockDatabase(callback) {
  if ( typeof indexedDB !== 'undefined' ) {
    // We can use indexedDB
    if ( typeof aggregate_db !== 'undefined' ) {
      // We've already opened, callback
      callback();
    } else {
      // Initiate the open
      var request = indexedDB.open("nedm_aggregate");
      request.onupgradeneeded = function(ev) {
        aggregate_db = ev.target.result;
        var objectStore = aggregate_db.createObjectStore("listener", { listening : 1 });
        toastr.info("Local Aggregate DB created", _agg_msg_title);
      };
      request.onsuccess = function(ev) {
        toastr.info("Local Aggregate DB opened", _agg_msg_title);
        aggregate_db = ev.target.result;
        useLocalStorage = true;
        callback();
      };
    }
  } else {
    callback();
  }
}

function RequestLockDatabase(callback) {
  // We rely on the transaction lock in IndexedDB to serialize readwrite calls
  // On a successful acquisition of the lock, we check if
  // aggregate_feed_running is set in localStorage.  If not, it means we should
  // become the listener.
  var trans = aggregate_db.transaction(["listener"], "readwrite");
  var os = trans.objectStore('listener');

  // We simply get the dummy variable since the 'success' function will be
  // called while we have the transaction lock.
  var req = os.get('listening');
  req.onsuccess = function(ev) {
    if (localStorage.aggregate_feed_running) {
      callback(false);
    } else {
      callback(true);
    }
  };
  req.onerror = function(ev) {
    // FixME, can we recover?
    toastr.error("Unexpected Local DB error", "Suggest browser restart!");
  };
}

// Internal EventEmitter object
var _emitter = new events.EventEmitter();
var _pageEvents = new events.EventEmitter();

/**
 * Handles aggregate database messages (changes feed)
 * emits "db_update" events, which can be listened to (see on_db_updates)
 *
 * @param {Object} msg, Message from EventSource
 * @private
 */

function HandleDatabaseChanges(msg, isLocalHandler) {
    var dat = JSON.parse(msg.data);
    if (!dat.id) return;
    if (useLocalStorage && !isLocalHandler) {
      localStorage.nedm_aggregate = msg.data;
    }
    var id = dat.id.split(':');
    _emitter.emit("db_update", { db  : id[0].split('/')[1],
                                type : id[1] });
}

/**
 * Turns on listening to aggregate DB changes.
 * Called by a session change.
 *
 * @private
 */

function HandleLocalStorage(ev) {
  if (useLocalStorage && !localStorage.aggregate_feed_running) {
    // Means another tab died
    window.removeEventListener('storage', HandleLocalStorage);
    ResetLocalStorage(true);
    ListenToDBChanges();
  } else {
    if (ev.key !== "nedm_aggregate") return;
    HandleDatabaseChanges( { data : ev.newValue }, true );
  }
}

/**
 * Starts an actual feed
 *
 * @private
 */

function StartFeed() {
  var aggr = get_database('nedm%2Faggregate');
  aggr.cancel_changes_feed( HandleDatabaseChanges );
  aggr.listen_to_changes_feed(HandleDatabaseChanges, { since : "now" });
}

/**
 * Refreshes updates by removing aggregate feed running
 *
 * @private
 */

function RefreshUpdates() {
  // This function is called by a button press
  localStorage.removeItem('aggregate_feed_running');

  // The previous removeItem call calls the following function in all tabs.  We
  // call it explicitly here.
  HandleLocalStorage( { key : "" } );
}

/**
 * Reset the local storage, and cancels feed if shutdown is true.
 *
 * @private
 */

function ResetLocalStorage(shutdown) {
   if (iAmActiveListener) {
     if (localStorage.aggregate_feed_running) {
       localStorage.removeItem('aggregate_feed_running');
     }
     iAmActiveListener = false;
   }
   if (shutdown) {
     get_database('nedm%2Faggregate').cancel_changes_feed( HandleDatabaseChanges );
   }
}

var _agg_msg_title = "Agg Listener Message";

window.onunload = function() {
  ResetLocalStorage(false);
};

function ListenToDBChanges() {
    if (!logged_in_as) {
      ResetLocalStorage(true);
      return;
    }
    OpenLockDatabase( function() {
      if (useLocalStorage) {
        if (localStorage.aggregate_feed_running) {
           // Means the feed is already running, just consume
           window.addEventListener('storage', HandleLocalStorage);
        } else {
           RequestLockDatabase( function( should_listen ) {
             if (should_listen) {
               localStorage.aggregate_feed_running = "true";
               iAmActiveListener = true;
               $('.masterListener').show();
               toastr.info("This window is now the master aggregate listener", _agg_msg_title);
               StartFeed();
             } else {
               $('.masterListener').hide();
             }
             // Call again, it will just listen to storage events
             ListenToDBChanges();
           });
        }
      } else {
        StartFeed();
      }
    });
}

/**
 * DB update callback message
 * @typedef {Object} module:lib/nedm.DBUpdateMessage
 * @property {String} db - name of database
 * @property {String} type - type of message
 */

/**
 * DB update callback function
 * @callback module:lib/nedm.OnDBUpdates
 * @param {module:lib/nedm.DBUpdateMessage} msg
 */

/**
 * Listen for changes from aggregate database
 *
 * @param {module:lib/nedm.OnDBUpdates} callback
 * @public
 */

function on_db_updates(callback) {
  remove_db_updates(callback);
  _emitter.on("db_update", callback);
};

/**
 * Remove changes callback
 *
 * @param {module:lib/nedm.OnDBUpdates} callback
 * @see on_db_updates
 * @public
 */

function remove_db_updates(callback) {
  _emitter.removeListener("db_update", callback);
}

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
 * @private
 */

function CheckUserStatus(callback) {
    session.info(function(err, info) {
       if (info) SetUserName(info.userCtx);
       callback(logged_in_as);
    });
}

/**
 * Login to server
 *
 * @param {String} un - username
 * @param {String} pw - password
 * @param {Function} callback(Boolean) - called with status of login.
 * @public
 */

function validate(un, pw, callback) {
    session.login(un, pw,
            function(err, response) {
                var success = true;
                if(err) success = false;
                if (callback) callback(success);
            });
}

/**
 * Signup on server
 *
 * @param {String} un - username
 * @param {String} pw - password
 * @param {Boolean} tryLogin - try Login when a successful signup
 * @param {Function} callback(Boolean) - called with status of login.
 * @public
 */

function registerUser(un, pw, tryLogin, callback) {
    var adoc = {
        _id  : "org.couchdb.user:" + un,
        name : un,
        password : pw,
        type : "user",
        roles : []
    }
    get_database("_users").saveDoc(adoc,
      function (err, obj) {
        if (err) return callback(false);
        if (tryLogin) return validate(un, pw, callback);
        callback(true);
    });
}



// Register handling changes in the session
session.on('change', function(userCtx) {
    db_info_cookie = null;
    $sidebar = null;
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
 * @public
 */

function get_current_db_name(pathname) {
    var pth = pathname || document.location.pathname;
    var temp = pth.split("/");
	// Following gets rid of nedm%2F for those browsers that don't
	// automatically convert to /
	temp = temp[temp.length-1].split("%2F");
    return "nedm%2F" + temp[temp.length-1];
}

var available_database = {};

/**
 * Get database by name
 *
 * @param {String} name (Optional) - name of database *or* return from get_current_db_name
 * @return {nEDMDB} database object (with updated interface)
 * @public
 */
function get_database(name) {
    if (name === undefined) {
      name = get_current_db_name();
    }
    if (!(name in available_database)) {
        available_database[name] = require('lib/update_db').UseDB('nedm_head/_design/nedm_head/_rewrite/_couchdb/' + name);
    }
    return available_database[name];
}

var all_db_listeners = {};

/**
 * DatabaseStatus object.  "Global" object designed to handle updating the
 * interface according to updates to DBs.
 *
 * @private
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

   on_db_updates( UpdateFunction );

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
           if (o.no_write) {
             $('.write_status', new_line).css('visibility', 'hidden');
           }
           if (o.no_control) {
             $('.control_status', new_line).css('visibility', 'hidden');
           }
           tbody.append(new_line);
           track_dbs[adb] = {
             data : setTimeout(ResetToRed($('.' + adb + ' .write_status')), 10000),
             heartbeat : setTimeout(ResetToRed($('.' + adb + ' .control_status')), 10000)
           };
       }
   }
   this.build_table = function() {
     get_database_info( db_stat );
   };
}

var _db_status = new DatabaseStatus();

/**
 * Build database status table.  This is called on index.html
 *
 * @public
 */
function database_status( ) {
    _db_status.build_table();
}



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
 * @public
 */
var db_info_is_called = false;
var db_info_cb_list = [];
var db_info_cookie;
function get_database_info( callback ) {
    if ( callback ) {
       db_info_cb_list.push(callback);
    }
    if (db_info_is_called) return;
    db_info_is_called = true;

    if (db_info_cookie) {
        db_info_cb_list.forEach( function(o) { o(db_info_cookie); } );
        db_info_cb_list = [];
        db_info_is_called = false;
        return;
    }
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

    $.ajax({
          url : '/nedm_head/_design/nedm_head/_rewrite/_couchdb/_all_dbs',
     dataType : "json",
     statusCode : {
       401: function() { console.log("401 error seen."); }
       },
       success: function(data) {
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
            db_info_cookie = current_database_info;
            db_info_is_called = false;
            get_database_info();
        });
       }

    });


};


/**
 * Show toastr error window
 *
 * @param {String} error - Error type
 * @param {String} msg - More detailed message
 *
 * @public
 */
function show_error_window(error, msg) {
    toastr.error(msg, error);
}

/**
 * Get Date object from array
 *
 * @param {Array} arr - Array like ["name", YY, MM, DD, H, M, S] or [YY, MM, DD, H, M, S, "name"]
 * @return {Object}
 *
 * @public
 */

function dateFromKey(arr) {
  var arr = arr.filter( function(o) {
    if (typeof o === "string") return false;
    return true;
  });
  return new Date(Date.UTC.apply(this, arr));
};

/**
 * Get Array from Date Object, assumes Date is UTC
 *
 * @param {Object} date
 * @return {Array} arr - [YY, MM, DD, H, M, S]
 * @public
 */

function keyFromUTCDate(date) {
  return [date.getUTCFullYear(), date.getUTCMonth(),
          date.getUTCDate(),     date.getUTCHours(),
          date.getUTCMinutes(),  date.getUTCSeconds()];
}

/**
 * Get Array from Date Object, not UTC
 *
 * @param {Object} date
 * @return {Array} arr - [YY, MM, DD, H, M, S]
 * @public
 */

function keyFromDate(date) {
  return [date.getFullYear(), date.getMonth(),
          date.getDate(),     date.getHours(),
          date.getMinutes(),  date.getSeconds()];
}

/**
 * Light wrapper to return a dygraph
 * @constructs Dygraph
 * @param {Object} $adiv - DOM object where dygraph should be
 * @param {Array} data
 * @param {Object} opts - Options to pass
 *
 * @see {@link http://dygraphs.com/jsdoc/symbols/Dygraph.html}
 */
function Dygraph($adiv, data, opts) {
    var o = opts || {};
    if(!o.height) {
      o.height = dygraphs.Dygraph.DEFAULT_HEIGHT;
    }
    return new dygraphs.Dygraph($adiv, data, o);
}

/**
 * Set and return global settings.  Internally, these settings should be
 * persistent when closing a browser.
 *
 * @param {String} key - key to save global setting
 * @param {Object|String|Number} [value] - value to set.  If not given, function reads out current value.
 *
 * @return {Object|String|Number} current globalSetting associated with key.  undefined if not found.
 */

function globalSetting(key, value) {
  var settings = JSON.parse(localStorage.nedm_settings || '{}');
  if ( typeof value !== 'undefined' ) {
    settings[key] = value;
    localStorage.nedm_settings = JSON.stringify(settings);
    return value;
  }
  return settings[key];
}

var to_export = {
        Dygraph : Dygraph,
        keyFromDate : keyFromDate,
        keyFromUTCDate : keyFromUTCDate,
        dateFromKey : dateFromKey,
        show_error_window : show_error_window,
        get_database_info : get_database_info,
        database_status : database_status,
        get_database : get_database,
        get_current_db_name : get_current_db_name,
        registerUser : registerUser,
        validate : validate,
        addLogMessage : addLogMessage,
        page : _pageEvents,
        remove_db_updates : remove_db_updates,
        on_db_updates : on_db_updates,
        globalSetting : globalSetting,
        startWebSocketListener : startWebSocketListener,
        stopWebSocketListener : stopWebSocketListener,
        MonitoringGraph : require("lib/monitoring_graph").MonitoringGraph
};

/**
* Listen to a web socket
* @param {String} url - url and port name
* @param {String} [prepend] - prepends to output log
*
* @constructor
* @private
*/
function WebSocketListen(url, prepend) {
  var pre = prepend || "";
  var tthis = this;
  var x = new WebSocket(url);
  x.onmessage = function(msg) {
    addLogMessage(prepend + ' : ' + JSON.parse(msg.data).msg);
  };
  this.stop = function() {
    x.close();
  };
  x.onerror = function() {
    stopWebSocketListener(url);
  };
}

var _listening_websockets = {};
var _current_websocket_settings = globalSetting("websocket_listeners") || {};

for (var k in _current_websocket_settings) {
  startWebSocketListener(k, _current_websocket_settings[k]);
}

/**
* Start websocket listener
* @param {String} url - url and port name
* @param {String} [prepend] - prepends to output log
*
* @public
*/
function startWebSocketListener(url, prepend) {
  if (_listening_websockets[url]) return;
  _listening_websockets[url] = new WebSocketListen(url, prepend);
  _listening_websockets[url].error = function() {
    stopWebSocketListener(url);
  };
  _current_websocket_settings[url] = prepend;
  globalSetting("websocket_listeners", _current_websocket_settings);
}

/**
* Stop websocket listener
* @param {String} url - url and port name
*
* @public
*/
function stopWebSocketListener(url) {
  if (!_listening_websockets[url]) return;
  _listening_websockets[url].stop();
  delete _listening_websockets[url];
  delete _current_websocket_settings[url];
  globalSetting("websocket_listeners", _current_websocket_settings);
}


/**
* Defines an interface for a given database
* @param {String} db_name - name of database
*
* @constructor
* @public
*/
function nEDMDatabase(db_name) {
  var db_name = db_name;
  for (var k in to_export) {
    this[k] = to_export[k];
  }

  /**
  * Gets current database, or other database
  *
  * @param {String} [db_name] - name of database, when not given then the current database
  * @return {nEDMDB}
  *
  * @public
  */
  this.get_database = function(adb) {
    if (!adb) adb = db_name;
    return get_database(adb);
  }
  /**
  * Helper function, gets most recent value of a variable
  *
  * @param {String} var_name - name of variable
  * @param {module:lib/update_db.DBRequestCallback} callback
  *
  * @public
  */
  this.get_most_recent_value = function(var_name, callback) {
    this.get_database().get_most_recent_value(var_name, callback);
  };

  /**
   * Helper function, sends command to current database
   *
   * @param {module:lib/update_db.CommandObject} o - Object to send command
   * @return {Object}
   * @public
   */
  this.send_command = function(o) {
      return this.get_database().send_command(o);
  };

}

//for (var k in to_export) {
//  exports[k] = to_export[k];
//}
exports.nEDMDatabase = nEDMDatabase;

/**
 * Appends the message to the logging facility (available in status)
 *
 * @param {string} msg
 * @public
 */
function addLogMessage(msg) {
  var $status_log = $('#db-status-id .log')
  if ($status_log.length === 0) return;
  $status_log.append('<p>' + msg + '</p>')
             .scrollTop($status_log[0].scrollHeight);
}




// Now call basic elements
(function() {

$(document).on('mobileinit', function() {

  if (document.location.pathname != '/' &&
      document.location.pathname.substring(0,5) != '/page') {
      using_prefix = "/nedm_head/_design/nedm_head/_rewrite/";
  }

  var ud = require("lib/update_db");
  // We sometimes need to specially handle cloudant
  if (document.location.origin === 'https://nedmtum.cloudant.com') {
    ud.on_cloudant(true);
  } else {
    ud.on_cloudant(false);

  }
  $(document).on('pagecreate', function(x, y) {
      UpdateHeader(x, y);
      BuildDBList(x, y);
  });

  $(document).on('pagecontainershow', function() {
     var tmp = Array.prototype.slice.call(arguments);
     tmp.unshift('load');
     _pageEvents.emit.apply(_pageEvents, tmp);
  });

  // Handle page load fails from couchDB, forward to error handling.
  $(document).on('pageloadfailed', function( ev, data) {

    // Let the framework know we're going to handle things.
    ev.preventDefault();

    // Remove loading message.
    setTimeout(function() {
                $.mobile.loading( 'hide' );
    }, 50);

    // parse the error/reason
    var error = escape(JSON.parse(data.xhr.responseText).error);
    var msg = escape(JSON.parse(data.xhr.responseText).reason);
    show_error_window(error, msg);

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

var toastr = require("toastr");
// Load jquery-mobile at the very end
require("jquery-mobile");
toastr.options = {
  positionClass: "toast-top-right",
    closeButton: true
};
}());
