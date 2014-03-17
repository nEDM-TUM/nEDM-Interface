exports.controls = {
  map: function(doc) {
    if (!doc || !doc.type || doc.type != "control") return;
    emit(doc._id, doc);
  }
}
