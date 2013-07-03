//var session = require("session");
var logged_in_as = null;

$(document).bind('pageinit', function(event, ui) {
  update_header();
});
