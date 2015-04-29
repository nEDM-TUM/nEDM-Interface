/**
 * MonitoringGraph provides an interface to the dygraph functionality
 *
 * @param {DOM Object} $adiv - where the graph should show up
 * @param {String or Array} data_name - name or list of data names
 * @param {Number} since_time_in_secs - grab since a time seconds from 'now'
 * @param {DB Object} database object
 * @api public
 */

var dygraphs = require("dygraph-combined");
var math_lib = require("lib/math");

var bs = math_lib.bs;
var GetNumberParts = math_lib.GetNumberParts;
exports.MonitoringGraph = function ($adiv, data_name, since_time_in_secs, adb) {

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
	 * change the displayed time range.  This reloads all the data, assuming
	 * that none of it is 'good'.
     *
     * @param {Date object} prev_time - previous time
     * @param {Date object} until_t - go until time.
     * @param {Function} callback() - called once everything is completed
     *    The function will be called without an argument if something went wrong.
	 *    Otherwise it will be called with the object :
	 *      { loaded : # entries, done : true/false, variable : variable name }
     * @return {Object} returns an object with the
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
        var names_to_check = name.length;
        function view_clbck(cr_name) {
            return function(e, o) {
              names_to_check -= 1;
              var ret_obj = { variable : cr_name, done : true };
              if (e === null) {
                var all_data = o.rows.map(DateFromKeyVal, tthis).filter( function(o) {
                    if (o !== null) return true;
                    return false;
                });
                var recv_length = all_data.length;
                if (recv_length !== 0) {
                    MergeData(all_data);
                }
              } else {
                ret_obj.abort = true;
              }
              if (callback) {
                  callback({ variable : cr_name,
                                 done : true });
              }
              if (names_to_check <= 0) tthis.update();
            };
        }

        function UpdateProgress(var_name) {
          return function(evt) {
            callback( {
              variable : var_name,
              progress : evt
            });
          };
        }
        var ret_obj = {};
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
                            group_level : tthis.groupLevel()
                            };
            ret_obj[curr_name] = myDB.getView("slow_control_time", "slow_control_time",
                  { opts : opts }, { success: view_clbck(curr_name), progress: UpdateProgress(curr_name) });
        }
        return ret_obj;
    };

    this.addDataName = function(aname) {
        if (!aname) return false;
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


