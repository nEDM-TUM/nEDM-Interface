var session = require("session");
var db = require("db");
var handlebars = require("handlebars");
var dygraphs = require("dygraph-combined");
require("jquery");

var nedm = nedm || {};
nedm.logged_in_as = null;


session.on('change', function(userCtx) {
  nedm.set_user_name(userCtx);
  nedm.update_buttons();
  //nedm.update_header();
  nedm.buildDBList();
});




// Fix db guessCurrent
require("db").guessCurrent = function (loc) {
    var loc = loc || window.location;

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
            root: '/'
        }
    }
    return null;
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
}

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
        nedm.cancel_changes_feed(db, tag)
    }
    nedm.open_changes_feeds.taglist[tag] = {callb: callback, url: url}; 
    nedm.open_changes_feeds.urllist[url].src.addEventListener("message", callback, false); 
    nedm.open_changes_feeds.urllist[url].taglist[tag] = {};
}

nedm.cancel_changes_feed = function(db, tag) {

    if (!(tag in nedm.open_changes_feeds.taglist)) return; 
    
    var obj = nedm.open_changes_feeds.taglist[tag]; 
    var src = nedm.open_changes_feeds.urllist[obj.url].src;
    
    src.removeEventListener("message", obj.callb, false); 

    delete nedm.open_changes_feeds.urllist[obj.url].taglist[tag];
    delete nedm.open_changes_feeds.taglist[tag];
}


nedm.update_db_interface = function(db) {
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
        try {
            var data = JSON.stringify(doc);
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
    db.getView = function(name, view, options, callback) {
        if (!callback) {
            callback = options;
            options = {};
        }
        if (!options.keys) options.keys = {};
        if (!options.opts) options.opts = {};
        var viewname = this.encode(view);
        var theType = "POST";
        try {
            var data = JSON.stringify(options.keys);
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
            type: theType 
        };
        this.request(req, callback);
    };


    db.listen_to_changes_feed = function(tag, callback, options) {
        return nedm.listen_to_changes_feed(this, tag, callback, options);
    }

    db.cancel_changes_feed = function(tag) {
        return nedm.cancel_changes_feed(this, tag);
    }


}


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
}

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
}


nedm.update_buttons = function() {
    var user_status = nedm.check_user_status();
    var loginbtn = $("a[id*=loginbtn]"); 
    var logoutbtn = $("a[id*=logoutbtn]"); 
    if (user_status == null) {
        loginbtn.show();
        logoutbtn.hide();
    } else {
        logoutbtn.text("Logout (" + user_status + ")");
        logoutbtn.show();
        loginbtn.hide();
    }

}

nedm.update_header = function(event, ui) {

  $("#" + event.target.id + " .headerChild").load("/nedm%2Fhead/_design/nedm_head/header.html", function() {
      $(this).find("[data-role=header]").trigger("create").toolbar();
      var hn = $(this).find('#nedm_header_name');
      var callback = function(dbs) {
        var db = /nedm%2F(.*?)\//g.exec(document.URL)[1];
        if (db in dbs) {
          hn.text("nEDM Interface: " + dbs[db].prettyname);
        } 
      };
      nedm.get_database_info(callback);

      nedm.update_buttons();
  });

  //if (hc.find("[data-role=header]").length == 0) {
  //  hc.load("header.html", nedm.update_buttons); 
  //} else {
  //  nedm.update_buttons();
  //}
  
}

nedm.set_user_name = function(userCtx) {
       nedm.logged_in_as = userCtx.name; 
} 

nedm.check_user_status = function() {
    session.info(function(err, info) {
       if (info) nedm.set_user_name(info.userCtx); 
    });
    return nedm.logged_in_as;
}

nedm.logout = function()
{
    session.logout();
}

nedm.validate = function(un, pw, callback)
{
    session.login(un, pw, 
            function(err, response) {
                var success = true;
                if(err) success = false;
                if (callback) callback(success); 
            });
}

nedm.compile = function(astr) {
    return handlebars.compile(astr);
}

