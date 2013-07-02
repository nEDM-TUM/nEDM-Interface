//var session = require("session");
var logged_in_as = null;

$(document).bind('pageinit', function(event, ui) {
  console.log("binding");
  update_header();
  //check_user_status();
  
});
