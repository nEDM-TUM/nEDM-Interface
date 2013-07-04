var session = require("session");

var nedm = nedm || {};
nedm.logged_in_as = null;


session.on('change', function(userCtx) {
  nedm.set_user_name(userCtx);
  nedm.update_header();
});



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
            logoutbtn.find(".ui-btn-text").text("Logout (" + user_status + ")");
            logoutbtn.show();
            loginbtn.hide();
        }

}

nedm.update_header = function() {
  console.log("Updating header");
  var hc = $('.headerChild');

  .each(function( ind, elem ) {
    if (elem.find("[data-role=header]").length == 0) {
      elem.load("header.html", nedm.update_buttons); 
    } else {
      nedm.update_buttons();
    }
  });
  
}

nedm.set_user_name = function(userCtx) {
       nedm.logged_in_as = userCtx.name; 
} 

nedm.check_user_status = function() {
    session.info(function(err, info) {
       nedm.set_user_name(info.userCtx); 
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

//$(document).off('pageinit', 'update_header');
$(document).on('pageinit', nedm.update_header); 
