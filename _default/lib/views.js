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
