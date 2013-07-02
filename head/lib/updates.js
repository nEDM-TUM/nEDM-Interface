
exports.insert_with_timestamp = function(doc, req) {
    
    var ts  = new Date().getTime();
    var user = req.userCtx;
    var message = 'insert with user (time) : ' + user +
                  ' (' + ts + ')'; 
    doc.created_by = user;
    doc.timestamp  = ts;
    return [doc, message]; 
};