// Returns all the most recent database info
nedm.get_database_info = function( callback ) {

    // First define a function to grab all the information
    function getDBInfo(db_name) {
           var esc_name = "nedm%2F" + db_name; 
           var dfd = new $.Deferred();
           var callback = function (data, msg) {
               return [db_name, data, msg]; 
           };
           var json_subm = $.getJSON("/" + esc_name + "/subsystem_information"); 
           json_subm.done( function(data) {
               dfd.resolve( callback(data, "found") );
           });
           json_subm.fail( function(data) {
               dfd.resolve( callback(data), "notfound" );
           });
           return dfd.promise();
    };

    $.getJSON('/_all_dbs', function(data) {
        var patt = /^nedm\//;
        var db_infos = [];
        $.each(data, function(key, val) {
            if (patt.exec(val) != null) {
                var db_name = val.substring(5);
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
        

}

nedm.show_error_window = function(error, msg) {
    var page = "/nedm%2Fhead/_design/nedm_head/error.html?error=" + error + "&message=" + msg;

    // First check to see if we are in the middle of a chain of authorization
    // errors
    var cIndex = $.mobile.urlHistory.activeIndex;
    var stck = $.mobile.urlHistory.stack;
    if (cIndex < stck.length - 1 && /error\.html/.exec(stck[cIndex + 1].pageUrl) != null) {
        // Ok, we've seen an error.
        // Pop this page out
        stck.splice(cIndex, 1);
        setTimeout(function() {
          $.mobile.back();
        }, 100);

    } else {
        // Call the change in a moment.
        setTimeout(function() {
          $.mobile.changePage(page, {transition: 'pop', role: 'dialog'});
        }, 100);
    }
}

// We build the list of DBs to point to.  This is simply subsystems
var listview_made = false;
nedm.buildDBList = function(ev, id) {
   nedm.get_database_info( function( x, y ) { return function( dbs ) {
       var totalhtml = '';
       for(var key in dbs) {
           var esc_name = "nedm%2F" + key; 
           var html = '<div data-role="collapsible"><h3>{{prettyname}}</h3>';
           html    += '<ul data-role="listview" data-inset="false">';
           if ("pages" in dbs[key]) {
               for(var pg in dbs[key]["pages"]) {
                   html += nedm.compile('<li><a href="/{{esc_name}}/_design/nedm_default/{{pgsrc}}">{{pgname}}</a></li>')(
                     {esc_name : esc_name, pgsrc : dbs[key]["pages"][pg], pgname : pg});
               }
           }
           html    += '</ul></div>';
           totalhtml += nedm.compile(html)(dbs[key]);     
       }
  
       if (x == null) {
           // Means we have no specific event, change them all
           $(".listofdbs").empty();
           $(".listofdbs").append(totalhtml);
           $(".listofdbs").trigger("create");
       } else {
           $("#" + x.target.id + " .listofdbs").empty();
           $("#" + x.target.id + " .listofdbs").append(totalhtml);
           $("#" + x.target.id + " .listofdbs").trigger("create");
       }
   }}(ev,id)); 
}

nedm.dateFromKey = function(arr) {
  return new Date(Date.UTC.apply(this, arr));
}

nedm.MonitoringGraph = function (adiv, data_name, since_time_in_secs) {

    this.data = [];
    this.graph = new dygraphs.Dygraph(adiv, this.data,
          {
            drawPoints: true,
              showRoller: false,
              labels: ['Time'].concat(data_name),
              connectSeparatedPoints: true,
              xAxisLabelWidth: 60
          });

    this.name = data_name;
 
    this.changeBeginningTime(since_time_in_secs);
    this.uuid = Math.random().toString(36).substr(2,9);
};

nedm.MonitoringGraph.prototype.prependData = function(r) {
     for (var i=0;i<r.length;i++) { 
         this.data.unshift(r[i]);
     }
};

nedm.MonitoringGraph.prototype.update = function() {
     this.graph.updateOptions( { 'file': this.data, 'labels' : ['Time'].concat(this.name) } );
}

nedm.MonitoringGraph.prototype.dataFromKeyVal = function(obj) {
    var outp = [ nedm.dateFromKey(obj.key) ];
    var seen = false;
    var data_name = this.name;
    for (var i=0;i<data_name.length;i++) {
        if (data_name[i] in obj.value) {
            outp.push(obj.value[data_name[i]][0]);
            seen = true;
        } else outp.push(null);
    }
    if (!seen) return null;
    return outp; 
}

nedm.MonitoringGraph.prototype.appendData = function(r) {
     var append = 0;
     for (var i=0;i<r.length;i++) { 
         this.data.push(r[i]);
         append++;
     }
     return append;
};

nedm.MonitoringGraph.prototype.addDataName = function(aname, since_time_in_secs, callback) {
    if (this.name.indexOf(aname) != -1 ) return;
    this.name.push(aname);
    this.data.length = 0;
    this.changeBeginningTime(since_time_in_secs, callback);
}

nedm.MonitoringGraph.prototype.removeBeforeDate = function(adate) {
    var data = this.data;
    if (data.length == 0) return 0;
    var j = 0;
    while (j < data.length && data[j][0].getTime() < adate.getTime()) j++; 
    return data.splice(0, j);
}

nedm.MonitoringGraph.prototype.changeBeginningTime = function (since_time_in_secs, callback) {

    this.time_prev = since_time_in_secs; 
    var time_before_now = new Date((new Date).getTime() - since_time_in_secs*1000);
    var data = this.data;
    if (this.removeBeforeDate(time_before_now) == 0) {
        // first determine what the earliest date is
        var last_key = [9999];
        if (data.length > 0) {
            var then = data[0][0];
            last_key = [
                     then.getUTCFullYear(), then.getUTCMonth(), 
                     then.getUTCDate(), then.getUTCHours(), 
                     then.getUTCMinutes(), then.getUTCSeconds()-1];
        }
        first_key = [ 
                     time_before_now.getUTCFullYear(), time_before_now.getUTCMonth(), 
                     time_before_now.getUTCDate(), time_before_now.getUTCHours(), 
                     time_before_now.getUTCMinutes(), time_before_now.getUTCSeconds()];

        db.current().getView("erlang", "slow_control_time_label", 
                { opts : { group_level : 9, descending: true, reduce : true,
                  startkey : last_key, endkey : first_key} },
                function(obj, cbck) { return function(e, o) { 
                    if (e != null) return;
                    var all_data = o.rows.map(obj.dataFromKeyVal, obj).filter( function(o) { 
                        if (o != null) return true;
                        return false; 
                    });
                    obj.prependData(all_data); 
                    obj.update(); 
                    if (cbck) cbck();
                } 
                } (this, callback));
    } else {
        this.update();
        if (callback) callback();
    }

};

nedm.MonitoringGraph.prototype.getMostRecentValues = function() {

}

nedm.MonitoringGraph.prototype.processChange = function(err, obj) {
     if (err != null) return;
     var app = 0;
     for (var i=0;i<obj.rows.length;i++ ) {
         var ind = this.name.indexOf(obj.rows[i].key) + 1;
         if (ind == 0) continue;
         var o = obj.rows[i].value;
         var d = new Date(Date.parse(o.timestamp));
         var j=this.data.length-1;
         while( j >= 0 && this.data[j][0] > d) j--; 

         // j is now the event, or before
         if (j>=0 && this.data[j][0].getTime() == d.getTime()) this.data[j][ind] = parseFloat(o.value);
         else {
            // Insert it, this also handles the case when nothing is there
            this.data.splice(j+1, 0, [d].concat( Array.apply(null,new Array(this.name.length))
                                                    .map(function() { return null; })
                                              ));
            this.data[j+1][ind] = parseFloat(o.value);
            app++;
         }
     }
     if (this.data.length != 0) { 
         var time_before_now = new Date(this.data[this.data.length-1][0].getTime() - this.time_prev*1000);
         this.removeBeforeDate(time_before_now);
     }
     this.update();
};

nedm.MonitoringGraph.prototype.syncFunction = function () {
    db.current().getView('erlang', 'latest_value', 
      { opts : {group : true}, keys : {keys : this.name} }, 
      function(o) { return function(err, objs) {  
           o.processChange(err,objs); 
        } }(this));
};

nedm.MonitoringGraph.prototype.beginListening = function () {
  this.endListening(); 
  db.current().listen_to_changes_feed(this.uuid, 
          function(o) { return function(err, obj) { o.syncFunction(err,obj); } } (this), 
          {since : 'now', filter : 'nedm_default/doc_type', type : "data"});
};

nedm.MonitoringGraph.prototype.endListening = function () {
  db.current().cancel_changes_feed(this.uuid);
};



$(document).on('mobileinit', function() {

  $(document).on('pageinit', function(x, y) {
      nedm.update_header(x, y);
      nedm.buildDBList(x, y);
  }); 

  // Handle page load fails from couchDB, forward to error.html
  $(document).on('pageloadfailed', function( event, data) {

    // Let the framework know we're going to handle things.
    event.preventDefault();

    // Remove loading message.
    setTimeout(function() {
                $.mobile.hidePageLoadingMsg();
    }, $.mobile.loadPage.defaults.loadMsgDelay);

    // parse the error/reason 
    var error = escape(JSON.parse(data.xhr.responseText)["error"]);
    var msg = escape(JSON.parse(data.xhr.responseText)["reason"]);
    nedm.show_error_window(error, msg);

    // Resolve the deferred object.
    data.deferred.reject(data.absUrl, data.options);    
  }); 

  $(document).on('pageload', function( event, data) {
    var cIndex = $.mobile.urlHistory.activeIndex;
    var stck = $.mobile.urlHistory.stack;
    if (cIndex < stck.length - 1 && /error\.html/.exec(stck[cIndex + 1].pageUrl) != null) {
        // Ok, we moved back successfully after an error, Pop this page out
        stck.splice(cIndex+1, 1);

    }
  });  
});

// Load jquery-mobile at the very end
require("jquery-mobile");
