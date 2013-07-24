exports.conflicts = {
  map: function(doc) {
     if(doc._conflicts) {
       // First emit the "winning" revision.
       emit_rev(doc._rev)
     
       // Next emit all the revisions properly recorded as a conflict.
       for(var a = 0; a < doc._conflicts.length; a++)
         emit_rev(doc._conflicts[a])
     }
     
     function emit_rev(rev) {
       // Emit a value that will pull the correct revision for ?include_docs=true.
       var key = [doc._id, rev]
         , value = { "_id": doc._id, "_rev": rev };
     
       emit(key, value);
     }
  },
  reduce : "_count"
}

exports.slow_control_time = {
  map: function(doc) {
           if (!doc.type || doc.type != "data") return;
           var then = new Date(Date.parse(doc.timestamp));
           for (var key in doc.value) {
               emit([key,
                     then.getUTCFullYear(), then.getUTCMonth(), 
                     then.getUTCDate(), then.getUTCHours(), 
                     then.getUTCMinutes(), then.getUTCSeconds()], doc.value[key]);
           }
  },
  reduce : function(keys, values, rereduce) {
           if (!rereduce) {
               var length = values.length;
               return [sum(values.map(parseFloat)) / length, length];
           } else {
               var length = sum(values.map(function(v){return v[1]}));
               var avg = sum(values.map(function(v){
                          return parseFloat(v[0]) * (v[1] / length) }));
               return [avg, length];
           }
  }
 
}

exports.slow_control_time_label = {
  map: function(doc) {
           if (!doc.type || doc.type != "data") return;
           var then = new Date(Date.parse(doc.timestamp));
           for (var key in doc.value) {
               var obj = {};
               obj[key] = doc.value[key];
               emit([
                     then.getUTCFullYear(), then.getUTCMonth(), 
                     then.getUTCDate(), then.getUTCHours(), 
                     then.getUTCMinutes(), then.getUTCSeconds()], obj);
           }
  },
  reduce : function(keys, values, rereduce) {
           if (!rereduce) {
               var length = values.length;
               var outp = {};
               for (var i=0;i<length;i++) {
                   var o = values[i];
                   for (var k in o) {
                       if (!(k in outp)) outp[k]= [];
                       outp[k].push(parseFloat(o[k]));
                   }
               }
               for (var o in outp) {
                   outp[o] = [sum(outp[o])/outp[o].length, outp[o].length];
               }
               return outp; 
           } else {
               var length = values.length; 
               var outp = {};
               for (var i=0;i<length;i++) {
                   var o = values[i];
                   for (var k in o) {
                       if (!(k in outp)) outp[k]= [0, 0];
                       var l = outp[k][1] + o[k][1];
                       outp[k][0] = (outp[k][0]*outp[k][1] + o[k][0]*o[k][1])/l;
                       outp[k][1] = l
                   }
               }
               return outp; 
           }
  }
 
}


exports.latest_value = {
  map: function(doc) {
           if (!doc.type || doc.type != "data") return;
           for (var key in doc.value) {
               emit(key, {"value" : doc.value[key], "timestamp" : doc.timestamp}); 
           }
  },
  reduce : function(keys, values, rereduce) {
      var latest_time = values[0].timestamp;;
      var val = values[0].value;
      for (var i=0;i<values.length;i++) {
          if (Date.parse(values[i].timestamp) > Date.parse(latest_time)) {
              val = values[i].value;
              latest_time = values[i].timestamp;
          }
      }
      return {"value" : val, "timestamp" : latest_time};
  }
 
}

exports.controls = {
  map: function(doc) {
    if (!doc || !doc.type || doc.type != "control") return;
    emit(doc._id, doc);
  }
}

exports.data_keys = {
    map: function(doc) {
        if (!doc.type || doc.type != "data") return;
        for (var key in doc.value) {
            emit(key, 1); 
        }
    },
    reduce: "_sum" 
}
