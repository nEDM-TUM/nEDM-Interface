
exports.insert_with_timestamp = function(doc, req) {
    
    // If it doesn't exist, we are making a new one
    if (!doc) doc = {};

    // For documents without uuids
    if (!doc._id) doc._id = req.uuid;

    // This would be odd, there should always be a body
    if (!req.body) {
        return [null, "No document to insert"];
    }

    // Pull the information from the body, insert into current document
    _ref = JSON.parse(req.body); 
    for (k in _ref) {
        v = _ref[k];
        doc[k] = v;
    }

    log(doc);

    var ts  = new Date().toUTCString();
    var user = req.userCtx.name;
    var message = 'insert with user (time) : ' + user +
                  ' (' + ts + ')'; 

    // Always update the created_by and timestamp
    doc.created_by = user;
    doc.timestamp  = ts;
    return [doc, message]; 
};
