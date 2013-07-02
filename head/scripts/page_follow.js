var session = require("session");

function update_buttons() {
        var user_status = check_user_status();
        var loginbtn = $("a[id*=loginbtn]"); 
        var logoutbtn = $("a[id*=logoutbtn]"); 
        if (user_status == null) {
            loginbtn.show();
            logoutbtn.hide();
        } else {
            logoutbtn.find(".ui-btn-text").text("Logout (" + user_status + ")");
            logoutbtn.show();
            loginbtn.hide();
        }

}

function update_header(event, ui) {
  var hc = $('.headerChild');
  if (hc.find("[data-role=header]").length == 0) {
    hc.load("header.html", update_buttons); 
  } else {
    update_buttons();
  }
  
}

