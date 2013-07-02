var session = require("session");

function set_user_name(userCtx) {
       logged_in_as = userCtx.name; 
} 

function check_user_status() {
    session.info(function(err, info) {
       set_user_name(info.userCtx); 
    });
    return logged_in_as;
}

session.on('change', function(userCtx) {
  set_user_name(userCtx);
  update_header();
});

function logout()
{
    session.logout();
}

function validate(form, callback)
{
    var success = true;
    session.login(form.uid_r.value, form.pwd_r.value, 
            function(err, response) {
                if(err) {
                    success = false;
                }
            });

    if (callback) callback(success); 
}
