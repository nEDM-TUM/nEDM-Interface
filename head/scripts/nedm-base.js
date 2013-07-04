var session = require("session");

var nedm = nedm || {};
nedm.logged_in_as = null;


session.on('change', function(userCtx) {
  nedm.set_user_name(userCtx);
  nedm.update_buttons();
  //nedm.update_header();
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
            logoutbtn.text("Logout (" + user_status + ")");
            logoutbtn.show();
            loginbtn.hide();
        }

}

nedm.update_header = function(event, ui) {
  $("#" + event.target.id + " .headerChild").load("../../../nedm%2Fhead/_design/nedm_head/header.html", function() {
      $(this).find("[data-role=header]").trigger("create").toolbar();
      nedm.update_buttons();
  });

  //if (hc.find("[data-role=header]").length == 0) {
  //  hc.load("header.html", nedm.update_buttons); 
  //} else {
  //  nedm.update_buttons();
  //}
  
}

nedm.set_user_name = function(userCtx) {
       nedm.logged_in_as = userCtx.name; 
} 

nedm.check_user_status = function() {
    session.info(function(err, info) {
       if (info) nedm.set_user_name(info.userCtx); 
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
$(document).on('mobileinit', function() {
  $(document).on('pageinit', nedm.update_header); 

  // Handle page load fails from couchDB, forward to error.html
  $(document).on('pageloadfailed', function( event, data) {

    // Let the framework know we're going to handle things.
    event.preventDefault();

    // Remove loading message.
    setTimeout(function() {
                $.mobile.hidePageLoadingMsg();
    }, $.mobile.loadPage.defaults.loadMsgDelay);

    // parse the error/reason 
    var error = escape(JSON.parse(data.xhr.responseText)["error"]);
    var msg = escape(JSON.parse(data.xhr.responseText)["reason"]);
    var page = "../../../nedm%2Fhead/_design/nedm_head/error.html?error=" + error + "&message=" + msg;

    // Call the change in a moment.
    setTimeout(function() {
      $.mobile.changePage(page, {transition: 'pop', role: 'dialog'});
    }, 100);

    // Resolve the deferred object.
    data.deferred.reject(data.absUrl, data.options);    
  }); 
  
  //$.extend( $.mobile, { ajaxEnabled : false } );
});
