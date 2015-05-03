var events = require("events");
var dygraphs = require("dygraph-combined");
var toastr = require("toastr");
var cookie = require("js-cookie");
cookie.json = true;

/**
 * Updates the login/logout buttons and user status.  Called during session
 * changes
 *
 * @api private
 */

var using_prefix = "/";
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
 * @api private
 */

function UpdateDBStatus(ev, ui) {
  function defineToasterStatus ($new_div) {
    db_status.shown_toastr_status = toastr.info($new_div, "Control Center",
    {
           iconClass : " ",
        tapToDismiss : false,
        hideDuration : 300,
             timeOut : 0,
     extendedTimeOut : 0,
           closeHtml : '<button>_</button>',
       positionClass : "toast-bottom-left",
            onHidden : function() { my_but.show().removeClass('ui-disabled');
                                    db_status.shown_toastr_status = null; }
    });
    $new_div.controlgroup();
    my_but.hide();
  }
  // Populate with DB info
  function getDBInfo(dbs) {
    db_status.$toastr_content =
                   $('<div/>').addClass('ui-grid-b nedm-db-status');
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
    var my_but = $(ev.currentTarget);
    my_but.addClass('ui-disabled');

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
 * @api private
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
 * @api private
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

// Internal EventEmitter object
var _emitter = new events.EventEmitter();

/**
 * Handles aggregate database messages (changes feed)
 * emits "db_update" events, which can be listened to (see on_db_updates)
 *
 * @param {Object} msg, Message from EventSource
 * @api private
 */

function HandleDatabaseChanges(msg) {
    var dat = JSON.parse(msg.data);
    if (!dat.id) return;
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
    if (!logged_in_as) return;
    var aggr = get_database('nedm%2Faggregate');
    aggr.cancel_changes_feed( HandleDatabaseChanges );
    aggr.listen_to_changes_feed(HandleDatabaseChanges, { since : "now" });
}

/**
 * Listen for changes from aggregate database
 *
 * @param {Function} callback(obj) - obj is { db : "db_name", type : "atype" }
 *   'type' can be "data" or "heartbeat".
 *   'db' is the database name *without* the preceding 'nedm%2F'.
 * @api public
 */

function on_db_updates(callback) {
  remove_db_updates(callback);
  _emitter.on("db_update", callback);
};

/**
 * Remove changes callback
 *
 * @param {Function} callback(obj) - see on_db_updates
 * @api public
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
 * @api private
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
 * @api public
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
 * @api public
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
    cookie.remove('db_info', { path : '/' });
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
 * @api public
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
 * @return {DB} database object (with updated interface)
 * @api public
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
 * @api public
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
 * @api public
 */

var db_info_is_called = false;
var db_info_cb_list = [];
function get_database_info( callback ) {
    if ( callback ) {
       db_info_cb_list.push(callback);
    }
    if (db_info_is_called) return;
    db_info_is_called = true;

    var db_info_cookie = cookie.get('db_info');
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
            cookie.set('db_info', current_database_info, { path : '/' });
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
 * @api public
 */

function show_error_window(error, msg) {
    toastr.error(msg, error);
}

/**
 * Get Date object from array
 *
 * @param {Array} arr - Array like ["name", YY, MM, DD, H, M, S] or [YY, MM, DD, H, M, S, "name"]
 * @return {Date Object}
 *
 * @api public
 */

function dateFromKey(arr) {
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

function keyFromUTCDate(date) {
  return [date.getUTCFullYear(), date.getUTCMonth(),
          date.getUTCDate(),     date.getUTCHours(),
          date.getUTCMinutes(),  date.getUTCSeconds()];
}

/**
 * Get Array from Date Object, not UTC
 *
 * @param {Date Object} date
 * @return {Array} arr - [YY, MM, DD, H, M, S]
 * @api public
 */

function keyFromDate(date) {
  return [date.getFullYear(), date.getMonth(),
          date.getDate(),     date.getHours(),
          date.getMinutes(),  date.getSeconds()];
}

/**
 * Light wrapper to return a dygraph
 */

function Dygraph($adiv, data, opts) {
    var o = opts || {};
    if(!o.height) {
      o.height = dygraphs.Dygraph.DEFAULT_HEIGHT;
    }
    return new dygraphs.Dygraph($adiv, data, o);
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
        remove_db_updates : remove_db_updates,
        on_db_updates : on_db_updates,
        MonitoringGraph : require("lib/monitoring_graph").MonitoringGraph
};

function nEDMDatabase(db_name) {
  var db_name = db_name;
  for (var k in to_export) {
    this[k] = to_export[k];
  }
  this.get_database = function(adb) {
    if (!adb) adb = db_name;
    return get_database(adb);
  }
  /**
  * Helper function, gets most recent value of a variable
  *
  * @param {String} var_name - name of variable
  * @param {Function} callback(err, obj) - Typical callback from view, see
  *   DB.getView
  *
  * @api public
  */

  this.get_most_recent_value = function(var_name, callback) {
    this.get_database().get_most_recent_value(var_name, callback);
  };

  /**
   * Helper function, sends command to current database
   *
   * @param {Object} o - command, see DB.send_command
   * @return {jqXHR Object}
   * @api public
   */

  this.send_command = function(o) {
      return this.get_database().send_command(o);
  };

}

//for (var k in to_export) {
//  exports[k] = to_export[k];
//}
exports.nEDMDatabase = nEDMDatabase;


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
  $(document).on('pageinit', function(x, y) {
      UpdateHeader(x, y);
      BuildDBList(x, y);
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
